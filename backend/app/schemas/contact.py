# backend/app/schemas/contact.py
from datetime import datetime
from pydantic import BaseModel, EmailStr, Field


class ContactCreate(BaseModel):
    name: str
    email: EmailStr
    message: str


class ContactOut(BaseModel):
    id: int
    name: str
    email: EmailStr
    message: str
    created_at: datetime

    class Config:
        orm_mode = True
