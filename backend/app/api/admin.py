# app/api/admin.py

from datetime import date, datetime, timedelta
from typing import List, Optional, Dict

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import func, String

from app.core.database import get_db
from app.api import deps
from app.models.user import User, UserRole
from app.models.waste_report import WasteReport, WasteReportStatus
from app.models.household import SegregationLog
from app.models.carbon import CarbonActivity, CarbonActivityType
from app.schemas.user import UserRead, UserRole as UserRoleSchema
from app.core.carbon_engine import record_carbon_activity, PCC_PER_KG_CO2


router = APIRouter(prefix="/admin", tags=["admin"])


# -------------------------
# Pydantic schemas (admin)
# -------------------------
class AdminSummary(BaseModel):
    total_users: int
    total_citizens: int
    total_waste_workers: int
    total_bulk_generators: int
    pending_approvals: int

    total_waste_reports: int
    open_waste_reports: int
    resolved_waste_reports: int

    total_segregation_logs: int
    avg_segregation_score: Optional[float]

    total_carbon_kg: float
    total_pcc_tokens: float


class CarbonDailyPoint(BaseModel):
    date: date
    carbon_kg: float
    pcc_tokens: float


class CarbonSummary(BaseModel):
    total_carbon_kg: float
    total_pcc_tokens: float
    by_role: Dict[str, Dict[str, float]]
    by_activity_type: Dict[str, Dict[str, float]]
    daily: List[CarbonDailyPoint]


class AwardPCCBody(BaseModel):
    user_id: int
    tokens: float
    reason: Optional[str] = None


class AwardPCCResponse(BaseModel):
    user: UserRead
    new_balance: float


class UpdateUserRoleBody(BaseModel):
    role: UserRoleSchema


# -------------------------
# Segregation log schemas
# -------------------------
class SegregationLogPreview(BaseModel):
    id: int
    waste_report_id: Optional[int]
    household_id: int
    citizen_id: Optional[int]
    citizen_name: Optional[str]
    score: float
    pcc_awarded: bool
    created_at: Optional[datetime]
    log_date: date


class SegregationLogDetail(BaseModel):
    id: int
    score: float
    pcc_awarded: bool
    recommended_pcc: float
    created_at: Optional[datetime]
    log_date: date

    citizen: UserRead
    household_id: int
    waste_report_id: Optional[int]


class AwardSegregationPCCBody(BaseModel):
    pcc_tokens: float
    reason: Optional[str] = None


class AwardSegregationPCCResponse(BaseModel):
    awarded_pcc: float
    new_balance: float


# -------------------------
# 1) Summary dashboard
# -------------------------
@router.get("/summary", response_model=AdminSummary)
def get_admin_summary(
    db: Session = Depends(get_db),
    current_user=Depends(deps.require_super_admin),
):
    total_users = db.query(User).count()
    total_citizens = db.query(User).filter(User.role == UserRole.CITIZEN).count()
    total_workers = db.query(User).filter(User.role == UserRole.WASTE_WORKER).count()
    total_bulk = db.query(User).filter(User.role == UserRole.BULK_GENERATOR).count()
    pending_approvals = db.query(User).filter(User.is_active.is_(False)).count()

    total_waste_reports = db.query(WasteReport).count()
    open_waste_reports = (
        db.query(WasteReport)
        .filter(WasteReport.status == WasteReportStatus.OPEN.value)
        .count()
    )
    resolved_waste_reports = (
        db.query(WasteReport)
        .filter(WasteReport.status == WasteReportStatus.RESOLVED.value)
        .count()
    )

    total_segregation_logs = db.query(SegregationLog).count()
    avg_score = db.query(func.avg(SegregationLog.segregation_score)).scalar()
    avg_score = float(avg_score) if avg_score is not None else None

    total_carbon = db.query(func.sum(CarbonActivity.carbon_kg)).scalar() or 0.0
    total_pcc = db.query(func.sum(CarbonActivity.pcc_tokens)).scalar() or 0.0

    return AdminSummary(
        total_users=total_users,
        total_citizens=total_citizens,
        total_waste_workers=total_workers,
        total_bulk_generators=total_bulk,
        pending_approvals=pending_approvals,
        total_waste_reports=total_waste_reports,
        open_waste_reports=open_waste_reports,
        resolved_waste_reports=resolved_waste_reports,
        total_segregation_logs=total_segregation_logs,
        avg_segregation_score=avg_score,
        total_carbon_kg=float(total_carbon),
        total_pcc_tokens=float(total_pcc),
    )


