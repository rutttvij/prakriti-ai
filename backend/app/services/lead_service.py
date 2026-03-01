from __future__ import annotations

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.contact import ContactMessage
from app.models.leads import DemoRequest, Lead, NewsletterSubscriber
from app.schemas.leads import ContactCreate, LeadCreate


def _clean(value: str | None) -> str | None:
    if value is None:
        return None
    clean = " ".join(value.strip().split())
    return clean or None


def create_lead(db: Session, payload: LeadCreate) -> Lead:
    lead = Lead(
        name=_clean(payload.name) or payload.name,
        org_name=_clean(payload.org_name) or payload.org_name,
        org_type=payload.org_type,
        email=payload.email.lower(),
        phone=_clean(payload.phone),
        message=_clean(payload.message),
        status="new",
    )
    db.add(lead)

    demo_request = DemoRequest(
        name=_clean(payload.name) or payload.name,
        organization=_clean(payload.org_name) or payload.org_name,
        org_type=payload.org_type,
        email=payload.email.lower(),
        phone=_clean(payload.phone),
        message=_clean(payload.message),
        status="new",
    )
    db.add(demo_request)

    db.flush()
    return lead


def create_contact_message(db: Session, payload: ContactCreate) -> ContactMessage:
    row = ContactMessage(
        name=_clean(payload.name) or payload.name,
        email=payload.email.lower(),
        subject=_clean(payload.subject),
        message=_clean(payload.message) or payload.message,
    )
    db.add(row)
    db.flush()
    return row


def subscribe_newsletter(db: Session, email: str) -> NewsletterSubscriber:
    normalized = email.strip().lower()
    existing = db.query(NewsletterSubscriber).filter(NewsletterSubscriber.email == normalized).first()
    if existing:
        if existing.status != "subscribed":
            existing.status = "subscribed"
            db.add(existing)
            db.flush()
        return existing

    row = NewsletterSubscriber(email=normalized, status="subscribed")
    db.add(row)
    try:
        db.flush()
    except IntegrityError:
        db.rollback()
        row = db.query(NewsletterSubscriber).filter(NewsletterSubscriber.email == normalized).first()
        if row is None:
            raise
    return row
