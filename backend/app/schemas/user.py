from pydantic import BaseModel, EmailStr
from enum import Enum


class UserRole(str, Enum):
    CITIZEN = "CITIZEN"
    BULK_GENERATOR = "BULK_GENERATOR"
    WASTE_WORKER = "WASTE_WORKER"
    SUPER_ADMIN = "SUPER_ADMIN"


class UserBase(BaseModel):
    email: EmailStr
    full_name: str | None = None
    role: UserRole = UserRole.CITIZEN


class UserCreate(UserBase):
    password: str


class UserRead(UserBase):
    id: int
    is_active: bool

    class Config:
        from_attributes = True  # SQLAlchemy -> Pydantic
