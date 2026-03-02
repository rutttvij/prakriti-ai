from __future__ import annotations

from collections import defaultdict
from datetime import UTC, date, datetime, timedelta
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.api import deps
from app.core.database import get_db
from app.models.admin_ops import PlatformSetting
from app.models.badge import Badge, UserBadge
from app.models.bulk import Transaction
from app.models.household import Household, HouseholdMember, SegregationLog
from app.models.notification import Notification
from app.models.pcc import EmissionFactor
from app.models.training import TrainingModule, TrainingProgress
from app.models.user import User
from app.models.waste_report import WasteReport, WasteReportStatus
from app.schemas.citizen import (
    CitizenPccSummaryOut,
    CitizenPccTransactionOut,
    CitizenPccTransactionsPage,
    CitizenTrainingSummaryOut,
    HouseholdCreateIn,
    HouseholdLinkIn,
    HouseholdOut,
    HouseholdUpdateIn,
    NotificationOut,
    NotificationPatchIn,
    SegregationCreateIn,
    SegregationOut,
    SegregationSummaryOut,
    TrainingModuleCitizenOut,
    WasteReportCreateIn,
    WasteReportOut,
    WeeklyBreakdownPoint,
    WeeklyScorePoint,
)
from app.services.badge_engine import list_user_badge_items
from app.services.waste_report_service import create_waste_report

router = APIRouter(prefix="/citizen", tags=["citizen"])


def _citizen_badge_tiers(earned_badges: list[dict[str, Any]]) -> list[dict[str, int | str]]:
    codes = {str(item.get("code", "")).lower() for item in earned_badges}
    tiers = [
        ("citizen_training", ["green_starter", "certified_citizen"]),
        ("citizen_impact", ["impact_10", "impact_50", "impact_200", "impact_500", "impact_1000"]),
        ("citizen_consistency", ["streak_7", "streak_30", "streak_180"]),
        ("citizen_quality", ["quality_85", "quality_95"]),
    ]
    return [
        {
            "tier_key": tier_key,
            "unlocked_count": sum(1 for code in keys if code in codes),
            "total_count": len(keys),
        }
        for tier_key, keys in tiers
    ]


def _setting_number(db: Session, key: str, default: float) -> float:
    row = db.query(PlatformSetting).filter(PlatformSetting.key == key).first()
    if not row:
        return default
    v: Any = row.value_json
    if isinstance(v, dict):
        v = v.get("value", v.get(key))
    try:
        return float(v)
    except (TypeError, ValueError):
        return default


def _load_emission_factors(db: Session) -> dict[str, float]:
    factors = {r.category.lower(): float(r.kgco2e_per_kg) for r in db.query(EmissionFactor).filter(EmissionFactor.active.is_(True)).all()}
    return {
        "dry": factors.get("dry", 1.0),
        "wet": factors.get("wet", 0.5),
        "reject": factors.get("reject", 1.5),
    }


def _week_start(d: date) -> date:
    return d - timedelta(days=d.weekday())


def _ensure_household_member(db: Session, user_id: int, household_id: int, make_primary: bool = False) -> HouseholdMember:
    member = (
        db.query(HouseholdMember)
        .filter(HouseholdMember.user_id == user_id, HouseholdMember.household_id == household_id)
        .first()
    )
    if member is None:
        member = HouseholdMember(user_id=user_id, household_id=household_id, is_primary=False)
        db.add(member)
        db.flush()
    if make_primary:
        (
            db.query(HouseholdMember)
            .filter(HouseholdMember.user_id == user_id)
            .update({"is_primary": False})
        )
        member.is_primary = True
    return member


