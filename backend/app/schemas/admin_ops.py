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
    created_at: datetime


class PccTransactionListResponse(BaseModel):
    items: list[PccTransactionItem]
    total: int


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
