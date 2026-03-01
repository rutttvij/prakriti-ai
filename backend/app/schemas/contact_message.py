from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, EmailStr, Field

ContactMessageStatus = Literal["new", "in_progress", "replied", "closed", "spam"]
DemoRequestOrgType = Literal["city", "campus", "society", "corporate"]


class ContactMessageListItem(BaseModel):
    id: int
    name: str
    email: EmailStr
    subject: str | None = None
    message_preview: str
    status: ContactMessageStatus
    is_read: bool
    created_at: datetime


class ContactMessageDetail(BaseModel):
    id: int
    name: str
    email: EmailStr
    subject: str | None = None
    message: str
    status: ContactMessageStatus
    is_read: bool
    admin_notes: str | None = None
    created_at: datetime
    updated_at: datetime
    converted_demo_request_id: int | None = None

    class Config:
        from_attributes = True


class ContactMessageListResponse(BaseModel):
    items: list[ContactMessageListItem]
    total: int
    page: int
    page_size: int


class ContactMessageUpdate(BaseModel):
    status: ContactMessageStatus | None = None
    is_read: bool | None = None
    admin_notes: str | None = Field(default=None, max_length=5000)


class ConvertToDemoBody(BaseModel):
    organization: str | None = Field(default=None, max_length=255)
    org_type: DemoRequestOrgType = "city"
    phone: str | None = Field(default=None, max_length=50)


class ConvertToDemoResponse(BaseModel):
    demo_request_id: int
    contact_message: ContactMessageDetail
