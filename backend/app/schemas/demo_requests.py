from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, EmailStr, Field

DemoOrgType = Literal["city", "campus", "society", "corporate"]
DemoStatus = Literal["new", "contacted", "qualified", "closed"]


class DemoRequestRead(BaseModel):
    id: int
    name: str
    organization: str
    org_type: DemoOrgType
    email: EmailStr
    phone: str | None = None
    message: str | None = None
    status: DemoStatus
    admin_notes: str | None = None
    created_at: datetime

    class Config:
        from_attributes = True


class DemoRequestUpdate(BaseModel):
    status: DemoStatus | None = None
    admin_notes: str | None = Field(default=None, max_length=5000)


class DemoRequestListResponse(BaseModel):
    items: list[DemoRequestRead]
    total: int
    page: int
    page_size: int
