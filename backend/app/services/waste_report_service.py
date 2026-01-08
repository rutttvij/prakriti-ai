from datetime import datetime, timezone
from typing import Optional, List

from sqlalchemy.orm import Session

from app.models.waste_report import WasteReport, WasteReportStatus
from app.models.user import User, UserRole
from app.models.badge import BadgeCategory
from app.services.badge_service import (
    create_badge_if_missing,
    award_badge_if_not_awarded,
)
from app.services.carbon_service import add_carbon_activity


def _now_utc() -> datetime:
    return datetime.now(timezone.utc)


def _build_report_public_id(
    db: Session,
    *,
    reporter: User,
) -> str:
    count = db.query(WasteReport).filter(WasteReport.reporter_id == reporter.id).count()
    next_seq = count + 1

    prefix_map = {
        UserRole.CITIZEN: "CIT",
        UserRole.BULK_GENERATOR: "BULK",
        UserRole.WASTE_WORKER: "WW",
        UserRole.SUPER_ADMIN: "ADM",
    }
    prefix = prefix_map.get(reporter.role, "USR")

    return f"{prefix}-{reporter.id}-{str(next_seq).zfill(6)}"


def create_waste_report(
    db: Session,
    *,
    reporter_id: int,
    image_path: Optional[str],
    description: Optional[str],
    latitude: Optional[float],
    longitude: Optional[float],
    classification_label: Optional[str] = None,
    classification_confidence: Optional[float] = None,
    classification_recyclable: Optional[bool] = None,
    household_id: Optional[int] = None,
) -> WasteReport:
    reporter = db.query(User).filter(User.id == reporter_id).first()
    if reporter is None:
        raise ValueError("Reporter user not found")

    public_id = _build_report_public_id(db, reporter=reporter)
    now = _now_utc()

    report = WasteReport(
        reporter_id=reporter_id,
        public_id=public_id,
        image_path=image_path,
        description=description,
        latitude=latitude,
        longitude=longitude,
        classification_label=classification_label,
        classification_confidence=classification_confidence,
        classification_recyclable=classification_recyclable,
        status=WasteReportStatus.OPEN.value,
        created_at=now,
        updated_at=now,
        household_id=household_id,
    )
    db.add(report)
    db.commit()
    db.refresh(report)

    _handle_reporting_badges_on_create(db, reporter_id)

    return report


def _handle_reporting_badges_on_create(db: Session, reporter_id: int) -> None:
    from app.models.badge import UserBadge, Badge  # noqa: F401

    count = db.query(WasteReport).filter(WasteReport.reporter_id == reporter_id).count()
    if count < 1:
        return

    criteria_key = "first_waste_report"
    create_badge_if_missing(
        db=db,
        name="Active Reporter",
        criteria_key=criteria_key,
        category=BadgeCategory.REPORTING,
        description="Submitted at least one waste report",
        icon="badge_reporting_active",
    )
    award_badge_if_not_awarded(db=db, user_id=reporter_id, criteria_key=criteria_key)


def update_report_status(
    db: Session,
    *,
    report_id: int,
    new_status: WasteReportStatus,
    assigned_worker_id: Optional[int] = None,
) -> WasteReport:
    report = db.query(WasteReport).filter(WasteReport.id == report_id).first()
    if report is None:
        raise ValueError("Report not found")

    report.status = new_status.value
    report.updated_at = _now_utc()

    if assigned_worker_id is not None:
        report.assigned_worker_id = assigned_worker_id

    if new_status == WasteReportStatus.RESOLVED:
        report.resolved_at = _now_utc()
        _handle_resolution_rewards(db, report)

    db.commit()
    db.refresh(report)
    return report


def _handle_resolution_rewards(db: Session, report: WasteReport) -> None:
    co2e_worker = 0.2
    co2e_reporter = 0.1

    human_id = report.public_id or str(report.id)

    if report.assigned_worker_id:
        add_carbon_activity(
            db=db,
            user_id=report.assigned_worker_id,
            activity_type="WASTE_REPORT_RESOLVED",
            co2e_kg=co2e_worker,
            reference_id=report.id,
            description=f"Resolved waste report {human_id}",
        )

    add_carbon_activity(
        db=db,
        user_id=report.reporter_id,
        activity_type="WASTE_REPORT_RESOLVED",
        co2e_kg=co2e_reporter,
        reference_id=report.id,
        description=f"Report {human_id} resolved",
    )
