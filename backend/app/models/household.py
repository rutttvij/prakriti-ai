from datetime import datetime, date

from sqlalchemy import (
    Column,
    Integer,
    String,
    DateTime,
    ForeignKey,
    Boolean,
    Float,
    Date,
)
from sqlalchemy.orm import relationship

from app.core.database import Base
from app.models.user import User


class Household(Base):
    __tablename__ = "households"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)  # society/household name or code
    address = Column(String, nullable=True)
    ward = Column(String, nullable=True)
    city = Column(String, nullable=True)
    pincode = Column(String, nullable=True)

    # who registered / primary contact
    owner_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # flags
    is_bulk_generator = Column(Boolean, default=False)
    # multi-household support: one primary per user (optional but recommended)
    is_primary = Column(Boolean, default=False)

    owner = relationship(User, backref="owned_households")
    segregation_logs = relationship("SegregationLog", back_populates="household")


class SegregationLog(Base):
    """
    Segregation log in KG, not booleans.

    This is aligned with the DB structure:
    - dry_kg / wet_kg / reject_kg
    - segregation_score (0–100)
    """

    __tablename__ = "segregation_logs"

    id = Column(Integer, primary_key=True, index=True)
    household_id = Column(Integer, ForeignKey("households.id"), nullable=False)

    # which worker recorded this log
    worker_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    # logical date of the log (not timestamp)
    log_date = Column(Date, nullable=False)

    dry_kg = Column(Float, nullable=False, default=0.0)
    wet_kg = Column(Float, nullable=False, default=0.0)
    reject_kg = Column(Float, nullable=False, default=0.0)

    # simple scoring: 0–100
    segregation_score = Column(Integer, nullable=False, default=0)

    notes = Column(String, nullable=True)

    household = relationship(Household, back_populates="segregation_logs")
    worker = relationship(User, backref="segregation_logs")
