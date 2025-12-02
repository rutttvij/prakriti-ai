from datetime import datetime
import enum

from sqlalchemy import (
    Column,
    Integer,
    String,
    Boolean,
    DateTime,
    ForeignKey,
)
from sqlalchemy.orm import relationship

from app.core.database import Base
from app.models.user import User


class BadgeCategory(str, enum.Enum):
    TRAINING = "TRAINING"
    SEGREGATION = "SEGREGATION"
    REPORTING = "REPORTING"
    COMPOSTING = "COMPOSTING"
    CARBON = "CARBON"


class Badge(Base):
    __tablename__ = "badges"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False, unique=True)
    description = Column(String, nullable=True)
    category = Column(String, nullable=False)  # use BadgeCategory in logic
    criteria_key = Column(String, nullable=False)  # e.g. "training_complete_1"
    icon = Column(String, nullable=True)  # path or icon name
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    user_badges = relationship("UserBadge", back_populates="badge")


class UserBadge(Base):
    __tablename__ = "user_badges"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    badge_id = Column(Integer, ForeignKey("badges.id"), nullable=False)
    awarded_at = Column(DateTime, default=datetime.utcnow)

    user = relationship(User, backref="user_badges")
    badge = relationship(Badge, back_populates="user_badges")