def _households_for_user(db: Session, user_id: int) -> list[tuple[Household, bool]]:
    rows = (
        db.query(Household, HouseholdMember.is_primary)
        .join(HouseholdMember, HouseholdMember.household_id == Household.id)
        .filter(HouseholdMember.user_id == user_id)
        .order_by(HouseholdMember.is_primary.desc(), Household.created_at.desc())
        .all()
    )

    # legacy fallback if household_members table is still empty for old records
    if not rows:
        legacy = (
            db.query(Household)
            .filter(Household.owner_user_id == user_id)
            .order_by(Household.is_primary.desc(), Household.created_at.desc())
            .all()
        )
        out: list[tuple[Household, bool]] = []
        for hh in legacy:
            m = _ensure_household_member(db, user_id=user_id, household_id=hh.id, make_primary=bool(hh.is_primary))
            out.append((hh, bool(m.is_primary)))
        if out:
            db.commit()
            return out

    return [(hh, bool(primary)) for hh, primary in rows]


def _require_household_access(db: Session, user_id: int, household_id: int) -> Household:
    hh = db.query(Household).filter(Household.id == household_id).first()
    if hh is None:
        raise HTTPException(status_code=404, detail="Household not found")

    member = (
        db.query(HouseholdMember)
        .filter(HouseholdMember.user_id == user_id, HouseholdMember.household_id == household_id)
        .first()
    )
    if member is None and hh.owner_user_id != user_id:
        raise HTTPException(status_code=403, detail="Not allowed for this household")
    if member is None:
        _ensure_household_member(db, user_id=user_id, household_id=household_id)
        db.commit()
    return hh


def _waste_report_out(r: WasteReport) -> WasteReportOut:
    status_map = {
        WasteReportStatus.OPEN.value: "pending",
        WasteReportStatus.IN_PROGRESS.value: "pending",
        WasteReportStatus.RESOLVED.value: "resolved",
    }
    image_url = None
    if r.image_path:
        raw = str(r.image_path).strip().replace("\\", "/")
        if raw.startswith("http://") or raw.startswith("https://"):
            image_url = raw
        elif "/uploads/" in raw:
            image_url = f"/uploads/{raw.split('/uploads/', 1)[-1].lstrip('/')}"
        elif raw.startswith("uploads/"):
            image_url = f"/{raw}"
        elif raw.startswith("/uploads/"):
            image_url = raw
        else:
            image_url = f"/uploads/{raw.lstrip('/')}"
    return WasteReportOut(
        id=r.id,
        public_id=r.public_id,
        user_id=r.reporter_id,
        household_id=r.household_id,
        description=r.description,
        file_path=r.image_path,
        image_url=image_url,
        classification_label=r.classification_label,
        classification_confidence=r.classification_confidence,
        latitude=r.latitude,
        longitude=r.longitude,
        status=status_map.get(r.status, "pending"),
        created_at=r.created_at,
        resolved_at=r.resolved_at,
    )


@router.get("/summary")
def get_citizen_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.require_citizen),
) -> dict[str, Any]:
    reports_total = db.query(WasteReport).filter(WasteReport.reporter_id == current_user.id).count()
    reports_pending = (
        db.query(WasteReport)
        .filter(
            WasteReport.reporter_id == current_user.id,
            WasteReport.status.in_([WasteReportStatus.OPEN.value, WasteReportStatus.IN_PROGRESS.value]),
        )
        .count()
    )
    reports_resolved = (
        db.query(WasteReport)
        .filter(WasteReport.reporter_id == current_user.id, WasteReport.status == WasteReportStatus.RESOLVED.value)
        .count()
    )

    today = datetime.now(UTC).date()
    today_log = (
        db.query(SegregationLog)
        .filter(SegregationLog.citizen_id == current_user.id, SegregationLog.log_date == today)
        .order_by(SegregationLog.created_at.desc())
        .first()
    )

    done_dates = {
        row[0]
        for row in db.query(SegregationLog.log_date)
        .filter(SegregationLog.citizen_id == current_user.id)
        .distinct()
        .all()
        if row[0]
    }
    streak = 0
    cursor = today
    while cursor in done_dates:
        streak += 1
        cursor = cursor - timedelta(days=1)

    training_total = (
        db.query(TrainingModule)
        .filter(TrainingModule.audience == "citizen", TrainingModule.is_published.is_(True))
        .count()
    )
    training_completed = (
        db.query(TrainingProgress)
        .join(TrainingModule, TrainingModule.id == TrainingProgress.module_id)
        .filter(
            TrainingProgress.user_id == current_user.id,
            TrainingProgress.completed.is_(True),
            TrainingModule.audience == "citizen",
            TrainingModule.is_published.is_(True),
        )
        .count()
    )
    badges_earned = db.query(UserBadge).filter(UserBadge.user_id == current_user.id).count()

    pcc = get_pcc_summary(db=db, current_user=current_user)

    return {
        "training": {
            "completed_modules": training_completed,
            "total_modules": training_total,
            "badges_earned": badges_earned,
            "next_module_title": None,
        },
        "segregation": {
            "today_status": "DONE" if today_log else "PENDING",
            "today_score": float(today_log.quality_score if today_log and today_log.quality_score is not None else (today_log.segregation_score if today_log else 0)) if today_log else None,
            "streak_days": streak,
        },
        "reports": {
            "total": reports_total,
            "pending": reports_pending,
            "resolved": reports_resolved,
        },
        "carbon": {
            "co2_saved_kg": pcc.co2_saved_kg,
            "pcc_tokens": pcc.net_pcc,
        },
    }


