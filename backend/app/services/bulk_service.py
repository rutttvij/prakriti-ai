from __future__ import annotations

from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from typing import Optional
from uuid import uuid4

from fastapi import HTTPException, UploadFile
from sqlalchemy import and_, func, or_
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import get_password_hash
from app.models.bulk import (
    BadgeAward,
    BulkApprovalStatus,
    BulkGenerator,
    OrganizationStatus,
    PickupRequest,
    PickupRequestStatus,
    Transaction,
    TransactionStatus,
    TransactionType,
    Verification,
    Wallet,
    WalletLedger,
    WalletOwnerType,
    WasteLog,
    WasteLogCategory,
    WasteLogStatus,
)
from app.models.training import TrainingProgress
from app.models.user import User, UserRole
from app.schemas.bulk import (
    BulkDashboardSummary,
    BulkInsightsSummary,
    BulkMeUpdateRequest,
    BulkRegisterRequest,
    PickupRequestCreate,
    PickupStatusSchema,
    VerificationCreate,
    WorkerJobRead,
    WorkerPickupStatusUpdate,
)
from app.services.bulk_carbon_service import calculate_carbon_and_points
from app.services.training_service import list_published_modules


BULK_ROLES = (UserRole.BULK_GENERATOR, UserRole.BULK_MANAGER, UserRole.BULK_STAFF)


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


def _bulk_upload_dir(subdir: str) -> Path:
    root = Path(settings.MEDIA_ROOT).resolve()
    target = root / "bulk" / subdir
    target.mkdir(parents=True, exist_ok=True)
    return target


def _save_upload(file: UploadFile | None, subdir: str) -> Optional[str]:
    if file is None:
        return None
    ext = Path(file.filename or "upload.bin").suffix
    fname = f"{uuid4().hex}{ext or '.bin'}"
    out_path = _bulk_upload_dir(subdir) / fname
    with out_path.open("wb") as out:
        out.write(file.file.read())
    return f"{settings.MEDIA_ROOT}/bulk/{subdir}/{fname}"


def _resolve_bulk_org_for_user(db: Session, user: User) -> BulkGenerator:
    if user.role not in BULK_ROLES and user.role != UserRole.SUPER_ADMIN:
        raise HTTPException(status_code=403, detail="Bulk role required.")

    if user.role == UserRole.SUPER_ADMIN:
        raise HTTPException(status_code=400, detail="Super admin must provide explicit bulk org id.")

    org = db.query(BulkGenerator).filter(BulkGenerator.user_id == user.id).first()
    if org is None:
        # Backward compatibility for bulk users created before bulk org model.
        meta = user.meta or {}
        org_name = (
            (meta.get("organization") if isinstance(meta, dict) else None)
            or user.full_name
            or user.email
            or f"Bulk Org {user.id}"
        )
        org = BulkGenerator(
            user_id=user.id,
            organization_name=str(org_name),
            industry_type=(meta.get("type") if isinstance(meta, dict) else None),
            address=(meta.get("address_ward") if isinstance(meta, dict) else None),
            ward=(meta.get("ward") if isinstance(meta, dict) else None),
            pincode=user.pincode,
            approval_status=BulkApprovalStatus.APPROVED if user.is_active else BulkApprovalStatus.PENDING,
            status=OrganizationStatus.APPROVED.value if user.is_active else OrganizationStatus.PENDING_APPROVAL.value,
            approved_by_user_id=user.id if user.is_active else None,
            approved_at=_utc_now() if user.is_active else None,
        )
        db.add(org)
        db.flush()

        user.meta = {**(meta if isinstance(meta, dict) else {}), "bulk_generator_id": org.id}
        db.add(user)
        _ensure_wallet(db, org.id)
        db.commit()
        db.refresh(org)
    return org


def _resolve_bulk_org_for_user_or_admin(db: Session, user: User, bulk_org_id: Optional[int] = None) -> BulkGenerator:
    if user.role == UserRole.SUPER_ADMIN:
        if not bulk_org_id:
            raise HTTPException(status_code=400, detail="bulk_org_id is required for super admin scope.")
        org = db.get(BulkGenerator, bulk_org_id)
        if org is None:
            raise HTTPException(status_code=404, detail="Bulk organization not found.")
        return org
    return _resolve_bulk_org_for_user(db, user)


