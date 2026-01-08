# backend/app/api/contact.py
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.api import deps
from app.schemas.contact import ContactCreate, ContactOut
from app.services.contact_service import create_contact_message, list_contact_messages

router = APIRouter(prefix="/contact", tags=["contact"])


@router.post(
    "",
    response_model=ContactOut,
    status_code=status.HTTP_201_CREATED,
)
def submit_contact_message(
    payload: ContactCreate,
    db: Session = Depends(get_db),
):
    """
    Public endpoint – store a contact-us message.
    """
    return create_contact_message(db, payload)


@router.get(
    "/admin",
    response_model=list[ContactOut],
)
def get_contact_messages(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user=Depends(deps.require_super_admin),
):
    """
    Super admin: list contact-us messages.
    """
    return list_contact_messages(db, skip=skip, limit=limit)
