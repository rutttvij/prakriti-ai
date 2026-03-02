from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Any, Optional

from sqlalchemy import inspect
from sqlalchemy.orm import Session

from app.models.badge import Badge, UserBadge
from app.models.bulk import Verification, WasteLog
from app.models.pcc import CarbonLedger

MIN_QUALITY_LOGS_FOR_BADGE = 10

IMPACT_BADGES = [
    ("impact_10", "Eco Starter", "IMPACT", 10.0),
    ("impact_50", "Green Contributor", "IMPACT", 50.0),
    ("impact_200", "Carbon Warrior", "IMPACT", 200.0),
    ("impact_500", "Climate Champion", "IMPACT", 500.0),
    ("impact_1000", "Earth Guardian", "IMPACT", 1000.0),
]

CONSISTENCY_BADGES = [
    ("streak_7", "Eco Consistent", "CONSISTENCY", 7.0),
    ("streak_30", "Habit Builder", "CONSISTENCY", 30.0),
    ("streak_180", "Sustainability Pro", "CONSISTENCY", 180.0),
]

QUALITY_BADGES = [
    ("quality_95", "Segregation Expert", "QUALITY", 0.95),
    ("quality_85", "Clean Contributor", "QUALITY", 0.85),
]

BULK_WORKFLOW_BADGES = [
    ("bulk_first_verified", "Bulk First Verified", "BULK_WORKFLOW", 1.0),
    ("bulk_segregation_star", "Bulk Segregation Star", "BULK_WORKFLOW", 95.0),
    ("bulk_century_pcc", "Bulk Century PCC", "BULK_WORKFLOW", 100.0),
]

WORKER_PERFORMANCE_BADGES = [
    ("worker_bulk_verifier_1", "Bulk Verifier I", "WORKER_PERFORMANCE", 1.0),
    ("worker_bulk_verifier_25", "Bulk Verifier XXV", "WORKER_PERFORMANCE", 25.0),
    ("worker_bulk_quality_guardian", "Bulk Quality Guardian", "WORKER_PERFORMANCE", 95.0),
]


@dataclass
class ImpactSummary:
    total_carbon_saved_kgco2e: float
    total_pcc_earned: float
    current_streak_days: int
    rolling_30d_quality_score: Optional[float]
    rolling_30d_verified_logs: int


def _utc_now():
    return datetime.now(timezone.utc)


def _has_column(db: Session, table: str, column: str) -> bool:
    try:
        cols = inspect(db.get_bind()).get_columns(table)
        return any(c.get("name") == column for c in cols)
    except Exception:
        return False


def _waste_log_user_col(db: Session):
    return WasteLog.user_id if _has_column(db, "waste_logs", "user_id") else WasteLog.created_by_user_id


def _seed_badges_if_missing(db: Session) -> None:
    defaults = []
    all_badges = IMPACT_BADGES + CONSISTENCY_BADGES + QUALITY_BADGES + BULK_WORKFLOW_BADGES + WORKER_PERFORMANCE_BADGES
    for code, name, cat, threshold in all_badges:
        defaults.append(
            {
                "code": code,
                "name": name,
                "category": cat,
                "threshold": threshold,
                "rule_json": {"kind": cat.lower(), "threshold": threshold},
            }
        )

    for row in defaults:
        exists = db.query(Badge).filter(Badge.code == row["code"]).first()
        if exists:
            continue
        db.add(
            Badge(
                code=row["code"],
                name=row["name"],
                description=f"{row['category']} badge",
                category=row["category"],
                threshold=row["threshold"],
                criteria_key=row["code"],
                rule_json=row["rule_json"],
                active=True,
                is_active=True,
            )
        )
    db.flush()


def _verified_dates(db: Session, user_id: Optional[int], org_id: Optional[int]) -> list[datetime.date]:
    q = db.query(Verification.verified_at).join(WasteLog, WasteLog.id == Verification.waste_log_id)
    user_col = _waste_log_user_col(db)
    if user_id is not None:
        q = q.filter(user_col == user_id)
    if org_id is not None:
        q = q.filter(WasteLog.org_id == org_id)
    rows = q.order_by(Verification.verified_at.asc()).all()
    return sorted({r[0].date() for r in rows if r and r[0] is not None})


def compute_streak_days(dates: list[datetime.date]) -> int:
    if not dates:
        return 0
    streak = 1
    for i in range(len(dates) - 1, 0, -1):
        if (dates[i] - dates[i - 1]).days == 1:
            streak += 1
        else:
            break
    return streak