def _ensure_wallet(db: Session, bulk_org_id: int) -> Wallet:
    wallet = db.query(Wallet).filter(Wallet.bulk_generator_id == bulk_org_id).first()
    if wallet is None:
        wallet = Wallet(
            bulk_generator_id=bulk_org_id,
            balance_points=0.0,
            balance_pcc=0.0,
            lifetime_credited=0.0,
            lifetime_debited=0.0,
        )
        db.add(wallet)
        db.flush()
    return wallet


def _award_badges_for_bulk(db: Session, *, user_id: int, score: float, pcc_balance: float) -> None:
    existing_keys = {
        row.badge_key
        for row in db.query(BadgeAward).filter(BadgeAward.user_id == user_id).all()
    }
    to_award: list[str] = []

    if "BULK_FIRST_VERIFIED" not in existing_keys:
        to_award.append("BULK_FIRST_VERIFIED")
    if score >= 95 and "BULK_SEGREGATION_STAR" not in existing_keys:
        to_award.append("BULK_SEGREGATION_STAR")
    if pcc_balance >= 100 and "BULK_CENTURY_PCC" not in existing_keys:
        to_award.append("BULK_CENTURY_PCC")

    for key in to_award:
        db.add(BadgeAward(user_id=user_id, badge_key=key, meta_json={"source": "bulk_workflow"}))


def register_bulk_generator(db: Session, payload: BulkRegisterRequest) -> tuple[User, BulkGenerator]:
    if payload.password != payload.confirm_password:
        raise HTTPException(status_code=400, detail="Password and confirm password do not match.")

    if db.query(User).filter(User.email == payload.email).first():
        raise HTTPException(status_code=400, detail="Email already registered.")

    if db.query(User).filter(User.government_id == payload.government_id).first():
        raise HTTPException(status_code=400, detail="This government ID is already registered.")

    user = User(
        email=payload.email,
        full_name=payload.full_name,
        hashed_password=get_password_hash(payload.password),
        role=UserRole.BULK_GENERATOR,
        is_active=False,
        government_id=payload.government_id,
        pincode=payload.pincode,
        meta={"contact_mobile": payload.contact_mobile},
    )
    db.add(user)
    db.flush()

    org = BulkGenerator(
        user_id=user.id,
        organization_name=payload.organization_name,
        industry_type=payload.industry_type.value,
        registration_or_license_no=payload.registration_or_license_no,
        estimated_daily_waste_kg=payload.estimated_daily_waste_kg,
        waste_categories=[c.value for c in payload.waste_categories],
        address=payload.address,
        ward=payload.ward,
        pincode=payload.pincode,
        approval_status=BulkApprovalStatus.PENDING,
        status=OrganizationStatus.PENDING_APPROVAL.value,
    )
    db.add(org)
    db.flush()

    user.meta = {**(user.meta or {}), "bulk_generator_id": org.id}
    _ensure_wallet(db, org.id)

    db.commit()
    db.refresh(user)
    db.refresh(org)
    return user, org


def get_bulk_me(db: Session, current_user: User) -> tuple[BulkGenerator, dict]:
    org = _resolve_bulk_org_for_user(db, current_user)

    logs_q = db.query(WasteLog).filter(WasteLog.bulk_generator_id == org.id)
    logs_count = logs_q.count()
    pickup_total = (
        db.query(PickupRequest)
        .filter(PickupRequest.bulk_org_id == org.id)
        .count()
    )
    pickup_completed = (
        db.query(PickupRequest)
        .filter(PickupRequest.bulk_org_id == org.id, PickupRequest.status == PickupRequestStatus.COMPLETED)
        .count()
    )
    wallet = _ensure_wallet(db, org.id)

    summary = {
        "total_waste_logs": logs_count,
        "pickup_total": pickup_total,
        "pickup_completed": pickup_completed,
        "wallet_balance_pcc": float(wallet.balance_pcc or wallet.balance_points or 0),
    }
    return org, summary


