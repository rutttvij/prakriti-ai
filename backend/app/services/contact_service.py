# backend/app/services/contact_service.py
from sqlalchemy.orm import Session

from app.models.contact import ContactMessage
from app.schemas.contact import ContactCreate


def create_contact_message(db: Session, payload: ContactCreate) -> ContactMessage:
    contact = ContactMessage(
        name=payload.name,
        email=payload.email,
        message=payload.message,
    )
    db.add(contact)
    db.commit()
    db.refresh(contact)
    return contact


def list_contact_messages(db: Session, skip: int = 0, limit: int = 100):
    return (
        db.query(ContactMessage)
        .order_by(ContactMessage.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )
