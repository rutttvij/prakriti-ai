from datetime import datetime
from typing import Optional, List

from pydantic import BaseModel


class TrainingModuleBase(BaseModel):
    title: str
    description: Optional[str] = None
    content_type: str  # "VIDEO", "ARTICLE", etc.
    content_url: Optional[str] = None
    order_index: int = 0
    is_active: bool = True


class TrainingModuleCreate(TrainingModuleBase):
    pass


class TrainingModuleUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    content_type: Optional[str] = None
    content_url: Optional[str] = None
    order_index: Optional[int] = None
    is_active: Optional[bool] = None


class TrainingModuleRead(TrainingModuleBase):
    id: int

    class Config:
        from_attributes = True


class TrainingCompleteRequest(BaseModel):
    score: Optional[float] = None


class TrainingProgressRead(BaseModel):
    id: int
    module_id: int
    user_id: int
    completed: bool
    score: Optional[float] = None
    completed_at: Optional[datetime] = None

    class Config:
        from_attributes = True