def update_bulk_me(db: Session, *, current_user: User, payload: BulkMeUpdateRequest) -> tuple[User, BulkGenerator]:
    org = _resolve_bulk_org_for_user(db, current_user)

    updates = payload.model_dump(exclude_unset=True)
    meta = dict(current_user.meta or {})

    if "full_name" in updates and updates["full_name"] is not None:
        current_user.full_name = updates["full_name"].strip() or current_user.full_name

    if "pincode" in updates and updates["pincode"] is not None:
        pin = updates["pincode"].strip()
        if pin and len(pin) == 6 and pin.isdigit():
            current_user.pincode = pin
            org.pincode = pin
        elif pin:
            raise HTTPException(status_code=400, detail="Pincode must be exactly 6 digits.")

    if "contact_mobile" in updates and updates["contact_mobile"] is not None:
        meta["contact_mobile"] = updates["contact_mobile"].strip()

    if "organization_name" in updates and updates["organization_name"] is not None:
        org.organization_name = updates["organization_name"].strip() or org.organization_name

    if "industry_type" in updates and updates["industry_type"] is not None:
        org.industry_type = updates["industry_type"].value if hasattr(updates["industry_type"], "value") else str(updates["industry_type"])

    if "registration_or_license_no" in updates:
        org.registration_or_license_no = (updates["registration_or_license_no"] or "").strip() or None

    if "estimated_daily_waste_kg" in updates and updates["estimated_daily_waste_kg"] is not None:
        est = float(updates["estimated_daily_waste_kg"])
        if est <= 0:
            raise HTTPException(status_code=400, detail="estimated_daily_waste_kg must be greater than 0.")
        org.estimated_daily_waste_kg = est

    if "waste_categories" in updates and updates["waste_categories"] is not None:
        cats = [
            c.value if hasattr(c, "value") else str(c)
            for c in updates["waste_categories"]
        ]
        org.waste_categories = cats

    if "address" in updates:
        org.address = (updates["address"] or "").strip() or None

    if "ward" in updates:
        org.ward = (updates["ward"] or "").strip() or None

    current_user.meta = meta
    db.add(current_user)
    db.add(org)
    db.commit()
    db.refresh(current_user)
    db.refresh(org)
    return current_user, org


def create_bulk_waste_log(
    db: Session,
    *,
    current_user: User,
    category: WasteLogCategory,
    weight_kg: float,
    notes: Optional[str],
    photo: UploadFile | None,
) -> WasteLog:
    if weight_kg <= 0:
        raise HTTPException(status_code=400, detail="weight_kg must be greater than 0.")

    org = _resolve_bulk_org_for_user(db, current_user)
    if org.status != OrganizationStatus.APPROVED.value and current_user.role != UserRole.SUPER_ADMIN:
        raise HTTPException(status_code=403, detail="Organization is pending approval.")

    photo_path = _save_upload(photo, "waste_logs")

    log = WasteLog(
        bulk_generator_id=org.id,
        bulk_org_id=org.id,
        created_by_user_id=current_user.id,
        user_id=current_user.id,
        category=category,
        weight_kg=weight_kg,
        logged_weight=weight_kg,
        notes=notes,
        photo_path=photo_path,
        status=WasteLogStatus.LOGGED,
        verification_status="pending",
        pcc_status="pending",
        logged_at=_utc_now(),
        created_at=_utc_now(),
    )
    db.add(log)
    db.commit()
    db.refresh(log)
    return log


def list_bulk_waste_logs(
    db: Session,
    *,
    current_user: User,
    status: Optional[WasteLogStatus] = None,
    limit: int = 20,
) -> list[WasteLog]:
    org = _resolve_bulk_org_for_user(db, current_user)
    q = db.query(WasteLog).filter(WasteLog.bulk_generator_id == org.id)
    if status:
        q = q.filter(WasteLog.status == status)
    return q.order_by(WasteLog.logged_at.desc()).limit(max(1, min(limit, 200))).all()