@router.get("/households", response_model=list[HouseholdOut])
def list_households(
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.require_citizen),
) -> list[HouseholdOut]:
    rows = _households_for_user(db, current_user.id)
    return [
        HouseholdOut(
            id=hh.id,
            name=hh.name,
            city=hh.city,
            ward_zone=hh.ward,
            address=hh.address,
            pincode=hh.pincode,
            is_primary=is_primary,
            created_at=hh.created_at,
            updated_at=hh.updated_at,
        )
        for hh, is_primary in rows
    ]


@router.post("/households", response_model=HouseholdOut, status_code=201)
def create_household_endpoint(
    payload: HouseholdCreateIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.require_citizen),
) -> HouseholdOut:
    hh = Household(
        name=payload.name.strip(),
        city=payload.city.strip(),
        ward=payload.ward_zone,
        address=payload.address,
        pincode=payload.pincode,
        owner_user_id=current_user.id,
    )
    db.add(hh)
    db.flush()

    has_primary = db.query(HouseholdMember).filter(HouseholdMember.user_id == current_user.id, HouseholdMember.is_primary.is_(True)).first()
    make_primary = payload.make_primary or (has_primary is None)
    member = _ensure_household_member(db, current_user.id, hh.id, make_primary=make_primary)

    hh.is_primary = bool(member.is_primary)
    db.commit()
    db.refresh(hh)

    return HouseholdOut(
        id=hh.id,
        name=hh.name,
        city=hh.city,
        ward_zone=hh.ward,
        address=hh.address,
        pincode=hh.pincode,
        is_primary=bool(member.is_primary),
        created_at=hh.created_at,
        updated_at=hh.updated_at,
    )


@router.patch("/households/{household_id}", response_model=HouseholdOut)
def update_household_endpoint(
    household_id: int,
    payload: HouseholdUpdateIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.require_citizen),
) -> HouseholdOut:
    hh = _require_household_access(db, current_user.id, household_id)

    if payload.name is not None:
        hh.name = payload.name.strip()
    if payload.city is not None:
        hh.city = payload.city.strip()
    if payload.ward_zone is not None:
        hh.ward = payload.ward_zone
    if payload.address is not None:
        hh.address = payload.address
    if payload.pincode is not None:
        hh.pincode = payload.pincode

    member = (
        db.query(HouseholdMember)
        .filter(HouseholdMember.user_id == current_user.id, HouseholdMember.household_id == household_id)
        .first()
    )
    is_primary = bool(member.is_primary) if member else bool(hh.is_primary)

    db.commit()
    db.refresh(hh)

    return HouseholdOut(
        id=hh.id,
        name=hh.name,
        city=hh.city,
        ward_zone=hh.ward,
        address=hh.address,
        pincode=hh.pincode,
        is_primary=is_primary,
        created_at=hh.created_at,
        updated_at=hh.updated_at,
    )


