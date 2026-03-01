from __future__ import annotations

from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.models.contact import ContactMessage, ContactMessageStatus
from app.models.leads import DemoRequest
from app.schemas.contact_message import (
    ContactMessageDetail,
    ContactMessageListItem,
    ContactMessageStatus as ContactMessageStatusSchema,
)

MESSAGE_PREVIEW_LENGTH = 140


def _clean(value: str | None) -> str | None:
    if value is None:
        return None
    clean = " ".join(value.strip().split())
    return clean or None


def _to_list_item(row: ContactMessage) -> ContactMessageListItem:
    message = row.message or ""
    preview = message[:MESSAGE_PREVIEW_LENGTH]
    if len(message) > MESSAGE_PREVIEW_LENGTH:
        preview = f"{preview}..."
    return ContactMessageListItem(
        id=row.id,
        name=row.name,
        email=row.email,
        subject=row.subject,
        message_preview=preview,
        status=row.status,
        is_read=bool(row.is_read),
        created_at=row.created_at,
    )


def _to_detail(row: ContactMessage) -> ContactMessageDetail:
    return ContactMessageDetail.model_validate(row, from_attributes=True)


def list_contact_messages(
    db: Session,
    *,
    q: str | None,
    status: ContactMessageStatusSchema | None,
    unread_only: bool,
    page: int,
    page_size: int,
) -> tuple[list[ContactMessageListItem], int]:
    qry = db.query(ContactMessage)

    if status:
        qry = qry.filter(ContactMessage.status == status)
    if unread_only:
        qry = qry.filter(ContactMessage.is_read.is_(False))

    search = (q or "").strip()
    if search:
        pattern = f"%{search}%"
        qry = qry.filter(
            or_(
                ContactMessage.name.ilike(pattern),
                ContactMessage.email.ilike(pattern),
                ContactMessage.message.ilike(pattern),
                ContactMessage.subject.ilike(pattern),
            )
        )

    total = qry.count()
    rows = (
        qry.order_by(ContactMessage.created_at.desc(), ContactMessage.id.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    return [_to_list_item(row) for row in rows], total


def get_contact_message(db: Session, message_id: int) -> ContactMessage | None:
    return db.get(ContactMessage, message_id)


def update_contact_message(
    db: Session,
    row: ContactMessage,
    *,
    status: ContactMessageStatusSchema | None,
    is_read: bool | None,
    admin_notes: str | None,
) -> ContactMessage:
    if status is not None:
        row.status = status
    if is_read is not None:
        row.is_read = is_read
    if admin_notes is not None:
        row.admin_notes = _clean(admin_notes)

    db.add(row)
    db.flush()
    db.refresh(row)
    return row


def convert_contact_message_to_demo(
    db: Session,
    row: ContactMessage,
    *,
    organization: str | None,
    org_type: str,
    phone: str | None,
) -> tuple[DemoRequest, ContactMessage]:
    if row.converted_demo_request_id:
        existing = db.get(DemoRequest, row.converted_demo_request_id)
        if existing is not None:
            return existing, row

    demo = DemoRequest(
        name=row.name,
        organization=_clean(organization) or "Unknown",
        org_type=org_type,
        email=row.email,
        phone=_clean(phone),
        message=row.message,
        status="new",
    )
    db.add(demo)
    db.flush()

    row.converted_demo_request_id = demo.id
    row.is_read = True
    if row.status == ContactMessageStatus.NEW.value:
        row.status = ContactMessageStatus.IN_PROGRESS.value
    db.add(row)
    db.flush()
    db.refresh(row)

    return demo, row


def serialize_contact_message(row: ContactMessage) -> ContactMessageDetail:
    return _to_detail(row)