def create_bulk_pickup_request(db: Session, *, current_user: User, payload: PickupRequestCreate) -> PickupRequest:
    org = _resolve_bulk_org_for_user(db, current_user)
    log = db.get(WasteLog, payload.waste_log_id)
    if log is None:
        raise HTTPException(status_code=404, detail="Waste log not found.")
    if log.bulk_generator_id != org.id:
        raise HTTPException(status_code=403, detail="Cannot request pickup for another organization log.")
    if log.status not in (WasteLogStatus.LOGGED, WasteLogStatus.PICKUP_REQUESTED):
        raise HTTPException(status_code=400, detail="Pickup can only be requested for LOGGED logs.")

    active = (
        db.query(PickupRequest)
        .filter(
            PickupRequest.waste_log_id == log.id,
            PickupRequest.status.in_([
                PickupRequestStatus.REQUESTED,
                PickupRequestStatus.ASSIGNED,
                PickupRequestStatus.IN_PROGRESS,
            ]),
        )
        .first()
    )
    if active:
        raise HTTPException(status_code=400, detail="An active pickup request already exists for this waste log.")

    pickup = PickupRequest(
        waste_log_id=log.id,
        bulk_org_id=org.id,
        requested_by_user_id=current_user.id,
        status=PickupRequestStatus.REQUESTED,
        scheduled_at=payload.scheduled_at,
        note=payload.note,
        status_note=payload.note,
    )
    log.status = WasteLogStatus.PICKUP_REQUESTED
    db.add(pickup)
    db.add(log)
    db.commit()
    db.refresh(pickup)
    return pickup


def list_bulk_pickup_requests(
    db: Session,
    *,
    current_user: User,
    status: Optional[PickupRequestStatus] = None,
    limit: int = 20,
) -> list[PickupRequest]:
    org = _resolve_bulk_org_for_user(db, current_user)
    q = (
        db.query(PickupRequest)
        .join(WasteLog, WasteLog.id == PickupRequest.waste_log_id)
        .filter(
            or_(
                PickupRequest.bulk_org_id == org.id,
                WasteLog.bulk_generator_id == org.id,
            )
        )
    )
    if status:
        q = q.filter(PickupRequest.status == status)
    return q.order_by(PickupRequest.created_at.desc()).limit(max(1, min(limit, 200))).all()


def _calc_streak_days(days: list[date]) -> int:
    if not days:
        return 0
    unique_sorted = sorted(set(days), reverse=True)
    streak = 0
    cursor = unique_sorted[0]
    for d in unique_sorted:
        if d == cursor:
            streak += 1
            cursor = cursor - timedelta(days=1)
        elif d < cursor:
            break
    return streak


def get_bulk_dashboard_summary(db: Session, *, current_user: User) -> BulkDashboardSummary:
    org = _resolve_bulk_org_for_user(db, current_user)

    logs = db.query(WasteLog).filter(WasteLog.bulk_generator_id == org.id).all()
    verifications = (
        db.query(Verification)
        .join(WasteLog, WasteLog.id == Verification.waste_log_id)
        .filter(WasteLog.bulk_generator_id == org.id)
        .all()
    )
    pickups = (
        db.query(PickupRequest)
        .join(WasteLog, WasteLog.id == PickupRequest.waste_log_id)
        .filter(
            or_(
                PickupRequest.bulk_org_id == org.id,
                WasteLog.bulk_generator_id == org.id,
            )
        )
        .all()
    )
    wallet = _ensure_wallet(db, org.id)

    total_logs = len(logs)
    total_logged_weight = sum(float(l.weight_kg or 0) for l in logs)
    verified_weight = sum(float(v.verified_weight_kg or 0) for v in verifications)
    segregation_score = (verified_weight / total_logged_weight * 100) if total_logged_weight > 0 else 0.0
    pickup_total = len(pickups)
    pickup_completed = sum(1 for p in pickups if p.status in (PickupRequestStatus.COMPLETED, PickupRequestStatus.PICKED_UP))
    carbon_total = sum(float(v.carbon_saved_kgco2e or 0) for v in verifications)

    recent_badges = [
        row.badge_key
        for row in db.query(BadgeAward)
        .filter(BadgeAward.user_id == current_user.id)
        .order_by(BadgeAward.created_at.desc())
        .limit(8)
        .all()
    ]

    return BulkDashboardSummary(
        total_waste_logs=total_logs,
        total_logged_weight_kg=round(total_logged_weight, 3),
        verified_weight_kg=round(verified_weight, 3),
        wallet_balance_pcc=round(float(wallet.balance_pcc or wallet.balance_points or 0), 3),
        pickup_completed=pickup_completed,
        pickup_total=pickup_total,
        segregation_score=round(segregation_score, 2),
        carbon_saved_total=round(carbon_total, 3),
        recent_badges=recent_badges,
    )


