# app/schemas/user.py

from enum import Enum
from typing import Dict, Optional

from pydantic import BaseModel, EmailStr, Field, constr


class UserRole(str, Enum):
    CITIZEN = "CITIZEN"
    BULK_GENERATOR = "BULK_GENERATOR"
    WASTE_WORKER = "WASTE_WORKER"
    SUPER_ADMIN = "SUPER_ADMIN"


# -----------------------------
# INPUT MODEL → For Registration
# -----------------------------
class UserCreate(BaseModel):
    email: EmailStr
    full_name: Optional[str] = None
    role: UserRole = UserRole.CITIZEN

    # Government ID → exactly 12 digits
    government_id: constr(
        min_length=12,
        max_length=12,
        pattern=r"^\d{12}$",
    )  # type: ignore

    # Pincode → exactly 6 digits
    pincode: constr(
        min_length=6,
        max_length=6,
        pattern=r"^\d{6}$",
    )  # type: ignore

    # Role-specific data
    meta: Dict[str, str] = Field(default_factory=dict)

    password: str


# -----------------------------
# OUTPUT MODEL → For API return
# -----------------------------
class UserRead(BaseModel):
    id: int
    email: EmailStr
    full_name: Optional[str] = None
    role: UserRole = UserRole.CITIZEN
    is_active: bool

    # Optional for older DB rows
    government_id: Optional[str] = None
    pincode: Optional[str] = None

    meta: Dict[str, str] = Field(default_factory=dict)

    class Config:
        from_attributes = True  # SQLAlchemy ORM → Pydantic


# -----------------------------
# UPDATE MODEL → For profile edit
# -----------------------------
class UserProfileUpdate(BaseModel):
    """
    Fields the user is allowed to edit from the profile modal.

    - full_name / pincode are real columns on User
    - phone / city / address / ward are stored inside User.meta
    """

    full_name: Optional[str] = None
    pincode: Optional[str] = None

    phone: Optional[str] = None
    city: Optional[str] = None
    address: Optional[str] = None
    ward: Optional[str] = None  # or ward_area etc.

    class Config:
        from_attributes = True
