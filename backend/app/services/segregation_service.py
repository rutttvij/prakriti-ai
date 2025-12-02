from datetime import datetime, date, timedelta
from typing import Optional

from sqlalchemy.orm import Session

from app.models.household import Household, SegregationLog
from app.models.badge import BadgeCategory
from app.services.badge_service import (
    create_badge_if_missing,
    award_badge_if_not_awarded,
)
from app.services.carbon_service import add_carbon_activity


def calculate_segregation_score(
    wet_correct: bool,
    dry_correct: bool,
    reject_correct: bool,
    hazardous_present: bool,
) -> int:
    """
    Very simple scoring for now:
    - Each correct stream: +30
    - All three correct: +10 bonus
    - Hazardous present but other streams correct: small penalty
    """
    score = 0
    if wet_correct:
        score += 30
    if dry_correct:
        score += 30
    if reject_correct:
        score += 30

    if wet_correct and dry_correct and reject_correct:
        score += 10  # bonus

    if hazardous_present and score > 0:
        score -= 10

    # clamp between 0 and 100
    return max(0, min(100, score))


def _get_or_create_household(
    db: Session,
    name: str,
    owner_user_id: Optional[int] = None,
) -> Household:
    household = (
        db.query(Household)
        .filter(Household.name == name, Household.owner_user_id == owner_user_id)
        .first()
    )
    if household is None:
        household = Household(
            name=name,
            owner_user_id=owner_user_id,
            created_at=datetime.utcnow(),
        )
        db.add(household)
        db.commit()
        db.refresh(household)
    return household


def log_segregation(
    db: Session,
    *,
    household_id: int,
    worker_id: Optional[int],
    wet_correct: bool,
    dry_correct: bool,
    reject_correct: bool,
    hazardous_present: bool,
    notes: Optional[str] = None,
) -> SegregationLog:
    score = calculate_segregation_score(
        wet_correct=wet_correct,
        dry_correct=dry_correct,
        reject_correct=reject_correct,
        hazardous_present=hazardous_present,
    )

    log = SegregationLog(
        household_id=household_id,
        worker_id=worker_id,
        log_date=datetime.utcnow(),
        segregation_score=score,
        wet_correct=wet_correct,
        dry_correct=dry_correct,
        reject_correct=reject_correct,
        hazardous_present=hazardous_present,
        notes=notes,
    )
    db.add(log)
    db.commit()
    db.refresh(log)

    # ---- Carbon + PCC integration ----
    # Example: convert score to CO2e savings: 0.5 kg at 100 score, scaled linearly.
    co2e_kg = 0.5 * (score / 100.0)
    if co2e_kg > 0:
        add_carbon_activity(
            db=db,
            user_id=worker_id or household_id,  # simplified; later map better
            activity_type="SEGREGATION_LOG",
            co2e_kg=co2e_kg,
            reference_id=log.id,
            description=f"Segregation log for household {household_id}",
        )

    # ---- Badge integration (simple streak-based) ----
    _handle_segregation_badges(db, household_id=household_id)

    return log


def _handle_segregation_badges(db: Session, household_id: int) -> None:
    """
    For now:
    - If household has 7 logs in last 7 days with score >= 80 => award 'Segregation Star'
    """
    seven_days_ago = datetime.utcnow() - timedelta(days=7)

    logs = (
        db.query(SegregationLog)
        .filter(
            SegregationLog.household_id == household_id,
            SegregationLog.log_date >= seven_days_ago,
            SegregationLog.segregation_score >= 80,
        )
        .all()
    )
    if len(logs) < 7:
        return

    # Ensure badge exists
    criteria_key = f"segregation_streak_7_household_{household_id}"
    create_badge_if_missing(
        db=db,
        name="Segregation Star (7-day streak)",
        criteria_key=criteria_key,
        category=BadgeCategory.SEGREGATION,
        description="Household maintained good segregation for 7 days",
        icon="badge_segregation_star",
    )

    # For now, award to the household owner (if exists)
    household = db.query(Household).filter(Household.id == household_id).first()
    if household and household.owner_user_id:
        award_badge_if_not_awarded(
            db=db,
            user_id=household.owner_user_id,
            criteria_key=criteria_key,
        )