def get_bulk_insights_summary(db: Session, *, current_user: User) -> BulkInsightsSummary:
    org = _resolve_bulk_org_for_user(db, current_user)
    wallet = _ensure_wallet(db, org.id)

    verifications = (
        db.query(Verification)
        .join(WasteLog, WasteLog.id == Verification.waste_log_id)
        .filter(WasteLog.bulk_generator_id == org.id)
        .all()
    )

    now = _utc_now()
    since_30 = now - timedelta(days=30)

    carbon_total = sum(float(v.carbon_saved_kgco2e or 0) for v in verifications)
    pcc_total = sum(float(v.pcc_awarded or 0) for v in verifications)
    quality_30d_values = [float(v.score or 0) for v in verifications if v.created_at and v.created_at >= since_30]
    quality_30d = (sum(quality_30d_values) / len(quality_30d_values)) if quality_30d_values else 0.0

    streak_days = _calc_streak_days([
        (v.created_at or v.verified_at).astimezone(timezone.utc).date()
        for v in verifications
        if (v.created_at or v.verified_at)
    ])

    badges = [
        row.badge_key
        for row in db.query(BadgeAward)
        .filter(BadgeAward.user_id == current_user.id)
        .order_by(BadgeAward.created_at.desc())
        .all()
    ]

    return BulkInsightsSummary(
        carbon_saved_total=round(carbon_total, 3),
        pcc_earned_total=round(max(float(wallet.lifetime_credited or 0), pcc_total), 3),
        current_streak_days=streak_days,
        quality_30d=round(quality_30d, 2),
        earned_badges=badges,
    )


def get_bulk_training_modules(db: Session) -> list:
    return list_published_modules(db, "bulk_generator")


def list_available_worker_jobs(db: Session, *, current_user: User) -> list[WorkerJobRead]:
    if current_user.role not in (UserRole.WASTE_WORKER, UserRole.SUPER_ADMIN):
        raise HTTPException(status_code=403, detail="Worker role required.")

    rows = (
        db.query(PickupRequest, WasteLog, BulkGenerator)
        .join(WasteLog, WasteLog.id == PickupRequest.waste_log_id)
        .join(BulkGenerator, BulkGenerator.id == WasteLog.bulk_generator_id)
        .filter(
            PickupRequest.status == PickupRequestStatus.REQUESTED,
            PickupRequest.assigned_worker_id.is_(None),
        )
        .order_by(PickupRequest.created_at.asc())
        .all()
    )

    return [
        WorkerJobRead(
            pickup_request_id=pickup.id,
            waste_log_id=log.id,
            bulk_org_id=pickup.bulk_org_id,
            organization_name=org.organization_name,
            category=log.category.value,
            weight_kg=float(log.weight_kg or 0),
            status=pickup.status.value,
            scheduled_at=pickup.scheduled_at,
            note=pickup.note or pickup.status_note,
            created_at=pickup.created_at,
        )
        for pickup, log, org in rows
    ]


def list_assigned_worker_jobs(db: Session, *, current_user: User) -> list[WorkerJobRead]:
    if current_user.role not in (UserRole.WASTE_WORKER, UserRole.SUPER_ADMIN):
        raise HTTPException(status_code=403, detail="Worker role required.")

    rows = (
        db.query(PickupRequest, WasteLog, BulkGenerator)
        .join(WasteLog, WasteLog.id == PickupRequest.waste_log_id)
        .join(BulkGenerator, BulkGenerator.id == WasteLog.bulk_generator_id)
        .filter(PickupRequest.assigned_worker_id == current_user.id)
        .order_by(PickupRequest.created_at.desc())
        .all()
    )

    return [
        WorkerJobRead(
            pickup_request_id=pickup.id,
            waste_log_id=log.id,
            bulk_org_id=pickup.bulk_org_id,
            organization_name=org.organization_name,
            category=log.category.value,
            weight_kg=float(log.weight_kg or 0),
            status=pickup.status.value,
            scheduled_at=pickup.scheduled_at,
            note=pickup.note or pickup.status_note,
            created_at=pickup.created_at,
        )
        for pickup, log, org in rows
    ]


