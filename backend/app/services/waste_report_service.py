from datetime import datetime
from typing import Optional, List

from sqlalchemy.orm import Session

from app.models.waste_report import WasteReport, WasteReportStatus
from app.models.user import User
from app.models.badge import BadgeCategory
from app.services.badge_service import (
    create_badge_if_missing,
    award_badge_if_not_awarded,
)
from app.services.carbon_service import add_carbon_activity


def create_waste_report(
    db: Session,
    *,
    reporter_id: int,
    image_path: Optional[str],
    description: Optional[str],
    latitude: Optional[float],
    longitude: Optional[float],
) -> WasteReport:
    report = WasteReport(
        reporter_id=reporter_id,
        image_path=image_path,
        description=description,
        latitude=latitude,
        longitude=longitude,
        status=WasteReportStatus.OPEN.value,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )
    db.add(report)
    db.commit()
    db.refresh(report)

    # Optionally: award a "First Reporter" badge on first report
    _handle_reporting_badges_on_create(db, reporter_id)

    return report


def _handle_reporting_badges_on_create(db: Session, reporter_id: int) -> None:
    from app.models.badge import UserBadge, Badge

    # simple: if user has at least 1 report, award "Active Reporter"
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
    award_badge_if_not_awarded(
        db=db,
        user_id=reporter_id,
        criteria_key=criteria_key,
    )


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
    report.updated_at = datetime.utcnow()

    if assigned_worker_id is not None:
        report.assigned_worker_id = assigned_worker_id

    # If resolved, award carbon credits to the worker and/or reporter
    if new_status == WasteReportStatus.RESOLVED:
        report.resolved_at = datetime.utcnow()
        _handle_resolution_rewards(db, report)

    db.commit()
    db.refresh(report)
    return report


def _handle_resolution_rewards(db: Session, report: WasteReport) -> None:
    """
    On resolution:
    - Give small CO2e credit to assigned worker
    - Give small CO2e credit to reporter
    """
    co2e_worker = 0.2
    co2e_reporter = 0.1

    if report.assigned_worker_id:
        add_carbon_activity(
            db=db,
            user_id=report.assigned_worker_id,
            activity_type="WASTE_REPORT_RESOLVED",
            co2e_kg=co2e_worker,
            reference_id=report.id,
            description=f"Resolved waste report {report.id}",
        )

    add_carbon_activity(
        db=db,
        user_id=report.reporter_id,
        activity_type="WASTE_REPORT_RESOLVED",
        co2e_kg=co2e_reporter,
        reference_id=report.id,
        description=f"Report {report.id} resolved",
    )

    # Carbon engine will mint PCC tokens accordingly.
