from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class RecentReport(BaseModel):
    id: int
    category: str
    status: str
    created_at: datetime

class CitizenDashboardSummary(BaseModel):
    user_name: str

    # Training
    training_completed: int
    training_total: int
    badges_earned: int

    # Segregation
    segregation_score: float  # 0-100
    segregation_streak_days: int

    # Carbon & PCC
    carbon_saved_kg: float
    pcc_tokens: float

    # Reports
    total_reports: int
    open_reports: int
    recent_reports: List[RecentReport] = []