def claim_worker_job(db: Session, *, current_user: User, pickup_request_id: int) -> PickupRequest:
    if current_user.role not in (UserRole.WASTE_WORKER, UserRole.SUPER_ADMIN):
        raise HTTPException(status_code=403, detail="Worker role required.")

    pickup = db.get(PickupRequest, pickup_request_id)
    if pickup is None:
        raise HTTPException(status_code=404, detail="Pickup request not found.")
    if pickup.assigned_worker_id and pickup.assigned_worker_id != current_user.id:
        raise HTTPException(status_code=400, detail="Pickup request already assigned to another worker.")
    if pickup.status not in (PickupRequestStatus.REQUESTED, PickupRequestStatus.ASSIGNED):
        raise HTTPException(status_code=400, detail="Pickup request cannot be claimed in current status.")

    pickup.assigned_worker_id = current_user.id
    pickup.status = PickupRequestStatus.ASSIGNED
    db.add(pickup)
    db.commit()
    db.refresh(pickup)
    return pickup


def update_worker_job_status(
    db: Session,
    *,
    current_user: User,
    pickup_request_id: int,
    payload: WorkerPickupStatusUpdate,
) -> PickupRequest:
    if current_user.role not in (UserRole.WASTE_WORKER, UserRole.SUPER_ADMIN):
        raise HTTPException(status_code=403, detail="Worker role required.")

    pickup = db.get(PickupRequest, pickup_request_id)
    if pickup is None:
        raise HTTPException(status_code=404, detail="Pickup request not found.")
    if current_user.role == UserRole.WASTE_WORKER and pickup.assigned_worker_id not in (None, current_user.id):
        raise HTTPException(status_code=403, detail="Pickup assigned to another worker.")

    if pickup.assigned_worker_id is None:
        pickup.assigned_worker_id = current_user.id

    current = pickup.status
    target = PickupRequestStatus(payload.status.value)

    allowed = {
        PickupRequestStatus.REQUESTED: {PickupRequestStatus.ASSIGNED, PickupRequestStatus.IN_PROGRESS, PickupRequestStatus.CANCELLED},
        PickupRequestStatus.ASSIGNED: {PickupRequestStatus.IN_PROGRESS, PickupRequestStatus.CANCELLED},
        PickupRequestStatus.IN_PROGRESS: {PickupRequestStatus.COMPLETED, PickupRequestStatus.CANCELLED},
        PickupRequestStatus.ACCEPTED: {PickupRequestStatus.IN_PROGRESS, PickupRequestStatus.IN_TRANSIT, PickupRequestStatus.CANCELLED},
        PickupRequestStatus.IN_TRANSIT: {PickupRequestStatus.PICKED_UP, PickupRequestStatus.COMPLETED, PickupRequestStatus.CANCELLED},
        PickupRequestStatus.PICKED_UP: {PickupRequestStatus.COMPLETED},
        PickupRequestStatus.COMPLETED: set(),
        PickupRequestStatus.CANCELLED: set(),
    }

    if target not in allowed[current] and target != current:
        raise HTTPException(status_code=400, detail=f"Invalid pickup status transition: {current.value} -> {target.value}")

    pickup.status = target
    pickup.note = payload.note or pickup.note
    pickup.status_note = payload.note or pickup.status_note

    log = db.get(WasteLog, pickup.waste_log_id)
    if log:
        if target in (PickupRequestStatus.ASSIGNED, PickupRequestStatus.IN_PROGRESS):
            log.status = WasteLogStatus.PICKUP_REQUESTED
        elif target in (PickupRequestStatus.COMPLETED, PickupRequestStatus.PICKED_UP):
            log.status = WasteLogStatus.PICKED_UP
        elif target == PickupRequestStatus.CANCELLED:
            log.status = WasteLogStatus.LOGGED
        db.add(log)

    db.add(pickup)
    db.commit()
    db.refresh(pickup)
    return pickup