@router.post("/households/link", response_model=HouseholdOut)
def link_household(
    payload: HouseholdLinkIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.require_citizen),
) -> HouseholdOut:
    hh = db.query(Household).filter(Household.id == payload.household_id).first()
    if hh is None:
        raise HTTPException(status_code=404, detail="Household not found")

    member = (
        db.query(HouseholdMember)
        .filter(HouseholdMember.household_id == hh.id, HouseholdMember.user_id == current_user.id)
        .first()
    )
    if member is None:
        has_primary = db.query(HouseholdMember).filter(HouseholdMember.user_id == current_user.id, HouseholdMember.is_primary.is_(True)).first()
        member = _ensure_household_member(db, current_user.id, hh.id, make_primary=has_primary is None)
        if hh.owner_user_id is None:
            hh.owner_user_id = current_user.id
        hh.is_primary = bool(member.is_primary)
        db.commit()
        db.refresh(hh)

    return HouseholdOut(
        id=hh.id,
        name=hh.name,
        city=hh.city,
        ward_zone=hh.ward,
        address=hh.address,
        pincode=hh.pincode,
        is_primary=bool(member.is_primary),
        created_at=hh.created_at,
        updated_at=hh.updated_at,
    )


@router.post("/households/{household_id}/make-primary", response_model=HouseholdOut)
def make_primary_household(
    household_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.require_citizen),
) -> HouseholdOut:
    hh = _require_household_access(db, current_user.id, household_id)
    member = _ensure_household_member(db, current_user.id, household_id, make_primary=True)

    (
        db.query(Household)
        .filter(Household.owner_user_id == current_user.id)
        .update({"is_primary": False})
    )
    hh.is_primary = True

    db.commit()
    db.refresh(hh)

    return HouseholdOut(
        id=hh.id,
        name=hh.name,
        city=hh.city,
        ward_zone=hh.ward,
        address=hh.address,
        pincode=hh.pincode,
        is_primary=bool(member.is_primary),
        created_at=hh.created_at,
        updated_at=hh.updated_at,
    )


@router.post("/reports", response_model=WasteReportOut, status_code=201)
def create_report_endpoint(
    payload: WasteReportCreateIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.require_citizen),
) -> WasteReportOut:
    if not payload.classification_label or not payload.classification_label.strip():
        raise HTTPException(status_code=400, detail="classification_label is required")

    file_path = (payload.file_path or "").strip().replace("\\", "/")
    if not file_path:
        raise HTTPException(status_code=400, detail="file_path is required")
    if file_path.startswith("http://") or file_path.startswith("https://"):
        raise HTTPException(status_code=400, detail="file_path must be a stored server path, not a URL")

    household_id = payload.household_id
    if household_id is not None:
        _require_household_access(db, current_user.id, household_id)

    report = create_waste_report(
        db=db,
        reporter_id=current_user.id,
        image_path=file_path,
        description=payload.description,
        latitude=payload.latitude,
        longitude=payload.longitude,
        classification_label=payload.classification_label,
        classification_confidence=payload.classification_confidence,
        classification_recyclable=None,
        household_id=household_id,
    )
    return _waste_report_out(report)


@router.get("/reports", response_model=list[WasteReportOut])
def list_reports(
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.require_citizen),
) -> list[WasteReportOut]:
    items = (
        db.query(WasteReport)
        .filter(WasteReport.reporter_id == current_user.id)
        .order_by(WasteReport.created_at.desc())
        .all()
    )
    return [_waste_report_out(r) for r in items]


@router.get("/reports/{report_id}", response_model=WasteReportOut)
def get_report(
    report_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.require_citizen),
) -> WasteReportOut:
    report = (
        db.query(WasteReport)
        .filter(WasteReport.id == report_id, WasteReport.reporter_id == current_user.id)
        .first()
    )
    if report is None:
        raise HTTPException(status_code=404, detail="Report not found")
    return _waste_report_out(report)


