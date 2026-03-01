from datetime import datetime, timezone
from enum import Enum

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String, Text

from app.core.database import Base


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class ContactMessageStatus(str, Enum):
    NEW = "new"
    IN_PROGRESS = "in_progress"
    REPLIED = "replied"
    CLOSED = "closed"
    SPAM = "spam"

class ContactMessage(Base):
    __tablename__ = "contact_messages"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    email = Column(String(255), nullable=False, index=True)
    subject = Column(String(255), nullable=True)
    message = Column(Text, nullable=False)
    status = Column(String(32), nullable=False, default=ContactMessageStatus.NEW.value, index=True)
    is_read = Column(Boolean, nullable=False, default=False, index=True)
    admin_notes = Column(Text, nullable=True)
    converted_demo_request_id = Column(
        Integer,
        ForeignKey("demo_requests.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    created_at = Column(DateTime(timezone=True), nullable=False, default=utc_now, index=True)
    updated_at = Column(DateTime(timezone=True), nullable=False, default=utc_now, onupdate=utc_now)
