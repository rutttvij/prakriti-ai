from datetime import date
from typing import Optional

from pydantic import BaseModel, Field


class SegregationLogCreate(BaseModel):
    log_date: date
    household_id: int

    dry_kg: float = Field(ge=0)
    wet_kg: float = Field(ge=0)
    reject_kg: float = Field(ge=0)

    notes: Optional[str] = None


class SegregationLogRead(BaseModel):
    id: int
    household_id: int
    worker_id: Optional[int] = None

    log_date: date
    dry_kg: float
    wet_kg: float
    reject_kg: float

    segregation_score: int
    notes: Optional[str] = None

    class Config:
        from_attributes = True
