from __future__ import annotations

from collections import defaultdict
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Optional
from uuid import uuid4

from fastapi import UploadFile
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import get_password_hash
from app.models.bulk import (
    BulkApprovalStatus,
    BulkGenerator,
    PickupRequest,
    PickupRequestStatus,
    Transaction,
    TransactionStatus,
    TransactionType,
    Verification,
    Wallet,
    WasteLog,
    WasteLogCategory,
    WasteLogStatus,
)
from app.models.user import User, UserRole
from app.schemas.bulk import (
    BulkDashboardData,
    BulkRegisterRequest,
    CategoryBreakdownPoint,
    DashboardTrendPoint,
    PickupRequestCreate,
    PickupRequestStatusUpdate,
)
from app.services.bulk_carbon_service import calculate_carbon_and_points


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


def _bulk_upload_dir(subdir: str) -> Path:
    root = Path(settings.MEDIA_ROOT).resolve()
    target = root / "bulk" / subdir
    target.mkdir(parents=True, exist_ok=True)
    return target


def _save_upload(file: UploadFile, subdir: str) -> str:
    ext = Path(file.filename or "upload.bin").suffix
    fname = f"{uuid4().hex}{ext or '.bin'}"
    out_path = _bulk_upload_dir(subdir) / fname
    with out_path.open("wb") as out:
        out.write(file.file.read())
    return f"{settings.MEDIA_ROOT}/bulk/{subdir}/{fname}"


def _resolve_bulk_generator_for_user(db: Session, user: User) -> Optional[BulkGenerator]:
    meta = user.meta or {}
    profile_id = meta.get("bulk_generator_id")
    if isinstance(profile_id, int):
        bg = db.get(BulkGenerator, profile_id)
        if bg:
            return bg

    existing = db.query(BulkGenerator).filter(BulkGenerator.user_id == user.id).first()
    if existing:
        return existing

    if user.role not in (UserRole.BULK_GENERATOR, UserRole.BULK_MANAGER, UserRole.BULK_STAFF):
        return None

    # Backward compatibility for users created before bulk tables were introduced.
    org_name = (meta.get("organization") if isinstance(meta, dict) else None) or user.full_name or user.email
    approval = BulkApprovalStatus.APPROVED if user.is_active else BulkApprovalStatus.PENDING

    try:
        created = BulkGenerator(
            user_id=user.id,
            organization_name=str(org_name),
            organization_type=(meta.get("type") if isinstance(meta, dict) else None),
            address=(meta.get("address_ward") if isinstance(meta, dict) else None),
            city=(meta.get("city") if isinstance(meta, dict) else None),
            pincode=user.pincode,
            approval_status=approval,
            approved_by_user_id=user.id if approval == BulkApprovalStatus.APPROVED else None,
            approved_at=_utc_now() if approval == BulkApprovalStatus.APPROVED else None,
        )
        db.add(created)
        db.flush()

        wallet = Wallet(
            bulk_generator_id=created.id,
            balance_points=0.0,
            lifetime_credited=0.0,
            lifetime_debited=0.0,
        )
        db.add(wallet)

        user.meta = {**(meta if isinstance(meta, dict) else {}), "bulk_generator_id": created.id}
        db.add(user)
        db.commit()
        db.refresh(created)
        return created
    except Exception:
        db.rollback()
        raise


def register_bulk_generator(db: Session, payload: BulkRegisterRequest) -> tuple[User, BulkGenerator]:
    if db.query(User).filter(User.email == payload.email).first():
        raise ValueError("Email already registered.")

    if payload.government_id:
        existing_gid = db.query(User).filter(User.government_id == payload.government_id).first()
        if existing_gid:
            raise ValueError("This government ID is already registered.")

    role = UserRole(payload.requested_role.value)
    user_meta = dict(payload.meta or {})

    try:
        user = User(
            email=payload.email,
            full_name=payload.full_name,
            hashed_password=get_password_hash(payload.password),
            role=role,
            is_active=False,  # admin approval required
            government_id=payload.government_id,
            pincode=payload.pincode,
            meta=user_meta,
        )
        db.add(user)
        db.flush()

        bulk = BulkGenerator(
            user_id=user.id,
            organization_name=payload.organization_name,
            organization_type=payload.organization_type,
            address=payload.address,
            city=payload.city,
            pincode=payload.pincode,
            license_number=payload.license_number,
            approval_status=BulkApprovalStatus.PENDING,
        )
        db.add(bulk)
        db.flush()

        user.meta = {**user_meta, "bulk_generator_id": bulk.id}

        wallet = Wallet(bulk_generator_id=bulk.id, balance_points=0.0, lifetime_credited=0.0, lifetime_debited=0.0)
        db.add(wallet)

        db.commit()
        db.refresh(user)
        db.refresh(bulk)
        return user, bulk
    except Exception:
        db.rollback()
        raise


