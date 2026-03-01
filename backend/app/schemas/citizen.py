from __future__ import annotations

from datetime import date, datetime
from typing import Any

from pydantic import BaseModel, Field


class HouseholdCreateIn(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    city: str = Field(min_length=1, max_length=128)
    ward_zone: str | None = None
    address: str | None = None
    pincode: str | None = None
    make_primary: bool = False


class HouseholdUpdateIn(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    city: str | None = Field(default=None, min_length=1, max_length=128)
    ward_zone: str | None = None
    address: str | None = None
    pincode: str | None = None


class HouseholdLinkIn(BaseModel):
    household_id: int


class HouseholdOut(BaseModel):
    id: int
    name: str
    city: str | None = None
    ward_zone: str | None = None
    address: str | None = None
    pincode: str | None = None
    is_primary: bool
    created_at: datetime
    updated_at: datetime | None = None

    class Config:
        from_attributes = True


class WasteReportCreateIn(BaseModel):
    description: str
    household_id: int | None = None
    file_path: str
    classification_label: str
    classification_confidence: float = Field(ge=0, le=1)
    latitude: float | None = None
    longitude: float | None = None


class WasteReportOut(BaseModel):
    id: int
    public_id: str | None = None
    user_id: int
    household_id: int | None = None
    description: str | None = None
    file_path: str | None = None
    image_url: str | None = None
    classification_label: str | None = None
    classification_confidence: float | None = None
    latitude: float | None = None
    longitude: float | None = None
    status: str
    created_at: datetime
    resolved_at: datetime | None = None


class SegregationCreateIn(BaseModel):
    household_id: int
    log_date: date | None = None
    dry_kg: float = Field(ge=0)
    wet_kg: float = Field(ge=0)
    reject_kg: float = Field(ge=0)
    evidence_image_url: str | None = None


class SegregationOut(BaseModel):
    id: int
    household_id: int
    user_id: int
    log_date: date
    dry_kg: float
    wet_kg: float
    reject_kg: float
    score: float
    quality_level: str
    evidence_image_url: str | None = None
    pcc_status: str
    awarded_pcc_amount: float | None = None
    awarded_at: datetime | None = None
    created_at: datetime


class SegregationRecentOut(BaseModel):
    date: date
    dry: float
    wet: float
    reject: float
    score: float


class WeeklyScorePoint(BaseModel):
    week_label: str
    avg_score: float


class WeeklyBreakdownPoint(BaseModel):
    week_label: str
    dry_kg: float
    wet_kg: float
    reject_kg: float


class SegregationSummaryOut(BaseModel):
    avg_score: float
    totals: dict[str, float]
    estimated_pcc_preview: float
    weekly_score_points: list[WeeklyScorePoint]
    weekly_breakdown: list[WeeklyBreakdownPoint]
    recent_logs: list[SegregationRecentOut]


class CitizenPccSummaryOut(BaseModel):
    total_credited: float
    total_debited: float
    net_pcc: float
    co2_saved_kg: float


class CitizenPccTransactionOut(BaseModel):
    id: int
    type: str
    amount: float
    reason: str | None = None
    reference_type: str | None = None
    reference_id: int | None = None
    created_at: datetime


class CitizenPccTransactionsPage(BaseModel):
    items: list[CitizenPccTransactionOut]
    total: int
    page: int
    page_size: int


class TrainingModuleCitizenOut(BaseModel):
    id: int
    title: str
    summary: str | None = None
    content_json: dict[str, Any]
    order_index: int


class CitizenBadgeOut(BaseModel):
    id: int
    code: str | None = None
    title: str
    description: str | None = None
    awarded_at: datetime


class CitizenTrainingSummaryOut(BaseModel):
    total_modules_published: int
    completed_count: int
    completed_module_ids: list[int] = []
    progress_percent: float
    badges_count: int
    next_module: TrainingModuleCitizenOut | None = None
    badges: list[CitizenBadgeOut]


class NotificationOut(BaseModel):
    id: int
    title: str
    body: str
    is_read: bool
    created_at: datetime


class NotificationPatchIn(BaseModel):
    is_read: bool
