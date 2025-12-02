from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.api import deps
from app.models.training import TrainingModule, TrainingProgress
from app.models.user import User
from app.models.badge import BadgeCategory
from app.services.badge_service import (
    create_badge_if_missing,
    award_badge_if_not_awarded,
)
from app.services.carbon_service import add_carbon_activity
from app.schemas.user import UserRead  # reuse if needed


router = APIRouter(prefix="/training", tags=["training"])


# ----------- Schemas (local to this file for now) -----------

from pydantic import BaseModel


class TrainingModuleRead(BaseModel):
    id: int
    title: str
    description: Optional[str] = None
    content_type: str
    content_url: Optional[str] = None
    order_index: int

    class Config:
        from_attributes = True


class TrainingProgressRead(BaseModel):
    module: TrainingModuleRead
    completed: bool
    score: Optional[int] = None
    completed_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class TrainingCompleteRequest(BaseModel):
    score: Optional[int] = None


# endpoints

@router.get("/modules", response_model=list[TrainingModuleRead])
def list_modules(
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_user),
):
    modules = (
        db.query(TrainingModule)
        .filter(TrainingModule.is_active.is_(True))
        .order_by(TrainingModule.order_index.asc())
        .all()
    )
    return modules


@router.post(
    "/{module_id}/complete",
    response_model=TrainingProgressRead,
)
def complete_module(
    module_id: int,
    body: TrainingCompleteRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_user),
):
    module = db.query(TrainingModule).filter(TrainingModule.id == module_id).first()
    if module is None:
        raise HTTPException(status_code=404, detail="Training module not found")

    progress = (
        db.query(TrainingProgress)
        .filter(
            TrainingProgress.user_id == current_user.id,
            TrainingProgress.module_id == module_id,
        )
        .first()
    )
    is_first_completion = False

    if progress is None:
        progress = TrainingProgress(
            user_id=current_user.id,
            module_id=module_id,
        )
        db.add(progress)
        is_first_completion = True

    progress.completed = True
    progress.score = body.score
    progress.completed_at = datetime.utcnow()
    progress.last_viewed_at = datetime.utcnow()

    db.commit()
    db.refresh(progress)
    db.refresh(module)

    # ---- Badge integration ----
    # Ensure a default "Training Beginner" badge exists & award on first completion.
    criteria_key = "training_first_completion"
    create_badge_if_missing(
        db=db,
        name="Training Beginner",
        criteria_key=criteria_key,
        category=BadgeCategory.TRAINING,
        description="Completed first training module",
        icon="badge_training_beginner",
    )
    if is_first_completion:
        award_badge_if_not_awarded(
            db=db,
            user_id=current_user.id,
            criteria_key=criteria_key,
        )

    # ---- Carbon + PCC integration ----
    # Example: reward 0.1 kg CO2e credit for each module completion
    add_carbon_activity(
        db=db,
        user_id=current_user.id,
        activity_type="TRAINING_COMPLETED",
        co2e_kg=0.1,
        reference_id=module_id,
        description=f"Completed training module {module.title}",
    )

    return TrainingProgressRead(
        module=module,
        completed=progress.completed,
        score=progress.score,
        completed_at=progress.completed_at,
    )
