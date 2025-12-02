from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class SegregationLogCreate(BaseModel):
    household_id: int
    wet_correct: bool
    dry_correct: bool
    reject_correct: bool
    hazardous_present: bool = False
    notes: Optional[str] = None


class SegregationLogRead(BaseModel):
    id: int
    household_id: int
    worker_id: Optional[int] = None
    log_date: datetime
    segregation_score: int
    wet_correct: bool
    dry_correct: bool
    reject_correct: bool
    hazardous_present: bool
    notes: Optional[str] = None

    class Config:
        from_attributes = True
