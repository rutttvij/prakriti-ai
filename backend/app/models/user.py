# app/models/user.py

from sqlalchemy import Column, Integer, String, Boolean, Enum, Float
from sqlalchemy.dialects.postgresql import JSONB
import enum

from app.core.database import Base


class UserRole(str, enum.Enum):
    CITIZEN = "CITIZEN"
    BULK_GENERATOR = "BULK_GENERATOR"
    WASTE_WORKER = "WASTE_WORKER"
    SUPER_ADMIN = "SUPER_ADMIN"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)

    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String, nullable=True)

    role = Column(Enum(UserRole, name="userrole"), nullable=False, default=UserRole.CITIZEN)

    is_active = Column(Boolean, nullable=False, default=False)

    government_id = Column(String(12), unique=True, nullable=True)

    pincode = Column(String(6), nullable=True)

    meta = Column(JSONB, nullable=False, server_default="{}")

    pcc_balance = Column(Float, nullable=False, default=0.0)
