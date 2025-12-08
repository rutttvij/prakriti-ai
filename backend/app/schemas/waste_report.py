from datetime import datetime
from typing import Optional

from pydantic import BaseModel
import enum


# -------------------------------------------------------------
# Enum for consistent validation + OpenAPI docs
# -------------------------------------------------------------
class WasteReportStatus(str, enum.Enum):
    OPEN = "OPEN"
    IN_PROGRESS = "IN_PROGRESS"
    RESOLVED = "RESOLVED"


# -------------------------------------------------------------
# Minimal household schema (optional nested embeddable)
# -------------------------------------------------------------
class HouseholdReadMinimal(BaseModel):
    id: int
    address: Optional[str] = None
    name: Optional[str] = None

    class Config:
        from_attributes = True


# -------------------------------------------------------------
# Minimal worker schema (optional nested embeddable)
# -------------------------------------------------------------
class WorkerReadMinimal(BaseModel):
    id: int
    full_name: Optional[str] = None

    class Config:
        from_attributes = True


# -------------------------------------------------------------
# MAIN RESPONSE SCHEMA FOR WASTE REPORTS
# -------------------------------------------------------------
class WasteReportRead(BaseModel):
    id: int
    public_id: Optional[str] = None  # e.g. "CIT-2-000001", "BULK-5-000003"

    reporter_id: int

    # 🔹 NEW: household/site ID attached to the waste report
    household_id: Optional[int] = None

    image_path: Optional[str] = None
    description: Optional[str] = None

    latitude: Optional[float] = None
    longitude: Optional[float] = None

    # Snapshot of AI classification at time of report
    classification_label: Optional[str] = None
    classification_confidence: Optional[float] = None
    classification_recyclable: Optional[bool] = None

    status: str

    created_at: datetime
    updated_at: datetime
    assigned_worker_id: Optional[int] = None
    resolved_at: Optional[datetime] = None

    # 🔹 Optional nested objects (sent only if backend includes them)
    household: Optional[HouseholdReadMinimal] = None
    assigned_worker: Optional[WorkerReadMinimal] = None

    class Config:
        from_attributes = True
