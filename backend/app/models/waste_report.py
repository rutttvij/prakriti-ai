from datetime import datetime, timezone
import enum

from sqlalchemy import (
    Column,
    Integer,
    String,
    DateTime,
    ForeignKey,
    Float,
    Boolean,
)
from sqlalchemy.orm import relationship

from app.core.database import Base
from app.models.user import User


def utc_now():
    return datetime.now(timezone.utc)


class WasteReportStatus(str, enum.Enum):
    OPEN = "OPEN"
    IN_PROGRESS = "IN_PROGRESS"
    RESOLVED = "RESOLVED"


class WasteReport(Base):
    __tablename__ = "waste_reports"

    id = Column(Integer, primary_key=True, index=True)

    # Per-reporter human ID, e.g. "CIT-2-000001", "BULK-5-000003"
    public_id = Column(String(32), unique=True, index=True, nullable=True)

    reporter_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    # 🔹 Link to household / site (optional but preferred)
    household_id = Column(Integer, ForeignKey("households.id"), nullable=True)

    image_path = Column(String, nullable=True)
    description = Column(String, nullable=True)

    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)

    # Snapshot of AI classification at time of report
    classification_label = Column(String, nullable=True)
    classification_confidence = Column(Float, nullable=True)
    classification_recyclable = Column(Boolean, nullable=True)

    status = Column(
        String,
        nullable=False,
        default=WasteReportStatus.OPEN.value,
    )

    # ✅ timezone-aware UTC timestamps
    created_at = Column(DateTime(timezone=True), default=utc_now)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)

    assigned_worker_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    resolved_at = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    segregation_logs = relationship(
        "SegregationLog",
        back_populates="waste_report",
    )

    reporter = relationship(
        User,
        foreign_keys=[reporter_id],
        backref="reports_made",
    )

    assigned_worker = relationship(
        User,
        foreign_keys=[assigned_worker_id],
        backref="reports_assigned",
    )

    household = relationship(
        "Household",
        backref="waste_reports",
    )
