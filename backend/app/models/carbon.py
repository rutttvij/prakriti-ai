# app/models/carbon.py

from datetime import datetime
import enum

from sqlalchemy import (
    Column,
    Integer,
    Float,
    DateTime,
    ForeignKey,
    Enum as SAEnum,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship

from app.core.database import Base


class CarbonActivityType(str, enum.Enum):
    SEGREGATION = "SEGREGATION"
    SEGREGATION_REWARD = "SEGREGATION_REWARD"
    WASTE_REPORT_RESOLUTION = "WASTE_REPORT_RESOLUTION"
    HOUSEHOLD_CLASSIFICATION = "HOUSEHOLD_CLASSIFICATION"
    MANUAL_AWARD = "MANUAL_AWARD"
    TRAINING = "TRAINING"  # <--- NEW for training module


class CarbonActivity(Base):
    __tablename__ = "carbon_activities"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    activity_type = Column(
        SAEnum(CarbonActivityType, name="carbonactivitytype"),
        nullable=False,
    )

    carbon_kg = Column(Float, nullable=False)

    pcc_tokens = Column(Float, nullable=False, default=0.0)

    details = Column(JSONB, nullable=False, server_default="{}")

    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)

    user = relationship("User", backref="carbon_activities")