@router.post("/segregation", response_model=SegregationOut, status_code=201)
def create_segregation_log_endpoint(
    payload: SegregationCreateIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.require_citizen),
) -> SegregationOut:
    _require_household_access(db, current_user.id, payload.household_id)

    log_date = payload.log_date or datetime.now(UTC).date()
    total = float(payload.dry_kg + payload.wet_kg + payload.reject_kg)
    reject_ratio = (float(payload.reject_kg) / total) if total > 0 else 1.0
    score = max(0.0, min(100.0, 100.0 - reject_ratio * 200.0))
    quality_level = "high" if score >= 85 else "medium" if score >= 70 else "low"

    log = SegregationLog(
        household_id=payload.household_id,
        citizen_id=current_user.id,
        worker_id=None,
        log_date=log_date,
        dry_kg=float(payload.dry_kg),
        wet_kg=float(payload.wet_kg),
        reject_kg=float(payload.reject_kg),
        segregation_score=int(round(score)),
        quality_score=round(score, 2),
        quality_level=quality_level,
        evidence_image_url=payload.evidence_image_url,
        pcc_status="pending",
        waste_category="mixed",
        weight_kg=total,
    )
    db.add(log)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Segregation log already exists for this household and date")

    db.refresh(log)

    return SegregationOut(
        id=log.id,
        household_id=log.household_id,
        user_id=current_user.id,
        log_date=log.log_date,
        dry_kg=float(log.dry_kg or 0),
        wet_kg=float(log.wet_kg or 0),
        reject_kg=float(log.reject_kg or 0),
        score=float(log.quality_score if log.quality_score is not None else log.segregation_score or 0),
        quality_level=log.quality_level or "low",
        evidence_image_url=log.evidence_image_url,
        pcc_status=log.pcc_status,
        awarded_pcc_amount=log.awarded_pcc_amount,
        awarded_at=log.awarded_at,
        created_at=log.created_at,
    )


@router.get("/segregation", response_model=list[SegregationOut])
def list_segregation_logs(
    household_id: int | None = None,
    from_date: date | None = Query(default=None, alias="from"),
    to_date: date | None = Query(default=None, alias="to"),
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.require_citizen),
) -> list[SegregationOut]:
    q = db.query(SegregationLog).filter(SegregationLog.citizen_id == current_user.id)
    if household_id is not None:
        _require_household_access(db, current_user.id, household_id)
        q = q.filter(SegregationLog.household_id == household_id)
    if from_date is not None:
        q = q.filter(SegregationLog.log_date >= from_date)
    if to_date is not None:
        q = q.filter(SegregationLog.log_date <= to_date)

    items = q.order_by(SegregationLog.log_date.desc(), SegregationLog.id.desc()).all()
    return [
        SegregationOut(
            id=log.id,
            household_id=log.household_id,
            user_id=log.citizen_id or current_user.id,
            log_date=log.log_date,
            dry_kg=float(log.dry_kg or 0),
            wet_kg=float(log.wet_kg or 0),
            reject_kg=float(log.reject_kg or 0),
            score=float(log.quality_score if log.quality_score is not None else log.segregation_score or 0),
            quality_level=log.quality_level or "low",
            evidence_image_url=log.evidence_image_url,
            pcc_status=log.pcc_status,
            awarded_pcc_amount=log.awarded_pcc_amount,
            awarded_at=log.awarded_at,
            created_at=log.created_at,
        )
        for log in items
    ]