# -------------------------
# 2) User management (RESTORED)
# -------------------------
@router.get("/users", response_model=List[UserRead])
def list_users(
    role: Optional[UserRoleSchema] = Query(None),
    status: Optional[str] = Query(None, regex="^(active|inactive|pending)$"),
    pincode: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user=Depends(deps.require_super_admin),
):
    q = db.query(User)

    if role:
        q = q.filter(User.role == UserRole(role.value))

    if status == "active":
        q = q.filter(User.is_active.is_(True))
    elif status in ("inactive", "pending"):
        q = q.filter(User.is_active.is_(False))

    if pincode:
        q = q.filter(User.pincode == pincode)

    if search:
        s = f"%{search.lower()}%"
        q = q.filter(
            func.lower(User.email).like(s)
            | func.lower(User.full_name).like(s)
            | func.cast(User.government_id, String).like(s)
        )

    return q.order_by(User.id.desc()).all()


@router.get("/users/{user_id}", response_model=UserRead)
def get_user_detail(
    user_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(deps.require_super_admin),
):
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@router.patch("/users/{user_id}/activate", response_model=UserRead)
def activate_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(deps.require_super_admin),
):
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.is_active = True
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.patch("/users/{user_id}/deactivate", response_model=UserRead)
def deactivate_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(deps.require_super_admin),
):
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.is_active = False
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.patch("/users/{user_id}/role", response_model=UserRead)
def update_user_role(
    user_id: int,
    body: UpdateUserRoleBody,
    db: Session = Depends(get_db),
    current_user=Depends(deps.require_super_admin),
):
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if user.id == current_user.id and body.role != UserRoleSchema.SUPER_ADMIN:
        raise HTTPException(
            status_code=400,
            detail="You cannot remove your own SUPER_ADMIN role.",
        )

    user.role = UserRole(body.role.value)
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


# -------------------------
# 3) Carbon analytics (RESTORED)
# -------------------------
@router.get("/analytics/carbon", response_model=CarbonSummary)
def get_carbon_summary(
    days: int = Query(30, ge=1, le=365),
    db: Session = Depends(get_db),
    current_user=Depends(deps.require_super_admin),
):
    since = datetime.utcnow() - timedelta(days=days)

    total_carbon = db.query(func.sum(CarbonActivity.carbon_kg)).scalar() or 0.0
    total_pcc = db.query(func.sum(CarbonActivity.pcc_tokens)).scalar() or 0.0

    by_role: Dict[str, Dict[str, float]] = {}
    rows = (
        db.query(
            User.role,
            func.sum(CarbonActivity.carbon_kg),
            func.sum(CarbonActivity.pcc_tokens),
        )
        .join(User, CarbonActivity.user_id == User.id)
        .group_by(User.role)
        .all()
    )
    for role, c_sum, p_sum in rows:
        by_role[role.value] = {
            "carbon_kg": float(c_sum or 0.0),
            "pcc_tokens": float(p_sum or 0.0),
        }

    by_activity_type: Dict[str, Dict[str, float]] = {}
    rows = (
        db.query(
            CarbonActivity.activity_type,
            func.sum(CarbonActivity.carbon_kg),
            func.sum(CarbonActivity.pcc_tokens),
        )
        .group_by(CarbonActivity.activity_type)
        .all()
    )
    for atype, c_sum, p_sum in rows:
        by_activity_type[atype.value] = {
            "carbon_kg": float(c_sum or 0.0),
            "pcc_tokens": float(p_sum or 0.0),
        }

    rows = (
        db.query(
            func.date_trunc("day", CarbonActivity.created_at).label("day"),
            func.sum(CarbonActivity.carbon_kg),
            func.sum(CarbonActivity.pcc_tokens),
        )
        .filter(CarbonActivity.created_at >= since)
        .group_by("day")
        .order_by("day")
        .all()
    )

    daily_points: List[CarbonDailyPoint] = []
    for day, c_sum, p_sum in rows:
        daily_points.append(
            CarbonDailyPoint(
                date=day.date(),
                carbon_kg=float(c_sum or 0.0),
                pcc_tokens=float(p_sum or 0.0),
            )
        )

    return CarbonSummary(
        total_carbon_kg=float(total_carbon),
        total_pcc_tokens=float(total_pcc),
        by_role=by_role,
        by_activity_type=by_activity_type,
        daily=daily_points,
    )


