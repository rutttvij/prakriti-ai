from datetime import datetime, timezone

from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime
from sqlalchemy.dialects.postgresql import JSONB

from app.core.database import Base


def utc_now():
    return datetime.now(timezone.utc)


class EmissionFactor(Base):
    __tablename__ = "emission_factors"

    id = Column(Integer, primary_key=True, index=True)
    category = Column(String(64), nullable=False, unique=True, index=True)
    kgco2e_per_kg = Column(Float, nullable=False)
    active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=utc_now)
    updated_at = Column(DateTime(timezone=True), nullable=False, default=utc_now, onupdate=utc_now)


class CarbonLedger(Base):
    __tablename__ = "carbon_ledger"

    id = Column(Integer, primary_key=True, index=True)
    ref_type = Column(String(64), nullable=False, index=True)
    ref_id = Column(Integer, nullable=False, index=True)
    user_id = Column(Integer, nullable=True, index=True)
    org_id = Column(Integer, nullable=True, index=True)

    carbon_saved_kgco2e = Column(Float, nullable=False)
    pcc_awarded = Column(Float, nullable=False)
    quality_score = Column(Float, nullable=False, default=1.0)
    details = Column(JSONB, nullable=False, server_default="{}")
    created_at = Column(DateTime(timezone=True), nullable=False, default=utc_now, index=True)
