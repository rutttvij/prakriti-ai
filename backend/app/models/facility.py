from datetime import datetime

from sqlalchemy import (
    Boolean,
    Column,
    Integer,
    String,
    DateTime,
    Float,
)
from sqlalchemy.orm import relationship

from app.core.database import Base


class FacilityType(str):
    BIOMETHANIZATION = "BIOMETHANIZATION"
    W2E = "W2E"
    RECYCLING = "RECYCLING"
    SCRAP_SHOP = "SCRAP_SHOP"
    OTHER = "OTHER"


class Facility(Base):
    __tablename__ = "facilities"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    type = Column(String, nullable=False)  # use FacilityType constants
    address = Column(String, nullable=True)
    ward = Column(String, nullable=True)
    city = Column(String, nullable=True)

    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)

    capacity_tpd = Column(Float, nullable=True)  # tons per day
    contact_person = Column(String, nullable=True)
    contact_phone = Column(String, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)
    is_active = Column(Boolean, default=True)
