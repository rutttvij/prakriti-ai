from __future__ import annotations

from typing import TypeVar

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api import deps
from app.core.database import get_db
from app.models.contact import ContactMessage
from app.models.leads import Lead, NewsletterSubscriber
from app.models.marketing import MarketingCaseStudy, MarketingFAQ, MarketingPartner, MarketingTestimonial
from app.models.user import User
from app.schemas.leads import LeadStatusUpdate
from app.schemas.marketing import (
    APIEnvelope,
    CaseStudyCreate,
    CaseStudyUpdate,
    FAQCreate,
    FAQUpdate,
    MarketingConfigUpsert,
    PartnerCreate,
    PartnerUpdate,
    TestimonialCreate,
    TestimonialUpdate,
)
from app.services.marketing_service import upsert_config
from app.services.admin_audit_service import log_admin_action

router = APIRouter(prefix="/admin/content", tags=["admin-content"])

ModelT = TypeVar("ModelT")


def _serialize(model: object, fields: list[str]) -> dict:
    return {f: getattr(model, f) for f in fields}


def _list(db: Session, model: type[ModelT]) -> list[ModelT]:
    return db.query(model).order_by(getattr(model, "order", model.id).asc(), model.id.asc()).all()


def _get_or_404(db: Session, model: type[ModelT], row_id: int) -> ModelT:
    row = db.get(model, row_id)
    if row is None:
        raise HTTPException(status_code=404, detail="Record not found")
    return row


def _commit(db: Session) -> None:
    try:
        db.commit()
    except Exception:
        db.rollback()
        raise


@router.get("/partners", response_model=APIEnvelope)
def list_partners_admin(db: Session = Depends(get_db), _: User = Depends(deps.require_super_admin)):
    rows = _list(db, MarketingPartner)
    return APIEnvelope(message="Partners fetched.", data={"partners": [_serialize(r, ["id", "name", "logo_url", "href", "order", "active"]) for r in rows]})


@router.post("/partners", response_model=APIEnvelope, status_code=status.HTTP_201_CREATED)
def create_partner(payload: PartnerCreate, db: Session = Depends(get_db), current_user: User = Depends(deps.require_super_admin)):
    row = MarketingPartner(**payload.model_dump())
    db.add(row)
    db.flush()
    log_admin_action(db, actor=current_user, action="create", entity="partner", entity_id=row.id, metadata=payload.model_dump())
    _commit(db)
    db.refresh(row)
    return APIEnvelope(message="Partner created.", data={"partner": _serialize(row, ["id", "name", "logo_url", "href", "order", "active"])})


@router.put("/partners/{partner_id}", response_model=APIEnvelope)
def update_partner(partner_id: int, payload: PartnerUpdate, db: Session = Depends(get_db), current_user: User = Depends(deps.require_super_admin)):
    row = _get_or_404(db, MarketingPartner, partner_id)
    updates = payload.model_dump(exclude_unset=True)
    for k, v in updates.items():
        setattr(row, k, v)
    db.add(row)
    log_admin_action(db, actor=current_user, action="update", entity="partner", entity_id=row.id, metadata=updates)
    _commit(db)
    db.refresh(row)
    return APIEnvelope(message="Partner updated.", data={"partner": _serialize(row, ["id", "name", "logo_url", "href", "order", "active"])})


@router.delete("/partners/{partner_id}", response_model=APIEnvelope)
def delete_partner(partner_id: int, db: Session = Depends(get_db), current_user: User = Depends(deps.require_super_admin)):
    row = _get_or_404(db, MarketingPartner, partner_id)
    db.delete(row)
    log_admin_action(db, actor=current_user, action="delete", entity="partner", entity_id=partner_id)
    _commit(db)
    return APIEnvelope(message="Partner deleted.", data={})


@router.get("/testimonials", response_model=APIEnvelope)
def list_testimonials_admin(db: Session = Depends(get_db), _: User = Depends(deps.require_super_admin)):
    rows = _list(db, MarketingTestimonial)
    return APIEnvelope(message="Testimonials fetched.", data={"testimonials": [_serialize(r, ["id", "name", "title", "org", "quote", "avatar_url", "order", "active"]) for r in rows]})


@router.post("/testimonials", response_model=APIEnvelope, status_code=status.HTTP_201_CREATED)
def create_testimonial(payload: TestimonialCreate, db: Session = Depends(get_db), current_user: User = Depends(deps.require_super_admin)):
    row = MarketingTestimonial(**payload.model_dump())
    db.add(row)
    db.flush()
    log_admin_action(db, actor=current_user, action="create", entity="testimonial", entity_id=row.id, metadata=payload.model_dump())
    _commit(db)
    db.refresh(row)
    return APIEnvelope(message="Testimonial created.", data={"testimonial": _serialize(row, ["id", "name", "title", "org", "quote", "avatar_url", "order", "active"])})