def create_waste_log(
    db: Session,
    current_user: User,
    category: WasteLogCategory,
    weight_kg: float,
    notes: Optional[str],
    photo: UploadFile,
) -> WasteLog:
    if weight_kg <= 0:
        raise ValueError("weight_kg must be greater than 0.")

    bulk = _resolve_bulk_generator_for_user(db, current_user)
    if not bulk:
        raise ValueError("Bulk generator profile not found for user.")
    if bulk.approval_status != BulkApprovalStatus.APPROVED and current_user.role != UserRole.SUPER_ADMIN:
        raise ValueError("Bulk profile is pending admin approval.")

    photo_path = _save_upload(photo, "waste_logs")

    try:
        log = WasteLog(
            bulk_generator_id=bulk.id,
            created_by_user_id=current_user.id,
            category=category,
            weight_kg=weight_kg,
            photo_path=photo_path,
            notes=notes,
            status=WasteLogStatus.LOGGED,
        )
        db.add(log)
        db.commit()
        db.refresh(log)
        return log
    except Exception:
        db.rollback()
        raise


def create_pickup_request(
    db: Session,
    current_user: User,
    payload: PickupRequestCreate,
) -> PickupRequest:
    waste_log = db.get(WasteLog, payload.waste_log_id)
    if not waste_log:
        raise ValueError("Waste log not found.")

    bulk = _resolve_bulk_generator_for_user(db, current_user)
    if not bulk:
        raise ValueError("Bulk generator profile not found for user.")
    if waste_log.bulk_generator_id != bulk.id and current_user.role != UserRole.SUPER_ADMIN:
        raise ValueError("You cannot request pickup for this waste log.")

    active_req = (
        db.query(PickupRequest)
        .filter(
            PickupRequest.waste_log_id == waste_log.id,
            PickupRequest.status.in_(
                [
                    PickupRequestStatus.REQUESTED,
                    PickupRequestStatus.ACCEPTED,
                    PickupRequestStatus.IN_TRANSIT,
                ]
            ),
        )
        .first()
    )
    if active_req:
        raise ValueError("An active pickup request already exists for this waste log.")

    try:
        req = PickupRequest(
            waste_log_id=waste_log.id,
            requested_by_user_id=current_user.id,
            scheduled_at=payload.scheduled_at,
            status_note=payload.note,
            status=PickupRequestStatus.REQUESTED,
        )
        waste_log.status = WasteLogStatus.PICKUP_REQUESTED
        db.add(req)
        db.add(waste_log)
        db.commit()
        db.refresh(req)
        return req
    except Exception:
        db.rollback()
        raise


def update_pickup_status(
    db: Session,
    current_user: User,
    payload: PickupRequestStatusUpdate,
) -> PickupRequest:
    req = db.get(PickupRequest, payload.pickup_request_id)
    if not req:
        raise ValueError("Pickup request not found.")

    waste_log = db.get(WasteLog, req.waste_log_id)
    if not waste_log:
        raise ValueError("Linked waste log not found.")

    try:
        req.status = PickupRequestStatus(payload.status.value)
        req.status_note = payload.note
        req.updated_at = _utc_now()

        if current_user.role == UserRole.WASTE_WORKER and req.assigned_worker_id is None:
            req.assigned_worker_id = current_user.id

        if req.status == PickupRequestStatus.PICKED_UP:
            waste_log.status = WasteLogStatus.PICKED_UP
        elif req.status == PickupRequestStatus.CANCELLED:
            waste_log.status = WasteLogStatus.LOGGED
        else:
            waste_log.status = WasteLogStatus.PICKUP_REQUESTED

        db.add(req)
        db.add(waste_log)
        db.commit()
        db.refresh(req)
        return req
    except Exception:
        db.rollback()
        raise


