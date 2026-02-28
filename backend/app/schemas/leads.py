from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, EmailStr, Field


OrgType = Literal["city", "campus", "society", "corporate"]
LeadStatus = Literal["new", "contacted", "qualified", "closed"]


class LeadCreate(BaseModel):
    name: str = Field(min_length=2, max_length=255)
    org_name: str = Field(min_length=2, max_length=255)
    org_type: OrgType
    email: EmailStr
    phone: str | None = Field(default=None, max_length=50)
    message: str | None = Field(default=None, max_length=2000)


class LeadRead(BaseModel):
    id: int
    name: str
    org_name: str
    org_type: str
    email: EmailStr
    phone: str | None = None
    message: str | None = None
    status: str
    created_at: datetime

    class Config:
        from_attributes = True


class LeadStatusUpdate(BaseModel):
    status: LeadStatus


class ContactCreate(BaseModel):
    name: str = Field(min_length=2, max_length=255)
    email: EmailStr
    subject: str | None = Field(default=None, max_length=255)
    message: str = Field(min_length=2, max_length=5000)


class ContactRead(BaseModel):
    id: int
    name: str
    email: EmailStr
    subject: str | None = None
    message: str
    created_at: datetime

    class Config:
        from_attributes = True


class NewsletterSubscribe(BaseModel):
    email: EmailStr


class NewsletterRead(BaseModel):
    id: int
    email: EmailStr
    status: str
    created_at: datetime

    class Config:
        from_attributes = True