def rolling_quality_stats(
    db: Session, user_id: Optional[int], org_id: Optional[int], days: int = 30
) -> tuple[Optional[float], int]:
    since = _utc_now() - timedelta(days=days)
    q = db.query(Verification.quality_score).join(WasteLog, WasteLog.id == Verification.waste_log_id)
    user_col = _waste_log_user_col(db)
    if user_id is not None:
        q = q.filter(user_col == user_id)
    if org_id is not None:
        q = q.filter(WasteLog.org_id == org_id)
    q = q.filter(Verification.verified_at >= since)
    rows = [float(r[0]) for r in q.all() if r and r[0] is not None]
    if not rows:
        return None, 0
    return sum(rows) / len(rows), len(rows)


def build_impact_summary(db: Session, user_id: Optional[int], org_id: Optional[int]) -> ImpactSummary:
    q = db.query(CarbonLedger)
    if user_id is not None:
        q = q.filter(CarbonLedger.user_id == user_id)
    if org_id is not None:
        q = q.filter(CarbonLedger.org_id == org_id)
    entries = q.all()

    carbon = sum(float(x.carbon_saved_kgco2e or 0.0) for x in entries)
    pcc = sum(float(x.pcc_awarded or 0.0) for x in entries)
    dates = _verified_dates(db, user_id, org_id)
    streak = compute_streak_days(dates)
    rolling_quality, rolling_count = rolling_quality_stats(db, user_id, org_id)

    return ImpactSummary(
        total_carbon_saved_kgco2e=round(carbon, 6),
        total_pcc_earned=round(pcc, 6),
        current_streak_days=streak,
        rolling_30d_quality_score=round(rolling_quality, 6) if rolling_quality is not None else None,
        rolling_30d_verified_logs=rolling_count,
    )


def _already_awarded(db: Session, badge_id: int, user_id: Optional[int], org_id: Optional[int]) -> bool:
    q = db.query(UserBadge).filter(UserBadge.badge_id == badge_id)
    if user_id is not None:
        q = q.filter(UserBadge.user_id == user_id)
    if org_id is not None and _has_column(db, "user_badges", "org_id"):
        q = q.filter(UserBadge.org_id == org_id)
    return db.query(q.exists()).scalar()


def _award(db: Session, badge: Badge, user_id: Optional[int], org_id: Optional[int], metadata: dict) -> None:
    if user_id is None:
        raise ValueError("user_id is required for badge awarding.")
    payload = {
        "user_id": user_id,
        "badge_id": badge.id,
        "metadata_json": metadata,
    }
    if _has_column(db, "user_badges", "org_id"):
        payload["org_id"] = org_id
    db.add(UserBadge(**payload))


def evaluate_and_award_badges(db: Session, user_id: Optional[int], org_id: Optional[int] = None) -> list[Badge]:
    if user_id is None and org_id is None:
        return []

    _seed_badges_if_missing(db)
    summary = build_impact_summary(db, user_id, org_id)
    by_code = {b.code: b for b in db.query(Badge).filter(Badge.active.is_(True)).all() if b.code}
    newly_awarded: list[Badge] = []

    def maybe_award(code: str, condition: bool, metadata: dict):
        badge = by_code.get(code)
        if not badge:
            return
        if not condition:
            return
        if _already_awarded(db, badge.id, user_id, org_id):
            return
        _award(db, badge, user_id, org_id, metadata)
        newly_awarded.append(badge)

    for code, _, _, threshold in IMPACT_BADGES:
        maybe_award(code, summary.total_carbon_saved_kgco2e >= threshold, {"type": "impact", "threshold": threshold})

    for code, _, _, threshold in CONSISTENCY_BADGES:
        maybe_award(code, summary.current_streak_days >= int(threshold), {"type": "consistency", "threshold": int(threshold)})

    rolling_quality = summary.rolling_30d_quality_score
    if rolling_quality is not None and summary.rolling_30d_verified_logs >= MIN_QUALITY_LOGS_FOR_BADGE:
        for code, _, _, threshold in QUALITY_BADGES:
            maybe_award(
                code,
                rolling_quality >= threshold,
                {"type": "quality", "threshold": threshold, "window_days": 30, "min_logs": MIN_QUALITY_LOGS_FOR_BADGE},
            )

    if newly_awarded:
        db.flush()
    return newly_awarded


