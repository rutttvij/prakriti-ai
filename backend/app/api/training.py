from datetime import datetime
from typing import List

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.api import deps
from app.models.training import TrainingModule, TrainingProgress
from app.schemas.training import (
    TrainingModuleRead,
    TrainingCompleteRequest,
    TrainingProgressRead,
)
from app.models.badge import BadgeCategory
from app.services.badge_service import (
    create_badge_if_missing,
    award_badge_if_not_awarded,
)
from app.services.carbon_service import add_carbon_activity
from app.services.training_service import get_published_module, list_published_modules

router = APIRouter(prefix="/training", tags=["training"])


@router.get("/modules", response_model=List[TrainingModuleRead])
def list_training_modules(
    audience: str | None = Query(default=None),
    db: Session = Depends(get_db),
):
    return list_published_modules(db, audience)


@router.get("/modules/{module_id}", response_model=TrainingModuleRead)
def get_training_module(module_id: int, db: Session = Depends(get_db)):
    module = get_published_module(db, module_id)
    if module is None:
        raise HTTPException(status_code=404, detail="Training module not found")
    return module


@router.post("/{module_id}/complete", response_model=TrainingProgressRead)
def complete_training_module(
    module_id: int,
    body: TrainingCompleteRequest,
    db: Session = Depends(get_db),
    current_user=Depends(deps.get_current_user),
):
    module = db.query(TrainingModule).filter(TrainingModule.id == module_id).first()
    if module is None:
        raise HTTPException(status_code=404, detail="Training module not found")

    progress = (
        db.query(TrainingProgress)
        .filter(
            TrainingProgress.user_id == current_user.id,
            TrainingProgress.module_id == module.id,
        )
        .first()
    )

    now = datetime.utcnow()
    score = body.score if body.score is not None else 100.0

    if progress is None:
        progress = TrainingProgress(
            user_id=current_user.id,
            module_id=module.id,
            completed=True,
            score=score,
            completed_at=now,
        )
        db.add(progress)
    else:
        progress.completed = True
        progress.score = score
        progress.completed_at = now

    db.commit()
    db.refresh(progress)

    _handle_training_completion_effects(db, current_user.id, module.id, score)

    return progress


@router.get("/progress/me", response_model=List[TrainingProgressRead])
def get_my_training_progress(
    db: Session = Depends(get_db),
    current_user=Depends(deps.get_current_user),
):
    items = (
        db.query(TrainingProgress)
        .filter(TrainingProgress.user_id == current_user.id)
        .all()
    )
    return items


def _handle_training_completion_effects(
    db: Session,
    user_id: int,
    module_id: int,
    score: float,
) -> None:
    criteria_key = f"training_module_{module_id}_completed"
    create_badge_if_missing(
        db=db,
        name="Training Champion",
        criteria_key=criteria_key,
        category=BadgeCategory.TRAINING,
        description="Completed a mandatory training module",
        icon="badge_training_completed",
    )
    award_badge_if_not_awarded(
        db=db,
        user_id=user_id,
        criteria_key=criteria_key,
    )

    co2e_kg = 0.5 * (score / 100.0)
    add_carbon_activity(
        db=db,
        user_id=user_id,
        activity_type="TRAINING_COMPLETED",
        co2e_kg=co2e_kg,
        reference_id=module_id,
        description=f"Completed training module {module_id} with score {score}",
    )