@router.get("/segregation/summary", response_model=SegregationSummaryOut)
def segregation_summary(
    household_id: int | None = None,
    weeks: int = Query(default=8, ge=1, le=52),
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.require_citizen),
) -> SegregationSummaryOut:
    q = db.query(SegregationLog).filter(SegregationLog.citizen_id == current_user.id)
    if household_id is not None:
        _require_household_access(db, current_user.id, household_id)
        q = q.filter(SegregationLog.household_id == household_id)

    since = datetime.now(UTC).date() - timedelta(days=weeks * 7)
    logs = q.filter(SegregationLog.log_date >= since).order_by(SegregationLog.log_date.asc()).all()

    if not logs:
        return SegregationSummaryOut(
            avg_score=0,
            totals={"dry_total": 0, "wet_total": 0, "reject_total": 0},
            estimated_pcc_preview=0,
            weekly_score_points=[],
            weekly_breakdown=[],
            recent_logs=[],
        )

    totals = {
        "dry_total": round(sum(float(x.dry_kg or 0) for x in logs), 2),
        "wet_total": round(sum(float(x.wet_kg or 0) for x in logs), 2),
        "reject_total": round(sum(float(x.reject_kg or 0) for x in logs), 2),
    }

    avg_score = round(
        sum(float(x.quality_score if x.quality_score is not None else x.segregation_score or 0) for x in logs) / len(logs),
        2,
    )

    by_week: dict[date, list[SegregationLog]] = defaultdict(list)
    for l in logs:
        by_week[_week_start(l.log_date)].append(l)

    weekly_score_points: list[WeeklyScorePoint] = []
    weekly_breakdown: list[WeeklyBreakdownPoint] = []
    for w in sorted(by_week.keys()):
        items = by_week[w]
        week_end = w + timedelta(days=6)
        week_label = f"{w.strftime('%d %b')} - {week_end.strftime('%d %b')}"
        weekly_score_points.append(
            WeeklyScorePoint(
                week_label=week_label,
                avg_score=round(
                    sum(float(i.quality_score if i.quality_score is not None else i.segregation_score or 0) for i in items) / len(items),
                    2,
                ),
            )
        )
        weekly_breakdown.append(
            WeeklyBreakdownPoint(
                week_label=week_label,
                dry_kg=round(sum(float(i.dry_kg or 0) for i in items), 2),
                wet_kg=round(sum(float(i.wet_kg or 0) for i in items), 2),
                reject_kg=round(sum(float(i.reject_kg or 0) for i in items), 2),
            )
        )

    factors = _load_emission_factors(db)
    pcc_unit = _setting_number(db, "pcc_unit_kgco2e", 10.0)
    co2e = (
        totals["dry_total"] * factors["dry"]
        + totals["wet_total"] * factors["wet"]
        + totals["reject_total"] * factors["reject"]
    )
    preview = round(co2e / pcc_unit, 2) if pcc_unit > 0 else 0

    recent_logs = [
        {
            "date": x.log_date,
            "dry": float(x.dry_kg or 0),
            "wet": float(x.wet_kg or 0),
            "reject": float(x.reject_kg or 0),
            "score": float(x.quality_score if x.quality_score is not None else x.segregation_score or 0),
        }
        for x in logs[-10:][::-1]
    ]

    return SegregationSummaryOut(
        avg_score=avg_score,
        totals=totals,
        estimated_pcc_preview=preview,
        weekly_score_points=weekly_score_points,
        weekly_breakdown=weekly_breakdown,
        recent_logs=recent_logs,
    )


@router.get("/pcc/summary", response_model=CitizenPccSummaryOut)
def get_pcc_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.require_citizen),
) -> CitizenPccSummaryOut:
    rows = db.query(Transaction).filter(Transaction.user_id == current_user.id).all()
    credited_f = 0.0
    debited_f = 0.0
    for row in rows:
        amount = float(row.amount_pcc if row.amount_pcc is not None else row.amount_points or 0)
        tx_kind = (row.type or str(row.tx_type) or "").lower()
        if "debit" in tx_kind:
            debited_f += amount
        else:
            credited_f += amount
    unit = _setting_number(db, "pcc_unit_kgco2e", 10.0)
    net = round(credited_f - debited_f, 2)
    return CitizenPccSummaryOut(
        total_credited=round(credited_f, 2),
        total_debited=round(debited_f, 2),
        net_pcc=net,
        co2_saved_kg=round(net * unit, 2),
    )


