from datetime import datetime, timezone, date

from sqlalchemy import (
    Column,
    Integer,
    String,
    DateTime,
    ForeignKey,
    Boolean,
    Float,
    Date,
    UniqueConstraint,
)
from sqlalchemy.orm import relationship

from app.core.database import Base
from app.models.user import User


def utc_now():
    return datetime.now(timezone.utc)


class Household(Base):
    __tablename__ = "households"

    id = Column(Integer, primary_key=True, index=True)

    name = Column(String, nullable=False)
    address = Column(String, nullable=True)
    ward = Column(String, nullable=True)
    city = Column(String, nullable=True)
    pincode = Column(String, nullable=True)

    owner_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    created_at = Column(DateTime(timezone=True), default=utc_now)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)

    is_bulk_generator = Column(Boolean, default=False)
    is_primary = Column(Boolean, default=False)

    owner = relationship(User, backref="owned_households")
    segregation_logs = relationship("SegregationLog", back_populates="household")
    members = relationship("HouseholdMember", back_populates="household", cascade="all, delete-orphan")


class HouseholdMember(Base):
    __tablename__ = "household_members"
    __table_args__ = (UniqueConstraint("household_id", "user_id", name="uq_household_members_household_user"),)

    id = Column(Integer, primary_key=True, index=True)
    household_id = Column(Integer, ForeignKey("households.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    is_primary = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)

    household = relationship("Household", back_populates="members")
    user = relationship(User, backref="household_memberships")


class SegregationLog(Base):
    __tablename__ = "segregation_logs"
    __table_args__ = (UniqueConstraint("household_id", "log_date", name="uq_household_log_date"),)

    id = Column(Integer, primary_key=True, index=True)

    household_id = Column(Integer, ForeignKey("households.id"), nullable=False)

    worker_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    waste_report_id = Column(Integer, ForeignKey("waste_reports.id"), nullable=True)

    citizen_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    log_date = Column(Date, nullable=False)

    dry_kg = Column(Float, nullable=False, default=0.0)
    wet_kg = Column(Float, nullable=False, default=0.0)
    reject_kg = Column(Float, nullable=False, default=0.0)

    segregation_score = Column(Integer, nullable=False, default=0)

    notes = Column(String, nullable=True)

    created_at = Column(DateTime(timezone=True), default=utc_now)

    waste_category = Column(String(64), nullable=True, index=True)
    weight_kg = Column(Float, nullable=True)
    quality_score = Column(Float, nullable=True)
    quality_level = Column(String(16), nullable=True, index=True)
    evidence_image_url = Column(String(600), nullable=True)
    pcc_status = Column(String(16), nullable=False, default="pending", index=True)
    awarded_pcc_amount = Column(Float, nullable=True)
    awarded_at = Column(DateTime(timezone=True), nullable=True)
    awarded_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)

    pcc_awarded = Column(Boolean, nullable=False, default=False)
    pcc_awarded_at = Column(DateTime(timezone=True), nullable=True)
    awarded_pcc_tokens = Column(Float, nullable=True)
    award_reason = Column(String, nullable=True)

    household = relationship(Household, back_populates="segregation_logs")
    worker = relationship(User, foreign_keys=[worker_id], backref="segregation_logs")
    citizen = relationship(User, foreign_keys=[citizen_id], backref="citizen_segregation_logs")
    awarded_by = relationship(User, foreign_keys=[awarded_by_user_id], backref="awarded_segregation_logs")

    waste_report = relationship(
        "WasteReport",
        back_populates="segregation_logs",
    )
