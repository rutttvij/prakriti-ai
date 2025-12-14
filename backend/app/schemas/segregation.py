# backend/app/schemas/segregation.py

from datetime import date
from typing import Optional
from pydantic import BaseModel, Field


# -------------------------------------------------------------
# Minimal waste report schema (helps if frontend wants report info)
# -------------------------------------------------------------
class WasteReportReadMinimal(BaseModel):
    id: int
    public_id: Optional[str] = None
    household_id: Optional[int] = None
    status: Optional[str] = None

    class Config:
        from_attributes = True


# -------------------------------------------------------------
# CREATE payload for segregation logs (worker input)
# -------------------------------------------------------------
class SegregationLogCreate(BaseModel):
    log_date: date
    household_id: int

    dry_kg: float = Field(ge=0)
    wet_kg: float = Field(ge=0)
    reject_kg: float = Field(ge=0)

    notes: Optional[str] = None

    # Optional: link to a waste report
    waste_report_id: Optional[int] = None


# -------------------------------------------------------------
# READ schema for segregation logs (API responses)
# -------------------------------------------------------------
class SegregationLogRead(BaseModel):
    id: int
    household_id: int

    worker_id: Optional[int] = None
    citizen_id: Optional[int] = None

    log_date: date
    dry_kg: float
    wet_kg: float
    reject_kg: float

    segregation_score: int
    notes: Optional[str] = None

    # Optional: reference to the report
    waste_report_id: Optional[int] = None

    # Optional: embed minimal report info if needed by frontend
    waste_report: Optional[WasteReportReadMinimal] = None

    class Config:
        from_attributes = True