def verify_bulk_waste(
    db: Session,
    *,
    current_user: User,
    payload: VerificationCreate,
    proof_photo: UploadFile | None,
) -> tuple[Verification, Wallet]:
    if current_user.role not in (UserRole.WASTE_WORKER, UserRole.SUPER_ADMIN):
        raise HTTPException(status_code=403, detail="Worker role required.")

    log = db.get(WasteLog, payload.waste_log_id)
    if log is None:
        raise HTTPException(status_code=404, detail="Waste log not found.")
    if log.bulk_generator_id is None:
        raise HTTPException(status_code=400, detail="This endpoint supports bulk logs only.")
    if log.status not in (WasteLogStatus.PICKED_UP, WasteLogStatus.PICKUP_REQUESTED, WasteLogStatus.LOGGED):
        raise HTTPException(status_code=400, detail="Waste log cannot be verified in current status.")

    existing = db.query(Verification).filter(Verification.waste_log_id == log.id).first()
    if existing:
        raise HTTPException(status_code=400, detail="Waste log already verified.")

    pickup = None
    if payload.pickup_request_id:
        pickup = db.get(PickupRequest, payload.pickup_request_id)
        if pickup is None or pickup.waste_log_id != log.id:
            raise HTTPException(status_code=400, detail="Invalid pickup request for this waste log.")
        if current_user.role == UserRole.WASTE_WORKER and pickup.assigned_worker_id not in (None, current_user.id):
            raise HTTPException(status_code=403, detail="Pickup assigned to another worker.")

    verified_weight = float(payload.verified_weight_kg)
    reject_weight = float(payload.reject_weight_kg or 0)
    if reject_weight > verified_weight:
        raise HTTPException(status_code=400, detail="reject_weight_kg cannot exceed verified_weight_kg.")

    score = max(0.0, min(100.0, ((verified_weight - reject_weight) / verified_weight) * 100))
    carbon_saved, pcc_awarded = calculate_carbon_and_points(log.category, verified_weight)
    proof_path = _save_upload(proof_photo, "verifications")

    wallet = _ensure_wallet(db, int(log.bulk_generator_id))

    try:
        verification = Verification(
            waste_log_id=log.id,
            pickup_request_id=pickup.id if pickup else None,
            verified_by_user_id=current_user.id,
            verifier_worker_id=current_user.id,
            verifier_id=current_user.id,
            verified_weight_kg=verified_weight,
            verified_weight=verified_weight,
            reject_weight_kg=reject_weight,
            contamination_rate=(reject_weight / verified_weight) if verified_weight else 0,
            quality_score=score / 100,
            score=score,
            carbon_saved_kgco2e=float(carbon_saved),
            pcc_awarded=float(pcc_awarded),
            carbon_saved_kg=float(carbon_saved),
            points_awarded=float(pcc_awarded),
            evidence_path=proof_path,
            remarks=payload.notes,
            meta_json={"category": log.category.value, "workflow": "bulk"},
            created_at=_utc_now(),
            verified_at=_utc_now(),
        )
        db.add(verification)

        # LOGGED -> PICKUP_REQUESTED -> PICKED_UP -> VERIFIED -> CREDITED
        log.status = WasteLogStatus.VERIFIED
        log.verification_status = "verified"
        log.quality_level = "high" if score >= 95 else "medium" if score >= 80 else "low"

        wallet.balance_points = float(wallet.balance_points or 0) + float(pcc_awarded)
        wallet.balance_pcc = float(wallet.balance_pcc or 0) + float(pcc_awarded)
        wallet.lifetime_credited = float(wallet.lifetime_credited or 0) + float(pcc_awarded)

        ledger = WalletLedger(
            owner_type=WalletOwnerType.BULK,
            owner_id=int(log.bulk_generator_id),
            delta_pcc=float(pcc_awarded),
            reason="Waste log credited after worker verification",
            ref_type="verification",
            ref_id=log.id,
        )
        db.add(ledger)

        tx = Transaction(
            wallet_id=wallet.id,
            verification_id=None,
            user_id=log.user_id,
            created_by_user_id=current_user.id,
            org_id=log.bulk_generator_id,
            tx_type=TransactionType.CREDIT,
            status=TransactionStatus.COMPLETED,
            amount_points=float(pcc_awarded),
            amount_pcc=float(pcc_awarded),
            reason="Bulk log verification credit",
            ref_type="bulk_log",
            ref_id=log.id,
            description=f"PCC credited for bulk log #{log.id}",
            meta_json={"verification_weight": verified_weight, "score": score},
        )
        db.add(tx)

        log.status = WasteLogStatus.CREDITED
        log.pcc_status = "awarded"
        log.awarded_pcc_amount = float(pcc_awarded)
        log.awarded_at = _utc_now()
        log.awarded_by_user_id = current_user.id
        db.add(log)
        db.add(wallet)

        if pickup:
            pickup.status = PickupRequestStatus.COMPLETED
            pickup.assigned_worker_id = pickup.assigned_worker_id or current_user.id
            pickup.status_note = payload.notes or pickup.status_note
            db.add(pickup)

        # award lightweight badge keys for Bulk insights page
        org = db.get(BulkGenerator, log.bulk_generator_id)
        if org:
            _award_badges_for_bulk(
                db,
                user_id=org.user_id,
                score=score,
                pcc_balance=float(wallet.balance_pcc or 0),
            )

        db.commit()
        db.refresh(verification)
        db.refresh(wallet)
        return verification, wallet
    except Exception:
        db.rollback()
        raise


