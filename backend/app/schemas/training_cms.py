from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

AudienceType = Literal["citizen", "bulk_generator"]
DifficultyType = Literal["beginner", "intermediate", "advanced"]
LessonType = Literal["video", "article", "pdf", "quiz", "link"]


class TrainingLessonCreate(BaseModel):
    lesson_type: LessonType
    title: str = Field(min_length=2, max_length=255)
    content: str = Field(min_length=1)
    order_index: int = 0


class TrainingLessonUpdate(BaseModel):
    lesson_type: LessonType | None = None
    title: str | None = Field(default=None, min_length=2, max_length=255)
    content: str | None = None
    order_index: int | None = None


class TrainingLessonRead(BaseModel):
    id: int
    module_id: int
    order_index: int
    lesson_type: str
    title: str
    content: str
    created_at: datetime

    class Config:
        from_attributes = True


class TrainingModuleCreate(BaseModel):
    audience: AudienceType
    title: str = Field(min_length=2, max_length=255)
    summary: str | None = Field(default=None, max_length=3000)
    difficulty: DifficultyType = "beginner"
    est_minutes: int = Field(default=10, ge=1, le=600)
    cover_image_url: str | None = Field(default=None, max_length=600)
    is_published: bool = False


class TrainingModuleUpdate(BaseModel):
    audience: AudienceType | None = None
    title: str | None = Field(default=None, min_length=2, max_length=255)
    summary: str | None = Field(default=None, max_length=3000)
    difficulty: DifficultyType | None = None
    est_minutes: int | None = Field(default=None, ge=1, le=600)
    cover_image_url: str | None = Field(default=None, max_length=600)
    is_published: bool | None = None


class TrainingModuleRead(BaseModel):
    id: int
    audience: str
    title: str
    summary: str | None
    difficulty: str
    est_minutes: int
    cover_image_url: str | None
    is_published: bool
    created_at: datetime
    updated_at: datetime
    lessons: list[TrainingLessonRead] = []

    class Config:
        from_attributes = True


class TrainingModuleListItem(BaseModel):
    id: int
    audience: str
    title: str
    summary: str | None
    difficulty: str
    est_minutes: int
    cover_image_url: str | None
    is_published: bool
    lessons_count: int
    created_at: datetime
    updated_at: datetime


class TrainingModuleListResponse(BaseModel):
    items: list[TrainingModuleListItem]
    total: int
    page: int
    page_size: int


class LessonReorderRequest(BaseModel):
    lesson_ids: list[int]
