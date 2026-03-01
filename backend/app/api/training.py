from datetime import datetime, UTC
from typing import List

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.api import deps
from app.models.training import TrainingModule, TrainingProgress
from app.models.badge import Badge, UserBadge
from app.models.notification import Notification
from app.models.user import UserRole
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


def _get_or_create_badge(
    db: Session,
    *,
    code: str,
    name: str,
    description: str,
    criteria_key: str,
) -> Badge:
    badge = db.query(Badge).filter(Badge.code == code).first()
    if badge is None:
        badge = db.query(Badge).filter(Badge.criteria_key == criteria_key).first()
    if badge is None:
        badge = Badge(
            code=code,
            name=name,
            description=description,
            category="TRAINING",
            criteria_key=criteria_key,
            is_active=True,
            active=True,
            created_at=datetime.now(UTC).replace(tzinfo=None),
        )
        db.add(badge)
        db.flush()
    return badge


def _award_badge_once(db: Session, *, user_id: int, badge: Badge) -> bool:
    exists = (
        db.query(UserBadge)
        .filter(UserBadge.user_id == user_id, UserBadge.badge_id == badge.id)
        .first()
    )
    if exists:
        return False
    db.add(UserBadge(user_id=user_id, badge_id=badge.id, awarded_at=datetime.now(UTC).replace(tzinfo=None)))
    return True


@router.get("/modules", response_model=List[TrainingModuleRead])
def list_training_modules(
    audience: str | None = Query(default=None),
    db: Session = Depends(get_db),
):
    return list_published_modules(db, audience)


@router.get("/citizen", response_model=List[TrainingModuleRead])
def list_citizen_training_modules(
    db: Session = Depends(get_db),
    current_user=Depends(deps.require_citizen),
):
    return list_published_modules(db, "citizen")


@router.get("/modules/{module_id}", response_model=TrainingModuleRead)
def get_training_module(module_id: int, db: Session = Depends(get_db)):
    module = get_published_module(db, module_id)
    if module is None:
        raise HTTPException(status_code=404, detail="Training module not found")
    return module


@router.post("/{module_id}/complete", response_model=TrainingProgressRead)
def complete_training_module(
    module_id: int,
    body: TrainingCompleteRequest | None = None,
    db: Session = Depends(get_db),
    current_user=Depends(
        deps.require_roles(
            UserRole.CITIZEN,
            UserRole.BULK_GENERATOR,
            UserRole.BULK_MANAGER,
            UserRole.BULK_STAFF,
        )
    ),
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
    score = body.score if body and body.score is not None else 100.0

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

    db.flush()
    _handle_training_completion_effects(db, current_user.id, module.id, score)
    db.commit()
    db.refresh(progress)

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

    first_badge = _get_or_create_badge(
        db,
        code="GREEN_STARTER",
        name="Green Starter",
        description="Completed your first citizen training module.",
        criteria_key="citizen_training_first_module",
    )
    all_badge = _get_or_create_badge(
        db,
        code="CERTIFIED_CITIZEN",
        name="Certified Citizen",
        description="Completed all published citizen training modules.",
        criteria_key="citizen_training_all_modules",
    )

    completed_count = (
        db.query(TrainingProgress)
        .join(TrainingModule, TrainingModule.id == TrainingProgress.module_id)
        .filter(
            TrainingProgress.user_id == user_id,
            TrainingProgress.completed.is_(True),
            TrainingModule.audience == "citizen",
            TrainingModule.is_published.is_(True),
        )
        .count()
    )
    total_count = (
        db.query(TrainingModule)
        .filter(TrainingModule.audience == "citizen", TrainingModule.is_published.is_(True))
        .count()
    )

    if completed_count >= 1 and _award_badge_once(db, user_id=user_id, badge=first_badge):
        db.add(
            Notification(
                user_id=user_id,
                title="Badge Unlocked",
                body="You earned GREEN_STARTER for completing your first module.",
                is_read=False,
            )
        )

    if total_count > 0 and completed_count >= total_count and _award_badge_once(db, user_id=user_id, badge=all_badge):
        db.add(
            Notification(
                user_id=user_id,
                title="Badge Unlocked",
                body="You earned CERTIFIED_CITIZEN for completing all citizen modules.",
                is_read=False,
            )
        )
