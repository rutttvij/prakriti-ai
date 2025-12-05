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

    # Approval / activation flag
    is_active = Column(Boolean, nullable=False, default=False)

    # 12-digit government identifier, unique across all users
    government_id = Column(String(12), unique=True, nullable=True)

    # 6-digit pincode
    pincode = Column(String(6), nullable=True)

    # Flexible storage for role-specific data
    meta = Column(JSONB, nullable=False, server_default="{}")

    # PCC token balance (total tokens available to the user)
    pcc_balance = Column(Float, nullable=False, default=0.0)
