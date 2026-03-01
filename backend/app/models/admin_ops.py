from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB

from app.core.database import Base


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class Zone(Base):
    __tablename__ = "zones"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False, index=True)
    type = Column(String(64), nullable=False, index=True)
    city = Column(String(128), nullable=False, index=True)
    active = Column(Boolean, nullable=False, default=True, index=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=utc_now)
    updated_at = Column(DateTime(timezone=True), nullable=False, default=utc_now, onupdate=utc_now)


class WorkforceAssignment(Base):
    __tablename__ = "workforce_assignments"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True, index=True)
    zone_id = Column(Integer, ForeignKey("zones.id", ondelete="SET NULL"), nullable=True, index=True)
    active = Column(Boolean, nullable=False, default=True, index=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=utc_now)
    updated_at = Column(DateTime(timezone=True), nullable=False, default=utc_now, onupdate=utc_now)


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    actor_user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    actor_email = Column(String(255), nullable=True, index=True)
    action = Column(String(128), nullable=False, index=True)
    entity = Column(String(128), nullable=False, index=True)
    entity_id = Column(String(64), nullable=True, index=True)
    meta_json = Column("metadata", JSONB, nullable=False, server_default="{}")
    created_at = Column(DateTime(timezone=True), nullable=False, default=utc_now, index=True)


class PlatformSetting(Base):
    __tablename__ = "platform_settings"

    id = Column(Integer, primary_key=True, index=True)
    key = Column(String(120), nullable=False, unique=True, index=True)
    value_json = Column(JSONB, nullable=False, server_default="{}")
    description = Column(Text, nullable=True)
    updated_by_user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=utc_now)
    updated_at = Column(DateTime(timezone=True), nullable=False, default=utc_now, onupdate=utc_now)
