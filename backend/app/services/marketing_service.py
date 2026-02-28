from __future__ import annotations

from collections.abc import Sequence
from typing import Any

from sqlalchemy.orm import Session

from app.models.marketing import (
    MarketingCaseStudy,
    MarketingConfig,
    MarketingFAQ,
    MarketingPartner,
    MarketingTestimonial,
)


def list_partners(db: Session, active_only: bool = True) -> Sequence[MarketingPartner]:
    q = db.query(MarketingPartner)
    if active_only:
        q = q.filter(MarketingPartner.active.is_(True))
    return q.order_by(MarketingPartner.order.asc(), MarketingPartner.id.asc()).all()


def list_testimonials(db: Session, active_only: bool = True) -> Sequence[MarketingTestimonial]:
    q = db.query(MarketingTestimonial)
    if active_only:
        q = q.filter(MarketingTestimonial.active.is_(True))
    return q.order_by(MarketingTestimonial.order.asc(), MarketingTestimonial.id.asc()).all()


def list_case_studies(db: Session, active_only: bool = True) -> Sequence[MarketingCaseStudy]:
    q = db.query(MarketingCaseStudy)
    if active_only:
        q = q.filter(MarketingCaseStudy.active.is_(True))
    return q.order_by(MarketingCaseStudy.order.asc(), MarketingCaseStudy.id.asc()).all()


def list_faqs(db: Session, active_only: bool = True) -> Sequence[MarketingFAQ]:
    q = db.query(MarketingFAQ)
    if active_only:
        q = q.filter(MarketingFAQ.active.is_(True))
    return q.order_by(MarketingFAQ.order.asc(), MarketingFAQ.id.asc()).all()


def get_config(db: Session, key: str) -> dict[str, Any]:
    row = db.query(MarketingConfig).filter(MarketingConfig.key == key).first()
    return dict(row.value_json or {}) if row else {}


def upsert_config(db: Session, key: str, value_json: dict[str, Any]) -> MarketingConfig:
    row = db.query(MarketingConfig).filter(MarketingConfig.key == key).first()
    if row is None:
        row = MarketingConfig(key=key, value_json=value_json)
    else:
        row.value_json = value_json
    db.add(row)
    db.flush()
    return row


def seed_marketing_content(db: Session) -> None:
    if not db.query(MarketingPartner).count():
        db.add_all(
            [
                MarketingPartner(name="Green India Mission", logo_url="https://dummyimage.com/220x64/e8f5ef/0c3d2d&text=Green+India", href="#", order=1, active=True),
                MarketingPartner(name="Urban Civic Labs", logo_url="https://dummyimage.com/220x64/e8f5ef/0c3d2d&text=Urban+Civic", href="#", order=2, active=True),
                MarketingPartner(name="Campus Earth Alliance", logo_url="https://dummyimage.com/220x64/e8f5ef/0c3d2d&text=Campus+Earth", href="#", order=3, active=True),
            ]
        )

    if not db.query(MarketingTestimonial).count():
        db.add_all(
            [
                MarketingTestimonial(name="R. Menon", title="Commissioner", org="Metro City Council", quote="Prakriti.AI gave us verifiable closure and ward-level transparency in weeks.", order=1, active=True),
                MarketingTestimonial(name="A. Shah", title="Sustainability Lead", org="Western Tech Campus", quote="Bulk workflows and PCC audit trail made compliance and reporting seamless.", order=2, active=True),
                MarketingTestimonial(name="N. Iyer", title="Operations Head", org="Greenview Society Federation", quote="Response time dropped and resident trust improved with evidence-backed updates.", order=3, active=True),
            ]
        )

    if not db.query(MarketingCaseStudy).count():
        db.add_all(
            [
                MarketingCaseStudy(
                    title="Ward Ops Modernization",
                    org="Navi District Municipal Cluster",
                    metric_1="31% faster resolution",
                    metric_2="18.4t CO2e avoided",
                    summary="Unified intake, verification, and worker routing improved SLA adherence in 90 days.",
                    href="#",
                    order=1,
                    active=True,
                )
            ]
        )

    if not db.query(MarketingFAQ).count():
        db.add_all(
            [
                MarketingFAQ(question="How quickly can we launch a pilot?", answer="Most pilots start in 2-4 weeks including setup, training, and workflow calibration.", order=1, active=True),
                MarketingFAQ(question="How is PCC calculated?", answer="PCC is based on verified waste weight, category emission factor, and quality multiplier after verification.", order=2, active=True),
                MarketingFAQ(question="Can we export audit trails?", answer="Yes. Evidence-linked logs and ledger entries are exportable for audits and reviews.", order=3, active=True),
            ]
        )

    if not db.query(MarketingConfig).filter(MarketingConfig.key == "seed_metrics").first():
        upsert_config(
            db,
            "seed_metrics",
            {
                "total_users": 210000,
                "total_waste_logs": 52000,
                "total_verified_actions": 38450,
                "total_carbon_saved": 1240.0,
                "total_pcc_issued": 980500.0,
                "avg_resolution_time_hours": 5.7,
                "open_reports": 128,
            },
        )

    if not db.query(MarketingConfig).filter(MarketingConfig.key == "org_type_copy").first():
        upsert_config(
            db,
            "org_type_copy",
            {
                "city": {
                    "headline": "Waste Ops That Cities Trust.",
                    "subheadline": "Coordinate wards, workers, and verification in one measurable civic stack.",
                },
                "campus": {
                    "headline": "Campus Waste Intelligence, End-to-End.",
                    "subheadline": "Track collection quality, compliance, and carbon impact across facilities.",
                },
                "society": {
                    "headline": "Society Operations With Verified Impact.",
                    "subheadline": "Improve resident service and segregation quality with audit-ready workflows.",
                },
                "corporate": {
                    "headline": "Enterprise Waste Governance That Scales.",
                    "subheadline": "Standardize vendor performance, verification evidence, and carbon reporting.",
                },
            },
        )
