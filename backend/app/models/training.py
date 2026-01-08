from datetime import datetime

from sqlalchemy import (
    Column,
    Integer,
    String,
    Text,
    Boolean,
    DateTime,
    ForeignKey,
)
from sqlalchemy.orm import relationship

from app.core.database import Base
from app.models.user import User


class TrainingModule(Base):
    __tablename__ = "training_modules"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    content_type = Column(String, nullable=False, default="video")  # video/text
    content_url = Column(String, nullable=True)  # video url or doc link
    order_index = Column(Integer, nullable=False, default=0)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    progresses = relationship("TrainingProgress", back_populates="module")


class TrainingProgress(Base):
    __tablename__ = "training_progress"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    module_id = Column(Integer, ForeignKey("training_modules.id"), nullable=False)
    completed = Column(Boolean, default=False)
    score = Column(Integer, nullable=True)  # quiz score
    completed_at = Column(DateTime, nullable=True)
    last_viewed_at = Column(DateTime, default=datetime.utcnow)

    user = relationship(User, backref="training_progress")
    module = relationship(TrainingModule, back_populates="progresses")