@router.get("/pcc/transactions", response_model=CitizenPccTransactionsPage)
def get_pcc_transactions(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.require_citizen),
) -> CitizenPccTransactionsPage:
    q = db.query(Transaction).filter(Transaction.user_id == current_user.id)
    total = q.count()
    rows = (
        q.order_by(Transaction.created_at.desc(), Transaction.id.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    items = [
        CitizenPccTransactionOut(
            id=r.id,
            type=(r.type or str(r.tx_type).lower()).lower(),
            amount=float(r.amount_pcc if r.amount_pcc is not None else r.amount_points),
            reason=r.reason,
            reference_type=r.ref_type,
            reference_id=r.ref_id,
            created_at=r.created_at,
        )
        for r in rows
    ]
    return CitizenPccTransactionsPage(items=items, total=total, page=page, page_size=page_size)


@router.get("/training/summary", response_model=CitizenTrainingSummaryOut)
def training_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.require_citizen),
) -> CitizenTrainingSummaryOut:
    modules = (
        db.query(TrainingModule)
        .filter(TrainingModule.audience == "citizen", TrainingModule.is_published.is_(True))
        .order_by(TrainingModule.order_index.asc(), TrainingModule.id.asc())
        .all()
    )
    module_ids = [m.id for m in modules]

    completed_rows = (
        db.query(TrainingProgress.module_id)
        .filter(
            TrainingProgress.user_id == current_user.id,
            TrainingProgress.completed.is_(True),
            TrainingProgress.module_id.in_(module_ids if module_ids else [-1]),
        )
        .all()
    )
    completed_set = {x[0] for x in completed_rows}
    total = len(modules)
    completed_count = len(completed_set)

    next_mod = next((m for m in modules if m.id not in completed_set), None)
    next_module = (
        TrainingModuleCitizenOut(
            id=next_mod.id,
            title=next_mod.title,
            summary=next_mod.summary,
            content_json=next_mod.content_json or {},
            order_index=next_mod.order_index,
        )
        if next_mod
        else None
    )

    badge_rows = (
        db.query(UserBadge, Badge)
        .join(Badge, Badge.id == UserBadge.badge_id)
        .filter(UserBadge.user_id == current_user.id)
        .order_by(UserBadge.awarded_at.desc())
        .all()
    )
    badges = [
        {
            "id": b.id,
            "code": b.code,
            "title": b.name,
            "description": b.description,
            "awarded_at": ub.awarded_at,
        }
        for ub, b in badge_rows
    ]

    return CitizenTrainingSummaryOut(
        total_modules_published=total,
        completed_count=completed_count,
        completed_module_ids=sorted(list(completed_set)),
        progress_percent=round((completed_count / total) * 100, 2) if total else 0,
        badges_count=len(badges),
        next_module=next_module,
        badges=badges,
    )


@router.get("/badges/me")
def citizen_badges_me(
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.require_citizen),
):
    earned_badges = list_user_badge_items(db, user_id=current_user.id)
    return {
        "earned_count": len(earned_badges),
        "latest_unlocked": earned_badges[:5],
        "timeline": earned_badges,
        "tiers": _citizen_badge_tiers(earned_badges),
    }


@router.get("/notifications", response_model=list[NotificationOut])
def list_notifications(
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.require_citizen),
) -> list[NotificationOut]:
    rows = (
        db.query(Notification)
        .filter(Notification.user_id == current_user.id)
        .order_by(Notification.created_at.desc(), Notification.id.desc())
        .all()
    )
    return rows


@router.patch("/notifications/{notification_id}", response_model=NotificationOut)
def mark_notification(
    notification_id: int,
    payload: NotificationPatchIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.require_citizen),
) -> NotificationOut:
    row = (
        db.query(Notification)
        .filter(Notification.id == notification_id, Notification.user_id == current_user.id)
        .first()
    )
    if row is None:
        raise HTTPException(status_code=404, detail="Notification not found")
    row.is_read = payload.is_read
    db.commit()
    db.refresh(row)
    return row
