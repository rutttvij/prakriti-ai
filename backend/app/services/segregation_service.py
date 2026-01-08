from datetime import datetime, date, timedelta
from typing import Optional, List

from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.models.household import Household, SegregationLog
from app.models.badge import BadgeCategory
from app.services.badge_service import (
    create_badge_if_missing,
    award_badge_if_not_awarded,
)
from app.services.carbon_service import add_carbon_activity


def calculate_segregation_score(
    dry_kg: float,
    wet_kg: float,
    reject_kg: float,
) -> int:
    """
    Very simple scoring based on contamination by weight:

    total = dry + wet + reject
    contamination = reject / total
    score = 100 - contamination * 100 (clamped 0–100)
    """
    total = dry_kg + wet_kg + reject_kg
    if total <= 0:
        return 0

    contamination = reject_kg / total
    score = 100.0 - contamination * 100.0
    score = max(0.0, min(100.0, score))
    return int(round(score))


def log_segregation(
    db: Session,
    *,
    household_id: int,
    worker_id: Optional[int],
    log_date: date,
    dry_kg: float,
    wet_kg: float,
    reject_kg: float,
    notes: Optional[str] = None,
    waste_report_id: Optional[int] = None,
) -> SegregationLog:
    score = calculate_segregation_score(
        dry_kg=dry_kg,
        wet_kg=wet_kg,
        reject_kg=reject_kg,
    )

    citizen_id: Optional[int] = None
    if waste_report_id is not None:
        from app.models.waste_report import WasteReport

        report = db.query(WasteReport).filter(WasteReport.id == waste_report_id).first()
        if report is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Waste report not found",
            )
        citizen_id = report.reporter_id

    log = SegregationLog(
        household_id=household_id,
        worker_id=worker_id,
        log_date=log_date,
        dry_kg=dry_kg,
        wet_kg=wet_kg,
        reject_kg=reject_kg,
        segregation_score=score,
        notes=notes,
        waste_report_id=waste_report_id,
        citizen_id=citizen_id,
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
    seven_days_ago = date.today() - timedelta(days=7)

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


def list_logs_for_worker(db: Session, *, worker_id: int) -> List[SegregationLog]:
    """
    List logs recorded by the given worker, newest first.
    """
    return (
        db.query(SegregationLog)
        .filter(SegregationLog.worker_id == worker_id)
        .order_by(SegregationLog.log_date.desc())
        .all()
    )
