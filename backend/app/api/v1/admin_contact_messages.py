from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.api import deps
from app.core.database import get_db
from app.schemas.contact_message import (
    ContactMessageDetail,
    ContactMessageListResponse,
    ContactMessageStatus,
    ContactMessageUpdate,
    ConvertToDemoBody,
    ConvertToDemoResponse,
)
from app.services import contact_message_service

router = APIRouter(prefix="/admin/contact-messages", tags=["admin-contact-messages"])


@router.get("/", response_model=ContactMessageListResponse)
def list_messages(
    q: str | None = Query(default=None),
    status: ContactMessageStatus | None = Query(default=None),
    unread_only: bool = Query(default=False),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
    _: object = Depends(deps.require_super_admin),
):
    items, total = contact_message_service.list_contact_messages(
        db,
        q=q,
        status=status,
        unread_only=unread_only,
        page=page,
        page_size=page_size,
    )
    return ContactMessageListResponse(items=items, total=total, page=page, page_size=page_size)


@router.get("/{message_id}", response_model=ContactMessageDetail)
def get_message(
    message_id: int,
    db: Session = Depends(get_db),
    _: object = Depends(deps.require_super_admin),
):
    row = contact_message_service.get_contact_message(db, message_id)
    if row is None:
        raise HTTPException(status_code=404, detail="Contact message not found")
    return contact_message_service.serialize_contact_message(row)


@router.patch("/{message_id}", response_model=ContactMessageDetail)
def patch_message(
    message_id: int,
    payload: ContactMessageUpdate,
    db: Session = Depends(get_db),
    _: object = Depends(deps.require_super_admin),
):
    row = contact_message_service.get_contact_message(db, message_id)
    if row is None:
        raise HTTPException(status_code=404, detail="Contact message not found")

    try:
        row = contact_message_service.update_contact_message(
            db,
            row,
            status=payload.status,
            is_read=payload.is_read,
            admin_notes=payload.admin_notes,
        )
        db.commit()
        return contact_message_service.serialize_contact_message(row)
    except Exception:
        db.rollback()
        raise


@router.post("/{message_id}/convert-to-demo", response_model=ConvertToDemoResponse)
def convert_to_demo(
    message_id: int,
    payload: ConvertToDemoBody | None = None,
    db: Session = Depends(get_db),
    _: object = Depends(deps.require_super_admin),
):
    row = contact_message_service.get_contact_message(db, message_id)
    if row is None:
        raise HTTPException(status_code=404, detail="Contact message not found")

    try:
        demo, updated_message = contact_message_service.convert_contact_message_to_demo(
            db,
            row,
            organization=(payload.organization if payload else None),
            org_type=(payload.org_type if payload else "city"),
            phone=(payload.phone if payload else None),
        )
        db.commit()
    except Exception:
        db.rollback()
        raise

    return ConvertToDemoResponse(
        demo_request_id=demo.id,
        contact_message=contact_message_service.serialize_contact_message(updated_message),
    )