def verify_waste_log(
    db: Session,
    current_user: User,
    waste_log_id: int,
    verified_weight_kg: float,
    remarks: Optional[str],
    evidence: UploadFile,
    pickup_request_id: Optional[int] = None,
) -> tuple[Verification, Wallet]:
    if verified_weight_kg <= 0:
        raise ValueError("verified_weight_kg must be greater than 0.")

    waste_log = db.get(WasteLog, waste_log_id)
    if not waste_log:
        raise ValueError("Waste log not found.")

    if waste_log.verification:
        raise ValueError("This waste log is already verified.")

    pickup_request = None
    if pickup_request_id:
        pickup_request = db.get(PickupRequest, pickup_request_id)
        if not pickup_request:
            raise ValueError("Pickup request not found.")
        if pickup_request.waste_log_id != waste_log.id:
            raise ValueError("Pickup request does not belong to this waste log.")

    evidence_path = _save_upload(evidence, "verifications")
    carbon_saved, points = calculate_carbon_and_points(waste_log.category, verified_weight_kg)

    try:
        verification = Verification(
            waste_log_id=waste_log.id,
            pickup_request_id=pickup_request.id if pickup_request else None,
            verified_by_user_id=current_user.id,
            verified_weight_kg=verified_weight_kg,
            evidence_path=evidence_path,
            remarks=remarks,
            carbon_saved_kg=carbon_saved,
            points_awarded=points,
            meta_json={"category": waste_log.category.value},
        )
        db.add(verification)

        waste_log.status = WasteLogStatus.VERIFIED
        db.add(waste_log)

        wallet = db.query(Wallet).filter(Wallet.bulk_generator_id == waste_log.bulk_generator_id).first()
        if wallet is None:
            wallet = Wallet(
                bulk_generator_id=waste_log.bulk_generator_id,
                balance_points=0.0,
                lifetime_credited=0.0,
                lifetime_debited=0.0,
            )
            db.add(wallet)
            db.flush()

        wallet.balance_points += points
        wallet.lifetime_credited += points
        db.add(wallet)
        db.flush()

        tx = Transaction(
            wallet_id=wallet.id,
            verification_id=verification.id,
            tx_type=TransactionType.CREDIT,
            status=TransactionStatus.COMPLETED,
            amount_points=points,
            description=f"Credits for verified waste log #{waste_log.id}",
            meta_json={
                "waste_log_id": waste_log.id,
                "verified_weight_kg": verified_weight_kg,
                "carbon_saved_kg": carbon_saved,
            },
        )
        db.add(tx)

        if pickup_request:
            pickup_request.status = PickupRequestStatus.PICKED_UP
            db.add(pickup_request)

        db.commit()
        db.refresh(verification)
        db.refresh(wallet)
        return verification, wallet
    except Exception:
        db.rollback()
        raise