def approve_bulk_org(db: Session, *, bulk_org_id: int, approver_user_id: int) -> BulkGenerator:
    row = db.get(BulkGenerator, bulk_org_id)
    if row is None:
        raise HTTPException(status_code=404, detail="Bulk organization not found.")
    row.approval_status = BulkApprovalStatus.APPROVED
    row.status = OrganizationStatus.APPROVED.value
    row.approved_by_user_id = approver_user_id
    row.approved_at = _utc_now()

    owner = db.get(User, row.user_id)
    if owner:
        owner.is_active = True
        db.add(owner)

    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def reject_bulk_org(db: Session, *, bulk_org_id: int) -> BulkGenerator:
    row = db.get(BulkGenerator, bulk_org_id)
    if row is None:
        raise HTTPException(status_code=404, detail="Bulk organization not found.")
    row.approval_status = BulkApprovalStatus.REJECTED
    row.status = OrganizationStatus.REJECTED.value
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


# Legacy wrappers (for backward route compatibility)
def create_waste_log(db: Session, current_user: User, category: WasteLogCategory, weight_kg: float, notes: Optional[str], photo: UploadFile) -> WasteLog:
    return create_bulk_waste_log(db, current_user=current_user, category=category, weight_kg=weight_kg, notes=notes, photo=photo)


def create_pickup_request(db: Session, current_user: User, payload: PickupRequestCreate) -> PickupRequest:
    return create_bulk_pickup_request(db, current_user=current_user, payload=payload)


def list_waste_logs(db: Session, current_user: User, limit: int = 50) -> list[WasteLog]:
    return list_bulk_waste_logs(db, current_user=current_user, limit=limit)


def list_pickup_requests(db: Session, current_user: User, limit: int = 50) -> list[PickupRequest]:
    if current_user.role in BULK_ROLES:
        return list_bulk_pickup_requests(db, current_user=current_user, limit=limit)
    if current_user.role in (UserRole.WASTE_WORKER, UserRole.SUPER_ADMIN):
        rows = (
            db.query(PickupRequest)
            .filter(
                or_(
                    PickupRequest.assigned_worker_id == current_user.id,
                    and_(
                        PickupRequest.assigned_worker_id.is_(None),
                        PickupRequest.status == PickupRequestStatus.REQUESTED,
                    ),
                )
            )
            .order_by(PickupRequest.created_at.desc())
            .limit(max(1, min(limit, 200)))
            .all()
        )
        return rows
    raise HTTPException(status_code=403, detail="Not allowed.")


def get_bulk_dashboard(db: Session, current_user: User, days: int = 30, bulk_generator_id: Optional[int] = None):
    _ = days
    _ = bulk_generator_id
    return get_bulk_dashboard_summary(db, current_user=current_user)


def update_pickup_status(db: Session, current_user: User, payload):
    status = getattr(payload, "status", None)
    note = getattr(payload, "note", None)
    pickup_request_id = getattr(payload, "pickup_request_id", None)
    if status is None or pickup_request_id is None:
        raise HTTPException(status_code=400, detail="pickup_request_id and status are required.")
    return update_worker_job_status(
        db,
        current_user=current_user,
        pickup_request_id=int(pickup_request_id),
        payload=WorkerPickupStatusUpdate(status=PickupStatusSchema(status.value if hasattr(status, "value") else status), note=note),
    )


def verify_waste_log(
    db: Session,
    current_user: User,
    waste_log_id: int,
    verified_weight_kg: float,
    remarks: Optional[str],
    evidence: UploadFile,
    pickup_request_id: Optional[int] = None,
):
    payload = VerificationCreate(
        waste_log_id=waste_log_id,
        pickup_request_id=pickup_request_id,
        verified_weight_kg=verified_weight_kg,
        reject_weight_kg=0,
        notes=remarks,
    )
    return verify_bulk_waste(db, current_user=current_user, payload=payload, proof_photo=evidence)
