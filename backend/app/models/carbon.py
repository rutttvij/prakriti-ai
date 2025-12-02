from datetime import datetime

from sqlalchemy import (
    Column,
    Integer,
    String,
    DateTime,
    Float,
    ForeignKey,
)
from sqlalchemy.orm import relationship

from app.core.database import Base
from app.models.user import User


class CarbonActivity(Base):
    __tablename__ = "carbon_activities"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    # e.g. "SEGREGATION_LOG", "REPORT_RESOLVED", "COMPOST_LOG", "ML_CLASSIFICATION"
    activity_type = Column(String, nullable=False)

    # optional reference to related entity (segregation_log_id, report_id, etc.)
    reference_id = Column(Integer, nullable=True)

    description = Column(String, nullable=True)

    co2e_kg = Column(Float, nullable=False, default=0.0)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship(User, backref="carbon_activities")


class CarbonBalance(Base):
    __tablename__ = "carbon_balances"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)

    # net cumulative CO2e credits in kg
    total_co2e_kg = Column(Float, nullable=False, default=0.0)

    # total PCC tokens (mirrors token_accounts but denormalized)
    total_pcc = Column(Float, nullable=False, default=0.0)

    updated_at = Column(DateTime, default=datetime.utcnow)

    user = relationship(User, backref="carbon_balance")