@router.put("/testimonials/{testimonial_id}", response_model=APIEnvelope)
def update_testimonial(testimonial_id: int, payload: TestimonialUpdate, db: Session = Depends(get_db), current_user: User = Depends(deps.require_super_admin)):
    row = _get_or_404(db, MarketingTestimonial, testimonial_id)
    updates = payload.model_dump(exclude_unset=True)
    for k, v in updates.items():
        setattr(row, k, v)
    db.add(row)
    log_admin_action(db, actor=current_user, action="update", entity="testimonial", entity_id=row.id, metadata=updates)
    _commit(db)
    db.refresh(row)
    return APIEnvelope(message="Testimonial updated.", data={"testimonial": _serialize(row, ["id", "name", "title", "org", "quote", "avatar_url", "order", "active"])})


@router.delete("/testimonials/{testimonial_id}", response_model=APIEnvelope)
def delete_testimonial(testimonial_id: int, db: Session = Depends(get_db), current_user: User = Depends(deps.require_super_admin)):
    row = _get_or_404(db, MarketingTestimonial, testimonial_id)
    db.delete(row)
    log_admin_action(db, actor=current_user, action="delete", entity="testimonial", entity_id=testimonial_id)
    _commit(db)
    return APIEnvelope(message="Testimonial deleted.", data={})


@router.get("/case-studies", response_model=APIEnvelope)
def list_case_studies_admin(db: Session = Depends(get_db), _: User = Depends(deps.require_super_admin)):
    rows = _list(db, MarketingCaseStudy)
    return APIEnvelope(message="Case studies fetched.", data={"case_studies": [_serialize(r, ["id", "title", "org", "metric_1", "metric_2", "summary", "href", "order", "active"]) for r in rows]})


@router.post("/case-studies", response_model=APIEnvelope, status_code=status.HTTP_201_CREATED)
def create_case_study(payload: CaseStudyCreate, db: Session = Depends(get_db), current_user: User = Depends(deps.require_super_admin)):
    row = MarketingCaseStudy(**payload.model_dump())
    db.add(row)
    db.flush()
    log_admin_action(db, actor=current_user, action="create", entity="case_study", entity_id=row.id, metadata=payload.model_dump())
    _commit(db)
    db.refresh(row)
    return APIEnvelope(message="Case study created.", data={"case_study": _serialize(row, ["id", "title", "org", "metric_1", "metric_2", "summary", "href", "order", "active"])})


@router.put("/case-studies/{case_study_id}", response_model=APIEnvelope)
def update_case_study(case_study_id: int, payload: CaseStudyUpdate, db: Session = Depends(get_db), current_user: User = Depends(deps.require_super_admin)):
    row = _get_or_404(db, MarketingCaseStudy, case_study_id)
    updates = payload.model_dump(exclude_unset=True)
    for k, v in updates.items():
        setattr(row, k, v)
    db.add(row)
    log_admin_action(db, actor=current_user, action="update", entity="case_study", entity_id=row.id, metadata=updates)
    _commit(db)
    db.refresh(row)
    return APIEnvelope(message="Case study updated.", data={"case_study": _serialize(row, ["id", "title", "org", "metric_1", "metric_2", "summary", "href", "order", "active"])})


@router.delete("/case-studies/{case_study_id}", response_model=APIEnvelope)
def delete_case_study(case_study_id: int, db: Session = Depends(get_db), current_user: User = Depends(deps.require_super_admin)):
    row = _get_or_404(db, MarketingCaseStudy, case_study_id)
    db.delete(row)
    log_admin_action(db, actor=current_user, action="delete", entity="case_study", entity_id=case_study_id)
    _commit(db)
    return APIEnvelope(message="Case study deleted.", data={})


@router.get("/faqs", response_model=APIEnvelope)
def list_faqs_admin(db: Session = Depends(get_db), _: User = Depends(deps.require_super_admin)):
    rows = _list(db, MarketingFAQ)
    return APIEnvelope(message="FAQs fetched.", data={"faqs": [_serialize(r, ["id", "question", "answer", "order", "active"]) for r in rows]})


