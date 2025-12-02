from datetime import datetime
from typing import Optional

from sqlalchemy.orm import Session

from app.models.badge import Badge, UserBadge, BadgeCategory


def create_badge_if_missing(
    db: Session,
    name: str,
    criteria_key: str,
    category: BadgeCategory,
    description: Optional[str] = None,
    icon: Optional[str] = None,
) -> Badge:
    badge = db.query(Badge).filter(Badge.criteria_key == criteria_key).first()
    if badge is None:
        badge = Badge(
            name=name,
            description=description,
            category=category.value,
            criteria_key=criteria_key,
            icon=icon,
            is_active=True,
            created_at=datetime.utcnow(),
        )
        db.add(badge)
        db.commit()
        db.refresh(badge)
    return badge


def award_badge_if_not_awarded(
    db: Session,
    user_id: int,
    criteria_key: str,
) -> Optional[UserBadge]:
    """
    Awards the badge defined by criteria_key to the user if not already awarded.
    Returns the UserBadge if newly created, else None.
    """
    badge = db.query(Badge).filter(Badge.criteria_key == criteria_key).first()
    if badge is None:
        # If badge definition is missing, nothing to do.
        return None

    existing = (
        db.query(UserBadge)
        .filter(
            UserBadge.user_id == user_id,
            UserBadge.badge_id == badge.id,
        )
        .first()
    )
    if existing:
        return None

    user_badge = UserBadge(
        user_id=user_id,
        badge_id=badge.id,
        awarded_at=datetime.utcnow(),
    )
    db.add(user_badge)
    db.commit()
    db.refresh(user_badge)
    return user_badge
