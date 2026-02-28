from __future__ import annotations

import time
from collections import defaultdict, deque
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.leads import ContactCreate, LeadCreate, NewsletterSubscribe
from app.schemas.marketing import APIEnvelope
from app.services.lead_service import create_contact_message, create_lead, subscribe_newsletter
from app.services.marketing_service import (
    get_config,
    list_case_studies,
    list_faqs,
    list_partners,
    list_testimonials,
)
from app.services.stats_service import get_public_stats, sample_ledger_rows

router = APIRouter(prefix="/public", tags=["public-marketing"])

_BUCKET: dict[str, deque[float]] = defaultdict(deque)


def _rate_limit(key_prefix: str, max_requests: int = 8, per_seconds: int = 60):
    def _dep(request: Request):
        ip = request.client.host if request.client else "unknown"
        key = f"{key_prefix}:{ip}"
        now = time.time()
        q = _BUCKET[key]
        while q and now - q[0] > per_seconds:
            q.popleft()
        if len(q) >= max_requests:
            raise HTTPException(status_code=429, detail="Too many requests. Please try again shortly.")
        q.append(now)

    return _dep


def _obj_to_dict(obj: object, fields: list[str]) -> dict[str, Any]:
    return {f: getattr(obj, f) for f in fields}


@router.get("/stats", response_model=APIEnvelope)
def public_stats(db: Session = Depends(get_db)):
    stats = get_public_stats(db)
    return APIEnvelope(message="Public stats fetched.", data={"stats": stats.__dict__})


@router.get("/partners", response_model=APIEnvelope)
def public_partners(db: Session = Depends(get_db)):
    rows = list_partners(db, active_only=True)
    return APIEnvelope(
        message="Partners fetched.",
        data={"partners": [_obj_to_dict(r, ["id", "name", "logo_url", "href", "order", "active"]) for r in rows]},
    )


@router.get("/testimonials", response_model=APIEnvelope)
def public_testimonials(db: Session = Depends(get_db)):
    rows = list_testimonials(db, active_only=True)
    return APIEnvelope(
        message="Testimonials fetched.",
        data={
            "testimonials": [
                _obj_to_dict(r, ["id", "name", "title", "org", "quote", "avatar_url", "order", "active"])
                for r in rows
            ]
        },
    )


@router.get("/case-studies", response_model=APIEnvelope)
def public_case_studies(db: Session = Depends(get_db)):
    rows = list_case_studies(db, active_only=True)
    return APIEnvelope(
        message="Case studies fetched.",
        data={
            "case_studies": [
                _obj_to_dict(r, ["id", "title", "org", "metric_1", "metric_2", "summary", "href", "order", "active"])
                for r in rows
            ]
        },
    )


@router.get("/faqs", response_model=APIEnvelope)
def public_faqs(db: Session = Depends(get_db)):
    rows = list_faqs(db, active_only=True)
    return APIEnvelope(
        message="FAQs fetched.",
        data={"faqs": [_obj_to_dict(r, ["id", "question", "answer", "order", "active"]) for r in rows]},
    )


@router.get("/config", response_model=APIEnvelope)
def public_config(db: Session = Depends(get_db)):
    return APIEnvelope(
        message="Config fetched.",
        data={
            "org_type_copy": get_config(db, "org_type_copy"),
            "seed_metrics": get_config(db, "seed_metrics"),
            "cta": get_config(db, "cta"),
        },
    )


@router.get("/sample-ledger", response_model=APIEnvelope)
def public_sample_ledger(db: Session = Depends(get_db)):
    rows = sample_ledger_rows(db)
    return APIEnvelope(message="Sample ledger fetched.", data={"rows": rows})


@router.post("/leads", response_model=APIEnvelope, status_code=status.HTTP_201_CREATED, dependencies=[Depends(_rate_limit("leads"))])
def create_public_lead(payload: LeadCreate, db: Session = Depends(get_db)):
    with db.begin():
        row = create_lead(db, payload)
    return APIEnvelope(message="Lead captured.", data={"lead_id": row.id, "status": row.status})


@router.post("/contact", response_model=APIEnvelope, status_code=status.HTTP_201_CREATED, dependencies=[Depends(_rate_limit("contact"))])
def create_public_contact(payload: ContactCreate, db: Session = Depends(get_db)):
    with db.begin():
        row = create_contact_message(db, payload)
    return APIEnvelope(message="Message submitted.", data={"message_id": row.id})


@router.post(
    "/newsletter/subscribe",
    response_model=APIEnvelope,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(_rate_limit("newsletter"))],
)
def newsletter_subscribe(payload: NewsletterSubscribe, db: Session = Depends(get_db)):
    with db.begin():
        row = subscribe_newsletter(db, payload.email)
    return APIEnvelope(message="Subscribed successfully.", data={"subscriber_id": row.id, "status": row.status})
