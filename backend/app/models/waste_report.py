from datetime import datetime
import enum

from sqlalchemy import (
    Column,
    Integer,
    String,
    DateTime,
    ForeignKey,
    Float,
)
from sqlalchemy.orm import relationship

from app.core.database import Base
from app.models.user import User


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

    image_path = Column(String, nullable=True)  # local file path
    description = Column(String, nullable=True)

    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)

    status = Column(String, nullable=False, default=WasteReportStatus.OPEN.value)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow)

    assigned_worker_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    resolved_at = Column(DateTime, nullable=True)

    reporter = relationship(User, foreign_keys=[reporter_id], backref="reports_made")
    assigned_worker = relationship(
        User,
        foreign_keys=[assigned_worker_id],
        backref="reports_assigned",
    )
