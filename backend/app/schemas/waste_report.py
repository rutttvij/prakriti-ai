from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class WasteReportStatus(str):
    OPEN = "OPEN"
    IN_PROGRESS = "IN_PROGRESS"
    RESOLVED = "RESOLVED"


class WasteReportRead(BaseModel):
    id: int
    public_id: Optional[str] = None  # e.g. "CIT-2-000001", "BULK-5-000003"

    reporter_id: int
    image_path: Optional[str] = None
    description: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    status: str
    created_at: datetime
    updated_at: datetime
    assigned_worker_id: Optional[int] = None
    resolved_at: Optional[datetime] = None

    class Config:
        from_attributes = True
