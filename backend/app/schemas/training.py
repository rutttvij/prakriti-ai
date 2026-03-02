from datetime import datetime
from typing import Optional, List

from pydantic import BaseModel, Field


class TrainingLessonPublicRead(BaseModel):
    id: int
    order_index: int
    lesson_type: str
    title: str
    content: str

    class Config:
        from_attributes = True


class TrainingModuleRead(BaseModel):
    id: int
    title: str
    description: Optional[str] = None
    content_type: str
    content_url: Optional[str] = None
    order_index: int = 0
    is_active: bool = True

    audience: Optional[str] = None
    summary: Optional[str] = None
    difficulty: Optional[str] = None
    est_minutes: Optional[int] = None
    cover_image_url: Optional[str] = None
    is_published: bool = False
    lessons: List[TrainingLessonPublicRead] = []

    class Config:
        from_attributes = True


class TrainingCompleteRequest(BaseModel):
    score: Optional[float] = None


class TrainingBadgeItemRead(BaseModel):
    code: str
    name: str
    description: Optional[str] = None
    category: str
    awarded_at: Optional[datetime] = None
    metadata: dict = Field(default_factory=dict)


class TrainingProgressRead(BaseModel):
    id: int
    module_id: int
    user_id: int
    completed: bool
    score: Optional[float] = None
    completed_at: Optional[datetime] = None
    newly_unlocked_badges: List[TrainingBadgeItemRead] = Field(default_factory=list)

    class Config:
        from_attributes = True
