from sqlalchemy import Column, Integer, String, Boolean, Enum
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
    role = Column(Enum(UserRole), nullable=False, default=UserRole.CITIZEN)
    is_active = Column(Boolean, default=True)
