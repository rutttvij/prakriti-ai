from datetime import datetime

from sqlalchemy import (
    Column,
    Integer,
    String,
    DateTime,
    ForeignKey,
    Boolean,
)
from sqlalchemy.orm import relationship

from app.core.database import Base
from app.models.user import User


class Household(Base):
    __tablename__ = "households"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)  # society/household name
    address = Column(String, nullable=True)
    ward = Column(String, nullable=True)
    city = Column(String, nullable=True)
    pincode = Column(String, nullable=True)

    # who registered / primary contact
    owner_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    is_bulk_generator = Column(Boolean, default=False)

    owner = relationship(User, backref="owned_households")
    segregation_logs = relationship("SegregationLog", back_populates="household")


class SegregationLog(Base):
    __tablename__ = "segregation_logs"

    id = Column(Integer, primary_key=True, index=True)
    household_id = Column(Integer, ForeignKey("households.id"), nullable=False)

    # which worker recorded this log
    worker_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    log_date = Column(DateTime, default=datetime.utcnow)

    # simple scoring: 0–100
    segregation_score = Column(Integer, nullable=False, default=0)

    # raw flags
    wet_correct = Column(Boolean, default=False)
    dry_correct = Column(Boolean, default=False)
    reject_correct = Column(Boolean, default=False)
    hazardous_present = Column(Boolean, default=False)

    notes = Column(String, nullable=True)

    household = relationship(Household, back_populates="segregation_logs")
    worker = relationship(User, backref="segregation_logs")
