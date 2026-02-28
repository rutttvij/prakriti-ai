from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


class APIEnvelope(BaseModel):
    success: bool = True
    message: str = "ok"
    data: dict[str, Any] = Field(default_factory=dict)


class PartnerBase(BaseModel):
    name: str
    logo_url: str
    href: str | None = None
    order: int = 0
    active: bool = True


class PartnerCreate(PartnerBase):
    pass


class PartnerUpdate(BaseModel):
    name: str | None = None
    logo_url: str | None = None
    href: str | None = None
    order: int | None = None
    active: bool | None = None


class PartnerRead(PartnerBase):
    id: int

    class Config:
        from_attributes = True


class TestimonialBase(BaseModel):
    name: str
    title: str | None = None
    org: str | None = None
    quote: str
    avatar_url: str | None = None
    order: int = 0
    active: bool = True


class TestimonialCreate(TestimonialBase):
    pass


class TestimonialUpdate(BaseModel):
    name: str | None = None
    title: str | None = None
    org: str | None = None
    quote: str | None = None
    avatar_url: str | None = None
    order: int | None = None
    active: bool | None = None


class TestimonialRead(TestimonialBase):
    id: int

    class Config:
        from_attributes = True


class CaseStudyBase(BaseModel):
    title: str
    org: str
    metric_1: str | None = None
    metric_2: str | None = None
    summary: str
    href: str | None = None
    order: int = 0
    active: bool = True


class CaseStudyCreate(CaseStudyBase):
    pass


class CaseStudyUpdate(BaseModel):
    title: str | None = None
    org: str | None = None
    metric_1: str | None = None
    metric_2: str | None = None
    summary: str | None = None
    href: str | None = None
    order: int | None = None
    active: bool | None = None


class CaseStudyRead(CaseStudyBase):
    id: int

    class Config:
        from_attributes = True


class FAQBase(BaseModel):
    question: str
    answer: str
    order: int = 0
    active: bool = True


class FAQCreate(FAQBase):
    pass


class FAQUpdate(BaseModel):
    question: str | None = None
    answer: str | None = None
    order: int | None = None
    active: bool | None = None


class FAQRead(FAQBase):
    id: int

    class Config:
        from_attributes = True


class MarketingConfigUpsert(BaseModel):
    key: str
    value_json: dict[str, Any]


class MarketingConfigRead(BaseModel):
    key: str
    value_json: dict[str, Any]

    class Config:
        from_attributes = True


class PublicStats(BaseModel):
    total_users: int = 0
    total_waste_logs: int = 0
    total_verified_actions: int = 0
    total_carbon_saved: float = 0.0
    total_pcc_issued: float = 0.0
    avg_resolution_time_hours: float = 0.0
    open_reports: int = 0


class SampleLedgerRow(BaseModel):
    timestamp: datetime
    category: str
    verified_weight_kg: float
    carbon_saved_kgco2e: float
    pcc_awarded: float
    quality_score: float