def get_bulk_dashboard(
    db: Session,
    current_user: User,
    days: int = 30,
    bulk_generator_id: Optional[int] = None,
) -> BulkDashboardData:
    if days < 1:
        days = 1
    since = _utc_now() - timedelta(days=days)

    if current_user.role == UserRole.SUPER_ADMIN and bulk_generator_id:
        target_bulk = db.get(BulkGenerator, bulk_generator_id)
        if not target_bulk:
            raise ValueError("Bulk generator not found.")
        logs = db.query(WasteLog).filter(WasteLog.bulk_generator_id == target_bulk.id).all()
        wallet = db.query(Wallet).filter(Wallet.bulk_generator_id == target_bulk.id).first()
    elif current_user.role == UserRole.SUPER_ADMIN:
        logs = db.query(WasteLog).all()
        wallet = None
    else:
        bulk = _resolve_bulk_generator_for_user(db, current_user)
        if not bulk:
            raise ValueError("Bulk generator profile not found for user.")
        logs = db.query(WasteLog).filter(WasteLog.bulk_generator_id == bulk.id).all()
        wallet = db.query(Wallet).filter(Wallet.bulk_generator_id == bulk.id).first()

    log_ids = [l.id for l in logs]
    pickups = db.query(PickupRequest).filter(PickupRequest.waste_log_id.in_(log_ids)).all() if log_ids else []
    verifications = db.query(Verification).filter(Verification.waste_log_id.in_(log_ids)).all() if log_ids else []

    total_logs = len(logs)
    total_logged_weight = sum(float(l.weight_kg or 0.0) for l in logs)
    total_verified_weight = sum(float(v.verified_weight_kg or 0.0) for v in verifications)
    total_pickups = len(pickups)
    completed_pickups = sum(1 for p in pickups if p.status == PickupRequestStatus.PICKED_UP)
    total_carbon_saved = sum(float(v.carbon_saved_kg or 0.0) for v in verifications)
    wallet_balance = float(wallet.balance_points) if wallet else 0.0
    segregation_score = (total_verified_weight / total_logged_weight * 100.0) if total_logged_weight > 0 else 0.0

    trend_by_day: dict[datetime.date, dict[str, float]] = defaultdict(
        lambda: {
            "logged_weight_kg": 0.0,
            "verified_weight_kg": 0.0,
            "carbon_saved_kg": 0.0,
            "points_credited": 0.0,
        }
    )
    for log in logs:
        if log.logged_at >= since:
            day = log.logged_at.date()
            trend_by_day[day]["logged_weight_kg"] += float(log.weight_kg or 0.0)
    for verification in verifications:
        if verification.verified_at >= since:
            day = verification.verified_at.date()
            trend_by_day[day]["verified_weight_kg"] += float(verification.verified_weight_kg or 0.0)
            trend_by_day[day]["carbon_saved_kg"] += float(verification.carbon_saved_kg or 0.0)
            trend_by_day[day]["points_credited"] += float(verification.points_awarded or 0.0)

    trends = [
        DashboardTrendPoint(
            day=day,
            logged_weight_kg=round(values["logged_weight_kg"], 3),
            verified_weight_kg=round(values["verified_weight_kg"], 3),
            carbon_saved_kg=round(values["carbon_saved_kg"], 3),
            points_credited=round(values["points_credited"], 3),
        )
        for day, values in sorted(trend_by_day.items())
    ]

    category_totals: dict[WasteLogCategory, dict[str, float]] = defaultdict(
        lambda: {"total_weight_kg": 0.0, "verified_weight_kg": 0.0}
    )
    verification_map = {v.waste_log_id: v for v in verifications}
    for log in logs:
        category_totals[log.category]["total_weight_kg"] += float(log.weight_kg or 0.0)
        if log.id in verification_map:
            category_totals[log.category]["verified_weight_kg"] += float(
                verification_map[log.id].verified_weight_kg or 0.0
            )

    breakdown = [
        CategoryBreakdownPoint(
            category=category.value,
            total_weight_kg=round(values["total_weight_kg"], 3),
            verified_weight_kg=round(values["verified_weight_kg"], 3),
        )
        for category, values in category_totals.items()
    ]

    return BulkDashboardData(
        total_logs=total_logs,
        total_logged_weight_kg=round(total_logged_weight, 3),
        total_verified_weight_kg=round(total_verified_weight, 3),
        total_pickup_requests=total_pickups,
        completed_pickups=completed_pickups,
        segregation_score=round(segregation_score, 2),
        total_carbon_saved_kg=round(total_carbon_saved, 3),
        wallet_balance_points=round(wallet_balance, 3),
        trends=trends,
        category_breakdown=breakdown,
    )


def list_waste_logs(
    db: Session,
    current_user: User,
    limit: int = 50,
) -> list[WasteLog]:
    q = db.query(WasteLog)
    if current_user.role != UserRole.SUPER_ADMIN:
        bulk = _resolve_bulk_generator_for_user(db, current_user)
        if not bulk:
            raise ValueError("Bulk generator profile not found for user.")
        q = q.filter(WasteLog.bulk_generator_id == bulk.id)
    return q.order_by(WasteLog.logged_at.desc()).limit(max(1, min(limit, 200))).all()


def list_pickup_requests(
    db: Session,
    current_user: User,
    limit: int = 50,
) -> list[PickupRequest]:
    q = db.query(PickupRequest)

    if current_user.role == UserRole.SUPER_ADMIN:
        pass
    elif current_user.role == UserRole.WASTE_WORKER:
        q = q.filter(
            (PickupRequest.assigned_worker_id == current_user.id)
            | (PickupRequest.assigned_worker_id.is_(None))
        )
    else:
        bulk = _resolve_bulk_generator_for_user(db, current_user)
        if not bulk:
            raise ValueError("Bulk generator profile not found for user.")
        q = q.join(WasteLog, WasteLog.id == PickupRequest.waste_log_id).filter(
            WasteLog.bulk_generator_id == bulk.id
        )

    return q.order_by(PickupRequest.created_at.desc()).limit(max(1, min(limit, 200))).all()
