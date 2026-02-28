from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import Column, DateTime, Integer, String, Text

from app.core.database import Base


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class Lead(Base):
    __tablename__ = "leads"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    org_name = Column(String(255), nullable=False)
    org_type = Column(String(64), nullable=False, index=True)
    email = Column(String(255), nullable=False, index=True)
    phone = Column(String(50), nullable=True)
    message = Column(Text, nullable=True)
    status = Column(String(32), nullable=False, default="new", index=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=utc_now, index=True)


class NewsletterSubscriber(Base):
    __tablename__ = "newsletter_subscribers"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), nullable=False, unique=True, index=True)
    status = Column(String(32), nullable=False, default="subscribed", index=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=utc_now, index=True)