def evaluate_bulk_worker_event_badges(
    db: Session,
    *,
    bulk_user_id: int,
    worker_user_id: Optional[int],
    org_id: Optional[int],
    event_type: str,
    event_payload: dict[str, Any],
) -> dict[str, list[Badge]]:
    """
    Event-based badge evaluation for Bulk + Worker workflow.
    Returns newly awarded badges split by target user.
    """
    _seed_badges_if_missing(db)
    by_code = {b.code: b for b in db.query(Badge).filter(Badge.active.is_(True)).all() if b.code}

    bulk_new: list[Badge] = []
    worker_new: list[Badge] = []
    if event_type != "bulk_verification":
        return {"bulk": bulk_new, "worker": worker_new}

    score = float(event_payload.get("score") or 0.0)
    pcc_snapshot = float(event_payload.get("pcc_snapshot") or 0.0)
    waste_log_id = event_payload.get("waste_log_id")
    pickup_request_id = event_payload.get("pickup_request_id")

    def maybe_award(
        *,
        code: str,
        user_id: int,
        collect: list[Badge],
        condition: bool,
        metadata: dict[str, Any],
    ) -> None:
        badge = by_code.get(code)
        if not badge or not condition:
            return
        if _already_awarded(db, badge.id, user_id, org_id):
            return
        _award(db, badge, user_id, org_id, metadata)
        collect.append(badge)

    bulk_verified_count = (
        db.query(Verification)
        .join(WasteLog, WasteLog.id == Verification.waste_log_id)
        .filter(WasteLog.bulk_generator_id == org_id)
        .count()
        if org_id is not None
        else 0
    )
    common_meta = {
        "source": "bulk_workflow",
        "trigger": "verification",
        "waste_log_id": waste_log_id,
        "pickup_request_id": pickup_request_id,
        "score": score,
        "pcc_snapshot": pcc_snapshot,
    }
    maybe_award(
        code="bulk_first_verified",
        user_id=bulk_user_id,
        collect=bulk_new,
        condition=bulk_verified_count >= 1,
        metadata={**common_meta, "target": "bulk"},
    )
    maybe_award(
        code="bulk_segregation_star",
        user_id=bulk_user_id,
        collect=bulk_new,
        condition=score >= 95.0,
        metadata={**common_meta, "target": "bulk"},
    )
    maybe_award(
        code="bulk_century_pcc",
        user_id=bulk_user_id,
        collect=bulk_new,
        condition=pcc_snapshot >= 100.0,
        metadata={**common_meta, "target": "bulk"},
    )

    if worker_user_id is not None:
        worker_verified_count = db.query(Verification).filter(Verification.verifier_worker_id == worker_user_id).count()
        worker_quality_count = (
            db.query(Verification)
            .filter(Verification.verifier_worker_id == worker_user_id, Verification.score >= 95.0)
            .count()
        )
        maybe_award(
            code="worker_bulk_verifier_1",
            user_id=worker_user_id,
            collect=worker_new,
            condition=worker_verified_count >= 1,
            metadata={**common_meta, "target": "worker"},
        )
        maybe_award(
            code="worker_bulk_verifier_25",
            user_id=worker_user_id,
            collect=worker_new,
            condition=worker_verified_count >= 25,
            metadata={**common_meta, "target": "worker"},
        )
        maybe_award(
            code="worker_bulk_quality_guardian",
            user_id=worker_user_id,
            collect=worker_new,
            condition=worker_quality_count >= 10 and score >= 95.0,
            metadata={**common_meta, "target": "worker"},
        )

    if bulk_new or worker_new:
        db.flush()
    return {"bulk": bulk_new, "worker": worker_new}


def list_user_badge_items(db: Session, *, user_id: int, org_id: Optional[int] = None, limit: Optional[int] = None) -> list[dict[str, Any]]:
    query = db.query(UserBadge, Badge).join(Badge, Badge.id == UserBadge.badge_id).filter(UserBadge.user_id == user_id)
    if org_id is not None and _has_column(db, "user_badges", "org_id"):
        query = query.filter(UserBadge.org_id == org_id)
    query = query.order_by(UserBadge.awarded_at.desc())
    if limit is not None:
        query = query.limit(max(1, limit))

    rows = query.all()
    return [
        {
            "code": badge.code or (badge.criteria_key or f"badge_{badge.id}"),
            "name": badge.name,
            "description": badge.description,
            "category": badge.category,
            "awarded_at": user_badge.awarded_at,
            "metadata": user_badge.metadata_json or {},
        }
        for user_badge, badge in rows
    ]
