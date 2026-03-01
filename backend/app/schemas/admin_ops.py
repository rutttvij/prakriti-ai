from __future__ import annotations

from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, EmailStr, Field


class AdminKpiSummary(BaseModel):
    total_users: int
    active_users: int
    pending_approvals: int
    total_zones: int
    workforce_count: int
    open_demo_requests: int
    unread_contact_messages: int


class ActivityItem(BaseModel):
    kind: Literal["demo_request", "contact_message", "audit_log"]
    id: int
    title: str
    subtitle: str | None = None
    created_at: datetime


class AnalyticsSummaryResponse(BaseModel):
    kpis: AdminKpiSummary
    recent_activity: list[ActivityItem]


class ApprovalItem(BaseModel):
    id: int
    user_id: int
    name: str
    email: EmailStr
    role: str
    status: str
    created_at: datetime | None = None


class ApprovalListResponse(BaseModel):
    items: list[ApprovalItem]


class ApprovalActionBody(BaseModel):
    decision: Literal["approve", "reject"]


class ZoneBase(BaseModel):
    name: str = Field(min_length=2, max_length=255)
    type: str = Field(min_length=2, max_length=64)
    city: str = Field(min_length=2, max_length=128)
    active: bool = True


class ZoneCreate(ZoneBase):
    pass


class ZoneUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=255)
    type: str | None = Field(default=None, min_length=2, max_length=64)
    city: str | None = Field(default=None, min_length=2, max_length=128)
    active: bool | None = None


class ZoneRead(ZoneBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class WorkforceCreate(BaseModel):
    name: str = Field(min_length=2, max_length=255)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    zone_id: int | None = None


class WorkforceUpdate(BaseModel):
    full_name: str | None = Field(default=None, min_length=2, max_length=255)
    is_active: bool | None = None


class WorkforceAssignZoneBody(BaseModel):
    zone_id: int | None = None


class WorkforceRead(BaseModel):
    user_id: int
    full_name: str | None
    email: EmailStr
    role: str
    is_active: bool
    zone_id: int | None
    zone_name: str | None


class PccSummaryResponse(BaseModel):
    total_credited: float
    total_debited: float
    net_pcc: float
    tx_count: int


class PccTransactionItem(BaseModel):
    id: int
    user_id: int | None
    type: str
    amount_pcc: float
    reason: str | None
    ref_type: str | None = None
    ref_id: int | None = None
    created_by_user_id: int | None = None
    created_at: datetime


class PccTransactionListResponse(BaseModel):
    items: list[PccTransactionItem]
    total: int
    page: int = 1
    page_size: int = 20
    total_credited: float = 0.0
    total_debited: float = 0.0
    net_pcc: float = 0.0
    transactions_count: int = 0


class PccEmissionFactorItem(BaseModel):
    id: int
    waste_category: str
    kgco2e_per_kg: float
    active: bool
    updated_at: datetime


class PccEmissionFactorCreate(BaseModel):
    waste_category: str = Field(min_length=2, max_length=64)
    kgco2e_per_kg: float = Field(gt=0)
    active: bool = True


class PccEmissionFactorUpdate(BaseModel):
    kgco2e_per_kg: float | None = Field(default=None, gt=0)
    active: bool | None = None


class PccSettingsRead(BaseModel):
    pcc_unit_kgco2e: float
    quality_multipliers: dict[str, float]
    updated_at: datetime


class PccSettingsUpdate(BaseModel):
    pcc_unit_kgco2e: float | None = Field(default=None, gt=0)
    quality_multipliers: dict[str, float] | None = None


class PccReferenceType(str):
    CITIZEN_LOG = "citizen_log"
    BULK_LOG = "bulk_log"


class PccAwardBody(BaseModel):
    reference_type: Literal["citizen_log", "bulk_log"]
    reference_id: int = Field(gt=0)


class PccBulkAwardBody(BaseModel):
    items: list[PccAwardBody] = Field(default_factory=list)


class PccRevokeBody(BaseModel):
    reference_type: Literal["citizen_log", "bulk_log"]
    reference_id: int = Field(gt=0)
    reason: str | None = Field(default=None, max_length=500)


class PccAwardedItem(BaseModel):
    reference_type: Literal["citizen_log", "bulk_log"]
    reference_id: int
    amount: float


class PccSkippedItem(BaseModel):
    reference_type: Literal["citizen_log", "bulk_log"]
    reference_id: int
    reason: str


class PccBulkAwardResponse(BaseModel):
    awarded: list[PccAwardedItem]
    skipped: list[PccSkippedItem]


class PccActionResponse(BaseModel):
    reference_type: Literal["citizen_log", "bulk_log"]
    reference_id: int
    transaction_id: int
    amount: float
    pcc_status: str


class CitizenSegregationLogItem(BaseModel):
    id: int
    user_id: int
    user_name: str | None = None
    household: str | None = None
    waste_category: str | None = None
    weight_kg: float
    quality_score: float | None = None
    quality_level: str | None = None
    pcc_status: str
    awarded_pcc_amount: float | None = None
    created_at: datetime
    evidence_image_url: str | None = None


class CitizenSegregationLogListResponse(BaseModel):
    items: list[CitizenSegregationLogItem]
    total: int
    page: int
    page_size: int


class BulkGeneratorLogItem(BaseModel):
    id: int
    user_id: int
    org_name: str | None = None
    waste_category: str | None = None
    weight_kg: float
    quality_level: str | None = None
    verification_status: str
    pcc_status: str
    awarded_pcc_amount: float | None = None
    created_at: datetime


class BulkGeneratorLogListResponse(BaseModel):
    items: list[BulkGeneratorLogItem]
    total: int
    page: int
    page_size: int


class AuditLogItem(BaseModel):
    id: int
    actor_user_id: int | None
    actor_email: str | None
    action: str
    entity: str
    entity_id: str | None
    metadata: dict[str, Any]
    created_at: datetime


class AuditLogListResponse(BaseModel):
    items: list[AuditLogItem]
    total: int


class SettingsRead(BaseModel):
    pcc_unit_kgco2e: float
    emission_factors: dict[str, float]
    quality_multipliers: dict[str, float]
    feature_flags: dict[str, bool]


class SettingsUpdate(BaseModel):
    pcc_unit_kgco2e: float | None = None
    emission_factors: dict[str, float] | None = None
    quality_multipliers: dict[str, float] | None = None
    feature_flags: dict[str, bool] | None = None


class GenericOk(BaseModel):
    ok: bool = True