# -------------------------
# 4) Segregation logs (ADMIN)
# -------------------------
@router.get("/segregation/logs", response_model=List[SegregationLogPreview])
def list_segregation_logs(
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user=Depends(deps.require_super_admin),
):
    logs = (
        db.query(SegregationLog)
        .order_by(SegregationLog.created_at.desc())
        .limit(limit)
        .all()
    )

    results: List[SegregationLogPreview] = []
    for log in logs:
        citizen = db.get(User, getattr(log, "citizen_id", None)) if getattr(log, "citizen_id", None) else None
        results.append(
            SegregationLogPreview(
                id=log.id,
                waste_report_id=log.waste_report_id,
                household_id=log.household_id,
                citizen_id=getattr(log, "citizen_id", None),
                citizen_name=(citizen.full_name if citizen and citizen.full_name else (citizen.email if citizen else None)),
                score=float(log.segregation_score),
                pcc_awarded=bool(getattr(log, "pcc_awarded", False)),
                created_at=getattr(log, "created_at", None),
                log_date=log.log_date,
            )
        )
    return results


@router.get("/segregation/logs/{log_id}", response_model=SegregationLogDetail)
def get_segregation_log_detail(
    log_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(deps.require_super_admin),
):
    log = db.get(SegregationLog, log_id)
    if not log:
        raise HTTPException(status_code=404, detail="Segregation log not found")

    citizen_id = getattr(log, "citizen_id", None)
    if not citizen_id:
        raise HTTPException(status_code=400, detail="Segregation log has no citizen linked yet")

    citizen = db.get(User, citizen_id)
    if not citizen:
        raise HTTPException(status_code=404, detail="Citizen not found")

    recommended_pcc = round(float(log.segregation_score) * 0.1, 1)

    return SegregationLogDetail(
        id=log.id,
        score=float(log.segregation_score),
        pcc_awarded=bool(getattr(log, "pcc_awarded", False)),
        recommended_pcc=recommended_pcc,
        created_at=getattr(log, "created_at", None),
        log_date=log.log_date,
        citizen=citizen,
        household_id=log.household_id,
        waste_report_id=log.waste_report_id,
    )


@router.post(
    "/segregation/logs/{log_id}/award-pcc",
    response_model=AwardSegregationPCCResponse,
    status_code=status.HTTP_201_CREATED,
)
def award_pcc_for_segregation_log(
    log_id: int,
    body: AwardSegregationPCCBody,
    db: Session = Depends(get_db),
    current_user=Depends(deps.require_super_admin),
):
    log = db.get(SegregationLog, log_id)
    if not log:
        raise HTTPException(status_code=404, detail="Segregation log not found")

    if bool(getattr(log, "pcc_awarded", False)):
        raise HTTPException(status_code=409, detail="PCC already awarded for this log")

    citizen_id = getattr(log, "citizen_id", None)
    if not citizen_id:
        raise HTTPException(status_code=400, detail="Segregation log has no citizen linked yet")

    citizen = db.get(User, citizen_id)
    if not citizen:
        raise HTTPException(status_code=404, detail="Citizen not found")

    tokens = float(body.pcc_tokens)
    if tokens <= 0:
        raise HTTPException(status_code=400, detail="Tokens must be positive")

    carbon_kg = tokens / PCC_PER_KG_CO2

    details = {
        "source": "segregation_log",
        "segregation_log_id": log.id,
        "household_id": log.household_id,
        "waste_report_id": log.waste_report_id,
    }
    if body.reason:
        details["reason"] = body.reason

    record_carbon_activity(
        db=db,
        user_id=citizen.id,
        activity_type=CarbonActivityType.SEGREGATION_REWARD,
        carbon_kg=carbon_kg,
        pcc_tokens=tokens,
        metadata=details,
    )

    log.pcc_awarded = True
    log.pcc_awarded_at = datetime.utcnow()
    log.awarded_pcc_tokens = tokens
    log.award_reason = body.reason

    db.add(log)
    db.commit()
    db.refresh(citizen)

    return AwardSegregationPCCResponse(
        awarded_pcc=tokens,
        new_balance=citizen.pcc_balance,
    )


# -------------------------
# 5) Manual PCC award (KEPT)
# -------------------------
@router.post("/pcc/award", response_model=AwardPCCResponse, status_code=status.HTTP_201_CREATED)
def award_pcc_tokens(
    body: AwardPCCBody,
    db: Session = Depends(get_db),
    current_user=Depends(deps.require_super_admin),
):
    user = db.get(User, body.user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    tokens = float(body.tokens)
    if tokens <= 0:
        raise HTTPException(status_code=400, detail="Tokens must be positive.")

    carbon_kg = tokens / PCC_PER_KG_CO2

    details = {}
    if body.reason:
        details["reason"] = body.reason

    record_carbon_activity(
        db=db,
        user_id=user.id,
        activity_type=CarbonActivityType.MANUAL_AWARD,
        carbon_kg=carbon_kg,
        pcc_tokens=tokens,
        metadata=details,
    )

    db.refresh(user)

    return AwardPCCResponse(
        user=user,
        new_balance=user.pcc_balance,
    )
