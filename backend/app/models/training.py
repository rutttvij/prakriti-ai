from datetime import datetime
import enum

from sqlalchemy import (
    Column,
    Integer,
    String,
    Text,
    Boolean,
    DateTime,
    ForeignKey,
    Enum,
)
from sqlalchemy.orm import relationship

from app.core.database import Base
from app.models.user import User


class TrainingAudience(str, enum.Enum):
    citizen = "citizen"
    bulk_generator = "bulk_generator"


class TrainingDifficulty(str, enum.Enum):
    beginner = "beginner"
    intermediate = "intermediate"
    advanced = "advanced"


class LessonType(str, enum.Enum):
    video = "video"
    article = "article"
    pdf = "pdf"
    quiz = "quiz"
    link = "link"


class TrainingModule(Base):
    __tablename__ = "training_modules"

    id = Column(Integer, primary_key=True, index=True)

    title = Column(String, nullable=False)

    # Legacy fields retained for compatibility
    description = Column(Text, nullable=True)
    content_type = Column(String, nullable=False, default="video")
    content_url = Column(String, nullable=True)
    order_index = Column(Integer, nullable=False, default=0)
    is_active = Column(Boolean, default=True)

    # New CMS fields
    audience = Column(
        Enum(TrainingAudience, name="training_audience", native_enum=False),
        nullable=False,
        default=TrainingAudience.citizen,
        index=True,
    )
    summary = Column(Text, nullable=True)
    difficulty = Column(
        Enum(TrainingDifficulty, name="training_difficulty", native_enum=False),
        nullable=False,
        default=TrainingDifficulty.beginner,
        index=True,
    )
    est_minutes = Column(Integer, nullable=False, default=10)
    cover_image_url = Column(String(600), nullable=True)
    is_published = Column(Boolean, nullable=False, default=False, index=True)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    progresses = relationship("TrainingProgress", back_populates="module")
    lessons = relationship(
        "TrainingLesson",
        back_populates="module",
        cascade="all, delete-orphan",
        order_by="TrainingLesson.order_index.asc()",
    )


class TrainingLesson(Base):
    __tablename__ = "training_lessons"

    id = Column(Integer, primary_key=True, index=True)
    module_id = Column(Integer, ForeignKey("training_modules.id", ondelete="CASCADE"), nullable=False, index=True)
    order_index = Column(Integer, nullable=False, default=0)
    lesson_type = Column(
        Enum(LessonType, name="training_lesson_type", native_enum=False),
        nullable=False,
        default=LessonType.article,
    )
    title = Column(String(255), nullable=False)
    content = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    module = relationship("TrainingModule", back_populates="lessons")


class TrainingProgress(Base):
    __tablename__ = "training_progress"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    module_id = Column(Integer, ForeignKey("training_modules.id"), nullable=False)
    completed = Column(Boolean, default=False)
    score = Column(Integer, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    last_viewed_at = Column(DateTime, default=datetime.utcnow)

    user = relationship(User, backref="training_progress")
    module = relationship(TrainingModule, back_populates="progresses")
