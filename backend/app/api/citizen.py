from datetime import date, datetime, timezone
from typing import Any, Dict, Literal

from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.api import deps

from app.models.waste_report import WasteReport, WasteReportStatus
from app.models.household import SegregationLog
from app.models.carbon import CarbonActivity

router = APIRouter(prefix="/citizen", tags=["citizen"])


def _utc_today() -> date:
    # Your system uses UTC-aware timestamps; use UTC day boundary for consistency.
    # If you want India-local day boundary, we can switch later.
    return datetime.now(timezone.utc).date()


def _safe_float(x) -> float:
    try:
        return float(x or 0)
    except Exception:
        return 0.0


@router.get("/summary")
def get_citizen_summary(
    db: Session = Depends(get_db),
    current_user=Depends(deps.get_current_user),
) -> Dict[str, Any]:
    """
    Unified citizen dashboard summary.
    Frontend expects:
    {
      training: { completed_modules, total_modules, badges_earned, next_module_title },
      segregation: { today_status, today_score, streak_days },
      reports: { total, pending, resolved },
      carbon: { co2_saved_kg, pcc_tokens }
    }
    """
    user_id = current_user.id
    today = _utc_today()

    # -------------------------
    # REPORT METRICS (accurate)
    # -------------------------
    total_reports = (
        db.query(WasteReport)
        .filter(WasteReport.reporter_id == user_id)
        .count()
    )

    pending_reports = (
        db.query(WasteReport)
        .filter(
            WasteReport.reporter_id == user_id,
            WasteReport.status.in_(
                [
                    WasteReportStatus.OPEN.value,
                    WasteReportStatus.IN_PROGRESS.value,
                ]
            ),
        )
        .count()
    )

    resolved_reports = (
        db.query(WasteReport)
        .filter(
            WasteReport.reporter_id == user_id,
            WasteReport.status == WasteReportStatus.RESOLVED.value,
        )
        .count()
    )

    # -------------------------
    # SEGREGATION TODAY + STREAK (accurate)
    # -------------------------
    today_log = (
        db.query(SegregationLog)
        .filter(
            SegregationLog.citizen_id == user_id,
            SegregationLog.log_date == today,
        )
        .order_by(SegregationLog.created_at.desc())
        .first()
    )

    today_score = int(today_log.segregation_score) if today_log else None
    today_status: Literal["DONE", "PENDING", "MISSED", "UNKNOWN"] = (
        "DONE" if today_log else "PENDING"
    )

    recent_dates = (
        db.query(SegregationLog.log_date)
        .filter(SegregationLog.citizen_id == user_id)
        .distinct()
        .order_by(SegregationLog.log_date.desc())
        .limit(90)
        .all()
    )
    recent_dates = [d[0] for d in recent_dates if d and d[0] is not None]
    date_set = set(recent_dates)

    streak_days = 0
    cursor = today
    while cursor in date_set:
        streak_days += 1
        cursor = date.fromordinal(cursor.toordinal() - 1)

    # -------------------------
    # CARBON + PCC TOKENS (fully accurate)
    # -------------------------
    # Source of truth: CarbonActivity
    co2_saved_kg = _safe_float(
        db.query(func.coalesce(func.sum(CarbonActivity.carbon_kg), 0))
        .filter(CarbonActivity.user_id == user_id)
        .scalar()
    )

    pcc_tokens_from_carbon = _safe_float(
        db.query(func.coalesce(func.sum(CarbonActivity.pcc_tokens), 0))
        .filter(CarbonActivity.user_id == user_id)
        .scalar()
    )

    # Fallback: tokens recorded on segregation logs (if CarbonActivity not populated yet)
    pcc_tokens_from_segregation = _safe_float(
        db.query(func.coalesce(func.sum(SegregationLog.awarded_pcc_tokens), 0))
        .filter(
            SegregationLog.citizen_id == user_id,
            SegregationLog.pcc_awarded.is_(True),
        )
        .scalar()
    )

    pcc_tokens_total = (
        pcc_tokens_from_carbon
        if pcc_tokens_from_carbon > 0
        else pcc_tokens_from_segregation
    )

    # -------------------------
    # TRAINING (stable contract; wire later)
    # -------------------------
    training = {
        "completed_modules": 0,
        "total_modules": 0,
        "badges_earned": 0,
        "next_module_title": None,
    }

    return {
        "training": training,
        "segregation": {
            "today_status": today_status,
            "today_score": today_score,
            "streak_days": streak_days,
        },
        "reports": {
            "total": total_reports,
            "pending": pending_reports,
            "resolved": resolved_reports,
        },
        "carbon": {
            "co2_saved_kg": round(co2_saved_kg, 4),
            "pcc_tokens": round(pcc_tokens_total, 4),
        },
    }