@router.post("/faqs", response_model=APIEnvelope, status_code=status.HTTP_201_CREATED)
def create_faq(payload: FAQCreate, db: Session = Depends(get_db), current_user: User = Depends(deps.require_super_admin)):
    row = MarketingFAQ(**payload.model_dump())
    db.add(row)
    db.flush()
    log_admin_action(db, actor=current_user, action="create", entity="faq", entity_id=row.id, metadata=payload.model_dump())
    _commit(db)
    db.refresh(row)
    return APIEnvelope(message="FAQ created.", data={"faq": _serialize(row, ["id", "question", "answer", "order", "active"])})


@router.put("/faqs/{faq_id}", response_model=APIEnvelope)
def update_faq(faq_id: int, payload: FAQUpdate, db: Session = Depends(get_db), current_user: User = Depends(deps.require_super_admin)):
    row = _get_or_404(db, MarketingFAQ, faq_id)
    updates = payload.model_dump(exclude_unset=True)
    for k, v in updates.items():
        setattr(row, k, v)
    db.add(row)
    log_admin_action(db, actor=current_user, action="update", entity="faq", entity_id=row.id, metadata=updates)
    _commit(db)
    db.refresh(row)
    return APIEnvelope(message="FAQ updated.", data={"faq": _serialize(row, ["id", "question", "answer", "order", "active"])})


@router.delete("/faqs/{faq_id}", response_model=APIEnvelope)
def delete_faq(faq_id: int, db: Session = Depends(get_db), current_user: User = Depends(deps.require_super_admin)):
    row = _get_or_404(db, MarketingFAQ, faq_id)
    db.delete(row)
    log_admin_action(db, actor=current_user, action="delete", entity="faq", entity_id=faq_id)
    _commit(db)
    return APIEnvelope(message="FAQ deleted.", data={})


@router.put("/config", response_model=APIEnvelope)
def put_config(payload: MarketingConfigUpsert, db: Session = Depends(get_db), current_user: User = Depends(deps.require_super_admin)):
    row = upsert_config(db, payload.key, payload.value_json)
    log_admin_action(db, actor=current_user, action="update", entity="marketing_config", entity_id=payload.key, metadata={"key": payload.key})
    _commit(db)
    db.refresh(row)
    return APIEnvelope(message="Config updated.", data={"config": _serialize(row, ["id", "key", "value_json"])})


@router.get("/leads", response_model=APIEnvelope)
def list_leads(
    status_filter: str | None = Query(default=None, alias="status"),
    db: Session = Depends(get_db),
    _: User = Depends(deps.require_super_admin),
):
    q = db.query(Lead)
    if status_filter:
        q = q.filter(Lead.status == status_filter)
    rows = q.order_by(Lead.created_at.desc()).all()
    return APIEnvelope(message="Leads fetched.", data={"leads": [_serialize(r, ["id", "name", "org_name", "org_type", "email", "phone", "message", "status", "created_at"]) for r in rows]})


@router.patch("/leads/{lead_id}", response_model=APIEnvelope)
def patch_lead_status(lead_id: int, payload: LeadStatusUpdate, db: Session = Depends(get_db), current_user: User = Depends(deps.require_super_admin)):
    row = _get_or_404(db, Lead, lead_id)
    row.status = payload.status
    db.add(row)
    log_admin_action(db, actor=current_user, action="update_status", entity="lead", entity_id=row.id, metadata={"status": row.status})
    _commit(db)
    db.refresh(row)
    return APIEnvelope(message="Lead status updated.", data={"lead": _serialize(row, ["id", "status"])})


@router.get("/contact", response_model=APIEnvelope)
def list_contact_messages(db: Session = Depends(get_db), _: User = Depends(deps.require_super_admin)):
    rows = db.query(ContactMessage).order_by(ContactMessage.created_at.desc()).all()
    return APIEnvelope(message="Contact messages fetched.", data={"contact_messages": [_serialize(r, ["id", "name", "email", "subject", "message", "created_at"]) for r in rows]})


@router.get("/newsletter", response_model=APIEnvelope)
def list_newsletter(db: Session = Depends(get_db), _: User = Depends(deps.require_super_admin)):
    rows = db.query(NewsletterSubscriber).order_by(NewsletterSubscriber.created_at.desc()).all()
    csv_lines = ["email,status,created_at"] + [f"{r.email},{r.status},{r.created_at.isoformat()}" for r in rows]
    return APIEnvelope(
        message="Newsletter subscribers fetched.",
        data={
            "newsletter": [_serialize(r, ["id", "email", "status", "created_at"]) for r in rows],
            "export_csv": "\n".join(csv_lines),
        },
    )
