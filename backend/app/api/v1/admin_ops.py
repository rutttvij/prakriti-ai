from __future__ import annotations

import csv
from datetime import datetime, timezone
from io import StringIO
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import PlainTextResponse
from sqlalchemy import String, and_, func, or_
from sqlalchemy.orm import Session

from app.api import deps
from app.core.database import get_db
from app.core.security import get_password_hash
from app.models.admin_ops import AuditLog, PlatformSetting, WorkforceAssignment, Zone
from app.models.bulk import BulkApprovalStatus, BulkGenerator, Transaction, TransactionType, WasteLog
from app.models.contact import ContactMessage
from app.models.household import Household, SegregationLog
from app.models.leads import DemoRequest
from app.models.pcc import EmissionFactor
from app.models.user import User, UserRole
from app.schemas.admin_ops import (
    ActivityItem,
    AnalyticsSummaryResponse,
    ApprovalActionBody,
    ApprovalItem,
    ApprovalListResponse,
    AuditLogItem,
    AuditLogListResponse,
    GenericOk,
    PccSummaryResponse,
    PccSettingsRead,
    PccSettingsUpdate,
    PccEmissionFactorItem,
    PccEmissionFactorCreate,
    PccEmissionFactorUpdate,
    PccTransactionItem,
    PccTransactionListResponse,
    PccAwardBody,
    PccActionResponse,
    PccBulkAwardBody,
    PccBulkAwardResponse,
    PccAwardedItem,
    PccSkippedItem,
    PccRevokeBody,
    CitizenSegregationLogListResponse,
    CitizenSegregationLogItem,
    BulkGeneratorLogListResponse,
    BulkGeneratorLogItem,
    SettingsRead,
    SettingsUpdate,
    WorkforceAssignZoneBody,
    WorkforceCreate,
    WorkforceRead,
    WorkforceUpdate,
    ZoneCreate,
    ZoneRead,
    ZoneUpdate,
    AdminKpiSummary,
)
from app.services.admin_audit_service import log_admin_action
from app.services.bulk_service import approve_bulk_org, reject_bulk_org
from app.services.pcc_award_service import award_reference, revoke_reference

router = APIRouter(prefix="/admin", tags=["admin-ops"])


SETTINGS_DEFAULTS = {
    "pcc_unit_kgco2e": 1.0,
    "quality_multipliers": {"low": 0.7, "medium": 1.0, "high": 1.15},
    "feature_flags": {"enable_training_modules": True, "enable_pcc_calculator": True},
}


def _as_utc(dt: datetime | None) -> datetime:
    if dt is None:
        return datetime.min.replace(tzinfo=timezone.utc)
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


def _setting(db: Session, key: str, default: Any) -> Any:
    row = db.query(PlatformSetting).filter(PlatformSetting.key == key).first()
    return row.value_json if row else default


def _upsert_setting(db: Session, key: str, value_json: Any, actor: User) -> PlatformSetting:
    row = db.query(PlatformSetting).filter(PlatformSetting.key == key).first()
    if row is None:
        row = PlatformSetting(key=key, value_json=value_json, updated_by_user_id=actor.id)
    else:
        row.value_json = value_json
        row.updated_by_user_id = actor.id
    db.add(row)
    db.flush()
    return row


def _get_pcc_settings(db: Session) -> tuple[float, dict[str, float], datetime]:
    pcc_unit_row = db.query(PlatformSetting).filter(PlatformSetting.key == "pcc_unit_kgco2e").first()
    mult_row = db.query(PlatformSetting).filter(PlatformSetting.key == "quality_multipliers").first()
    pcc_unit = float(pcc_unit_row.value_json if pcc_unit_row else 10.0)
    multipliers = mult_row.value_json if mult_row and isinstance(mult_row.value_json, dict) else SETTINGS_DEFAULTS["quality_multipliers"]
    updated_at_candidates = [r.updated_at for r in (pcc_unit_row, mult_row) if r is not None and r.updated_at is not None]
    updated_at = max(updated_at_candidates) if updated_at_candidates else datetime.now(timezone.utc)
    return pcc_unit, {k: float(v) for k, v in multipliers.items()}, updated_at


@router.get("/analytics/summary", response_model=AnalyticsSummaryResponse)
def analytics_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.require_super_admin),
):
    total_users = db.query(User).count()
    active_users = db.query(User).filter(User.is_active.is_(True)).count()
    pending_approvals = db.query(BulkGenerator).filter(BulkGenerator.approval_status == BulkApprovalStatus.PENDING).count()
    total_zones = db.query(Zone).count()
    workforce_count = db.query(User).filter(User.role == UserRole.WASTE_WORKER).count()
    open_demo_requests = db.query(DemoRequest).filter(DemoRequest.status.in_(["new", "contacted", "qualified"])) .count()
    unread_contact_messages = db.query(ContactMessage).filter(ContactMessage.is_read.is_(False)).count()

    recent_demo = db.query(DemoRequest).order_by(DemoRequest.created_at.desc()).limit(3).all()
    recent_contact = db.query(ContactMessage).order_by(ContactMessage.created_at.desc()).limit(3).all()
    recent_audit = db.query(AuditLog).order_by(AuditLog.created_at.desc()).limit(4).all()

    activity: list[ActivityItem] = []
    for row in recent_demo:
        activity.append(
            ActivityItem(
                kind="demo_request",
                id=row.id,
                title=row.name,
                subtitle=f"{row.organization} · {row.status}",
                created_at=row.created_at,
            )
        )
    for row in recent_contact:
        activity.append(
            ActivityItem(
                kind="contact_message",
                id=row.id,
                title=row.name,
                subtitle=f"{row.email} · {row.status}",
                created_at=row.created_at,
            )
        )
    for row in recent_audit:
        activity.append(
            ActivityItem(
                kind="audit_log",
                id=row.id,
                title=f"{row.action} {row.entity}",
                subtitle=row.actor_email,
                created_at=row.created_at,
            )
        )
    activity.sort(key=lambda x: _as_utc(x.created_at), reverse=True)

    return AnalyticsSummaryResponse(
        kpis=AdminKpiSummary(
            total_users=total_users,
            active_users=active_users,
            pending_approvals=pending_approvals,
            total_zones=total_zones,
            workforce_count=workforce_count,
            open_demo_requests=open_demo_requests,
            unread_contact_messages=unread_contact_messages,
        ),
        recent_activity=activity[:12],
    )


@router.get("/approvals", response_model=ApprovalListResponse)
def list_approvals(
    db: Session = Depends(get_db),
    _: User = Depends(deps.require_super_admin),
):
    rows = (
        db.query(BulkGenerator, User)
        .join(User, BulkGenerator.user_id == User.id)
        .filter(BulkGenerator.approval_status == BulkApprovalStatus.PENDING)
        .order_by(BulkGenerator.created_at.desc())
        .all()
    )
    items = [
        ApprovalItem(
            id=bg.id,
            user_id=user.id,
            name=user.full_name or bg.organization_name,
            email=user.email,
            role=user.role.value,
            status=bg.approval_status.value,
            created_at=bg.created_at,
        )
        for bg, user in rows
    ]
    return ApprovalListResponse(items=items)


@router.post("/approvals/{approval_id}", response_model=GenericOk)
def act_approval(
    approval_id: int,
    payload: ApprovalActionBody,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.require_super_admin),
):
    row = db.get(BulkGenerator, approval_id)
    if row is None:
        raise HTTPException(status_code=404, detail="Approval request not found")

    if payload.decision == "approve":
        row.approval_status = BulkApprovalStatus.APPROVED
        row.approved_by_user_id = current_user.id
        row.approved_at = datetime.utcnow()
        linked = db.get(User, row.user_id)
        if linked:
            linked.is_active = True
            db.add(linked)
    else:
        row.approval_status = BulkApprovalStatus.REJECTED
    db.add(row)
    log_admin_action(
        db,
        actor=current_user,
        action=f"approval_{payload.decision}",
        entity="bulk_generator",
        entity_id=row.id,
        metadata={"user_id": row.user_id},
    )
    db.commit()
    return GenericOk(ok=True)


@router.post("/approvals/{bulk_org_id}/approve", response_model=GenericOk)
def approve_bulk_organization(
    bulk_org_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.require_super_admin),
):
    approve_bulk_org(db, bulk_org_id=bulk_org_id, approver_user_id=current_user.id)
    log_admin_action(
        db,
        actor=current_user,
        action="approval_approve",
        entity="bulk_generator",
        entity_id=bulk_org_id,
        metadata={"source": "bulk_v2"},
    )
    return GenericOk(ok=True)


@router.post("/approvals/{bulk_org_id}/reject", response_model=GenericOk)
def reject_bulk_organization(
    bulk_org_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.require_super_admin),
):
    reject_bulk_org(db, bulk_org_id=bulk_org_id)
    log_admin_action(
        db,
        actor=current_user,
        action="approval_reject",
        entity="bulk_generator",
        entity_id=bulk_org_id,
        metadata={"source": "bulk_v2"},
    )
    return GenericOk(ok=True)


@router.get("/zones", response_model=list[ZoneRead])
def list_zones(
    active: bool | None = Query(default=None),
    db: Session = Depends(get_db),
    _: User = Depends(deps.require_super_admin),
):
    qry = db.query(Zone)
    if active is not None:
        qry = qry.filter(Zone.active.is_(active))
    return qry.order_by(Zone.city.asc(), Zone.name.asc()).all()


@router.post("/zones", response_model=ZoneRead, status_code=status.HTTP_201_CREATED)
def create_zone(
    payload: ZoneCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.require_super_admin),
):
    row = Zone(**payload.model_dump())
    db.add(row)
    db.flush()
    log_admin_action(db, actor=current_user, action="create", entity="zone", entity_id=row.id, metadata=payload.model_dump())
    db.commit()
    db.refresh(row)
    return row


@router.patch("/zones/{zone_id}", response_model=ZoneRead)
def update_zone(
    zone_id: int,
    payload: ZoneUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.require_super_admin),
):
    row = db.get(Zone, zone_id)
    if row is None:
        raise HTTPException(status_code=404, detail="Zone not found")

    updates = payload.model_dump(exclude_unset=True)
    for k, v in updates.items():
        setattr(row, k, v)
    db.add(row)
    log_admin_action(db, actor=current_user, action="update", entity="zone", entity_id=row.id, metadata=updates)
    db.commit()
    db.refresh(row)
    return row


@router.delete("/zones/{zone_id}", response_model=GenericOk)
def delete_zone(
    zone_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.require_super_admin),
):
    row = db.get(Zone, zone_id)
    if row is None:
        raise HTTPException(status_code=404, detail="Zone not found")
    db.delete(row)
    log_admin_action(db, actor=current_user, action="delete", entity="zone", entity_id=zone_id)
    db.commit()
    return GenericOk(ok=True)


@router.get("/workforce", response_model=list[WorkforceRead])
def list_workforce(
    q: str | None = Query(default=None),
    db: Session = Depends(get_db),
    _: User = Depends(deps.require_super_admin),
):
    qry = (
        db.query(User, WorkforceAssignment, Zone)
        .outerjoin(WorkforceAssignment, WorkforceAssignment.user_id == User.id)
        .outerjoin(Zone, Zone.id == WorkforceAssignment.zone_id)
        .filter(User.role == UserRole.WASTE_WORKER)
    )
    if q:
        p = f"%{q.strip()}%"
        qry = qry.filter(or_(User.email.ilike(p), User.full_name.ilike(p)))

    rows = qry.order_by(User.id.desc()).all()
    return [
        WorkforceRead(
            user_id=user.id,
            full_name=user.full_name,
            email=user.email,
            role=user.role.value,
            is_active=user.is_active,
            zone_id=assign.zone_id if assign else None,
            zone_name=zone.name if zone else None,
        )
        for user, assign, zone in rows
    ]


@router.post("/workforce", response_model=WorkforceRead, status_code=status.HTTP_201_CREATED)
def create_workforce(
    payload: WorkforceCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.require_super_admin),
):
    existing = db.query(User).filter(func.lower(User.email) == payload.email.lower()).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already exists")

    user = User(
        full_name=payload.name,
        email=payload.email.lower(),
        hashed_password=get_password_hash(payload.password),
        role=UserRole.WASTE_WORKER,
        is_active=True,
    )
    db.add(user)
    db.flush()

    assignment = WorkforceAssignment(user_id=user.id, zone_id=payload.zone_id, active=True)
    db.add(assignment)
    log_admin_action(
        db,
        actor=current_user,
        action="create",
        entity="workforce_user",
        entity_id=user.id,
        metadata={"zone_id": payload.zone_id},
    )
    db.commit()
    zone_name = db.query(Zone.name).filter(Zone.id == payload.zone_id).scalar() if payload.zone_id else None
    return WorkforceRead(
        user_id=user.id,
        full_name=user.full_name,
        email=user.email,
        role=user.role.value,
        is_active=user.is_active,
        zone_id=payload.zone_id,
        zone_name=zone_name,
    )


@router.patch("/workforce/{user_id}", response_model=WorkforceRead)
def update_workforce(
    user_id: int,
    payload: WorkforceUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.require_super_admin),
):
    user = db.get(User, user_id)
    if user is None or user.role != UserRole.WASTE_WORKER:
        raise HTTPException(status_code=404, detail="Workforce user not found")

    updates = payload.model_dump(exclude_unset=True)
    if "full_name" in updates:
        user.full_name = updates["full_name"]
    if "is_active" in updates:
        user.is_active = updates["is_active"]
    db.add(user)

    assignment = db.query(WorkforceAssignment).filter(WorkforceAssignment.user_id == user.id).first()
    if assignment and "is_active" in updates:
        assignment.active = updates["is_active"]
        db.add(assignment)

    log_admin_action(db, actor=current_user, action="update", entity="workforce_user", entity_id=user.id, metadata=updates)
    db.commit()

    zone_id = assignment.zone_id if assignment else None
    zone_name = db.query(Zone.name).filter(Zone.id == zone_id).scalar() if zone_id else None
    return WorkforceRead(
        user_id=user.id,
        full_name=user.full_name,
        email=user.email,
        role=user.role.value,
        is_active=user.is_active,
        zone_id=zone_id,
        zone_name=zone_name,
    )


@router.post("/workforce/{user_id}/assign-zone", response_model=WorkforceRead)
def assign_workforce_zone(
    user_id: int,
    payload: WorkforceAssignZoneBody,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.require_super_admin),
):
    user = db.get(User, user_id)
    if user is None or user.role != UserRole.WASTE_WORKER:
        raise HTTPException(status_code=404, detail="Workforce user not found")

    if payload.zone_id is not None:
        zone = db.get(Zone, payload.zone_id)
        if zone is None:
            raise HTTPException(status_code=404, detail="Zone not found")

    row = db.query(WorkforceAssignment).filter(WorkforceAssignment.user_id == user.id).first()
    if row is None:
        row = WorkforceAssignment(user_id=user.id, zone_id=payload.zone_id, active=user.is_active)
    else:
        row.zone_id = payload.zone_id
    db.add(row)

    log_admin_action(
        db,
        actor=current_user,
        action="assign_zone",
        entity="workforce_user",
        entity_id=user.id,
        metadata={"zone_id": payload.zone_id},
    )
    db.commit()

    zone_name = db.query(Zone.name).filter(Zone.id == payload.zone_id).scalar() if payload.zone_id else None
    return WorkforceRead(
        user_id=user.id,
        full_name=user.full_name,
        email=user.email,
        role=user.role.value,
        is_active=user.is_active,
        zone_id=payload.zone_id,
        zone_name=zone_name,
    )


@router.get("/pcc/summary", response_model=PccSummaryResponse)
def pcc_summary(
    db: Session = Depends(get_db),
    _: User = Depends(deps.require_super_admin),
):
    credited = db.query(func.coalesce(func.sum(Transaction.amount_pcc), 0.0)).filter(
        and_(Transaction.tx_type == TransactionType.CREDIT, Transaction.amount_pcc.is_not(None))
    ).scalar() or 0.0
    debited = db.query(func.coalesce(func.sum(Transaction.amount_pcc), 0.0)).filter(
        and_(Transaction.tx_type == TransactionType.DEBIT, Transaction.amount_pcc.is_not(None))
    ).scalar() or 0.0
    total = db.query(func.count(Transaction.id)).scalar() or 0
    return PccSummaryResponse(total_credited=float(credited), total_debited=float(debited), net_pcc=float(credited - debited), tx_count=int(total))


@router.get("/pcc/settings", response_model=PccSettingsRead)
def get_pcc_settings(
    db: Session = Depends(get_db),
    _: User = Depends(deps.require_super_admin),
):
    unit, multipliers, updated_at = _get_pcc_settings(db)
    return PccSettingsRead(pcc_unit_kgco2e=unit, quality_multipliers=multipliers, updated_at=updated_at)


@router.put("/pcc/settings", response_model=PccSettingsRead)
def put_pcc_settings(
    payload: PccSettingsUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.require_super_admin),
):
    data = payload.model_dump(exclude_unset=True)
    if "pcc_unit_kgco2e" in data:
        _upsert_setting(db, "pcc_unit_kgco2e", float(data["pcc_unit_kgco2e"]), current_user)
    if "quality_multipliers" in data:
        cleaned = {str(k).lower(): float(v) for k, v in (data["quality_multipliers"] or {}).items()}
        _upsert_setting(db, "quality_multipliers", cleaned, current_user)
    log_admin_action(db, actor=current_user, action="update", entity="pcc_settings", entity_id="global", metadata=data)
    db.commit()
    return get_pcc_settings(db=db, _=current_user)


@router.get("/pcc/emission-factors", response_model=list[PccEmissionFactorItem])
def list_pcc_emission_factors(
    db: Session = Depends(get_db),
    _: User = Depends(deps.require_super_admin),
):
    rows = db.query(EmissionFactor).order_by(EmissionFactor.category.asc()).all()
    return [
        PccEmissionFactorItem(
            id=row.id,
            waste_category=row.category,
            kgco2e_per_kg=float(row.kgco2e_per_kg),
            active=bool(row.active),
            updated_at=row.updated_at,
        )
        for row in rows
    ]


@router.post("/pcc/emission-factors", response_model=PccEmissionFactorItem, status_code=status.HTTP_201_CREATED)
def create_pcc_emission_factor(
    payload: PccEmissionFactorCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.require_super_admin),
):
    category = payload.waste_category.strip().lower()
    existing = db.query(EmissionFactor).filter(func.lower(EmissionFactor.category) == category).first()
    if existing:
        raise HTTPException(status_code=409, detail="Emission factor already exists for this category")
    row = EmissionFactor(category=category, kgco2e_per_kg=payload.kgco2e_per_kg, active=payload.active)
    db.add(row)
    db.flush()
    log_admin_action(db, actor=current_user, action="create", entity="emission_factor", entity_id=row.id, metadata={"waste_category": category})
    db.commit()
    db.refresh(row)
    return PccEmissionFactorItem(id=row.id, waste_category=row.category, kgco2e_per_kg=float(row.kgco2e_per_kg), active=bool(row.active), updated_at=row.updated_at)


@router.patch("/pcc/emission-factors/{factor_id}", response_model=PccEmissionFactorItem)
def update_pcc_emission_factor(
    factor_id: int,
    payload: PccEmissionFactorUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.require_super_admin),
):
    row = db.get(EmissionFactor, factor_id)
    if row is None:
        raise HTTPException(status_code=404, detail="Emission factor not found")
    updates = payload.model_dump(exclude_unset=True)
    if "kgco2e_per_kg" in updates:
        row.kgco2e_per_kg = float(updates["kgco2e_per_kg"])
    if "active" in updates:
        row.active = bool(updates["active"])
    db.add(row)
    log_admin_action(db, actor=current_user, action="update", entity="emission_factor", entity_id=row.id, metadata=updates)
    db.commit()
    db.refresh(row)
    return PccEmissionFactorItem(id=row.id, waste_category=row.category, kgco2e_per_kg=float(row.kgco2e_per_kg), active=bool(row.active), updated_at=row.updated_at)


@router.delete("/pcc/emission-factors/{factor_id}", response_model=GenericOk)
def delete_pcc_emission_factor(
    factor_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.require_super_admin),
):
    row = db.get(EmissionFactor, factor_id)
    if row is None:
        raise HTTPException(status_code=404, detail="Emission factor not found")
    row.active = False
    db.add(row)
    log_admin_action(db, actor=current_user, action="delete", entity="emission_factor", entity_id=row.id)
    db.commit()
    return GenericOk(ok=True)


@router.get("/pcc/transactions", response_model=PccTransactionListResponse)
def pcc_transactions(
    date_from: datetime | None = Query(default=None),
    date_to: datetime | None = Query(default=None),
    user_id: int | None = Query(default=None),
    tx_type: str | None = Query(default=None),
    type: str | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=200),
    db: Session = Depends(get_db),
    _: User = Depends(deps.require_super_admin),
):
    qry = db.query(Transaction)
    if date_from:
        qry = qry.filter(Transaction.created_at >= date_from)
    if date_to:
        qry = qry.filter(Transaction.created_at <= date_to)
    if user_id is not None:
        qry = qry.filter(Transaction.user_id == user_id)
    effective_type = tx_type or type
    if effective_type:
        qry = qry.filter(func.lower(Transaction.tx_type.cast(String)) == effective_type.lower())

    total = qry.count()
    credited = qry.filter(Transaction.tx_type == TransactionType.CREDIT).with_entities(func.coalesce(func.sum(Transaction.amount_pcc), 0.0)).scalar() or 0.0
    debited = qry.filter(Transaction.tx_type == TransactionType.DEBIT).with_entities(func.coalesce(func.sum(Transaction.amount_pcc), 0.0)).scalar() or 0.0
    rows = (
        qry.order_by(Transaction.created_at.desc(), Transaction.id.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    items = [
        PccTransactionItem(
            id=row.id,
            user_id=row.user_id,
            type=row.tx_type.value if hasattr(row.tx_type, "value") else str(row.tx_type),
            amount_pcc=float(row.amount_pcc or 0.0),
            reason=row.reason,
            ref_type=row.ref_type,
            ref_id=row.ref_id,
            created_by_user_id=row.created_by_user_id,
            created_at=row.created_at,
        )
        for row in rows
    ]
    return PccTransactionListResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        total_credited=float(credited),
        total_debited=float(debited),
        net_pcc=float(credited - debited),
        transactions_count=total,
    )


@router.get("/pcc/transactions/export.csv", response_class=PlainTextResponse)
def export_pcc_transactions_v2(
    date_from: datetime | None = Query(default=None),
    date_to: datetime | None = Query(default=None),
    user_id: int | None = Query(default=None),
    tx_type: str | None = Query(default=None),
    type: str | None = Query(default=None),
    db: Session = Depends(get_db),
    _: User = Depends(deps.require_super_admin),
):
    qry = db.query(Transaction)
    if date_from:
        qry = qry.filter(Transaction.created_at >= date_from)
    if date_to:
        qry = qry.filter(Transaction.created_at <= date_to)
    if user_id is not None:
        qry = qry.filter(Transaction.user_id == user_id)
    effective_type = tx_type or type
    if effective_type:
        qry = qry.filter(func.lower(Transaction.tx_type.cast(String)) == effective_type.lower())

    rows = qry.order_by(Transaction.created_at.desc(), Transaction.id.desc()).all()
    out = StringIO()
    w = csv.writer(out)
    w.writerow(["id", "user_id", "type", "amount_pcc", "reason", "ref_type", "ref_id", "created_by_user_id", "created_at"])
    for row in rows:
        w.writerow([
            row.id,
            row.user_id,
            row.tx_type.value if hasattr(row.tx_type, "value") else str(row.tx_type),
            row.amount_pcc or 0,
            row.reason or "",
            row.ref_type or "",
            row.ref_id or "",
            row.created_by_user_id or "",
            row.created_at.isoformat(),
        ])
    return out.getvalue()


@router.post("/pcc/award", response_model=PccActionResponse)
def pcc_award_single(
    payload: PccAwardBody,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.require_super_admin_or_verified_worker),
):
    result = award_reference(db, reference_type=payload.reference_type, reference_id=payload.reference_id, actor=current_user)
    db.commit()
    return PccActionResponse(
        reference_type=payload.reference_type,
        reference_id=payload.reference_id,
        transaction_id=result.transaction.id,
        amount=result.amount,
        pcc_status="awarded",
    )


@router.post("/pcc/award/bulk", response_model=PccBulkAwardResponse)
def pcc_award_bulk(
    payload: PccBulkAwardBody,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.require_super_admin_or_verified_worker),
):
    awarded: list[PccAwardedItem] = []
    skipped: list[PccSkippedItem] = []
    for item in payload.items:
        try:
            result = award_reference(db, reference_type=item.reference_type, reference_id=item.reference_id, actor=current_user)
            db.commit()
            awarded.append(PccAwardedItem(reference_type=item.reference_type, reference_id=item.reference_id, amount=result.amount))
        except HTTPException as exc:
            db.rollback()
            skipped.append(PccSkippedItem(reference_type=item.reference_type, reference_id=item.reference_id, reason=str(exc.detail)))
        except Exception as exc:  # noqa: BLE001
            db.rollback()
            skipped.append(PccSkippedItem(reference_type=item.reference_type, reference_id=item.reference_id, reason=str(exc)))
    return PccBulkAwardResponse(awarded=awarded, skipped=skipped)


@router.post("/pcc/revoke", response_model=PccActionResponse)
def pcc_revoke(
    payload: PccRevokeBody,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.require_super_admin_or_verified_worker),
):
    tx = revoke_reference(
        db,
        reference_type=payload.reference_type,
        reference_id=payload.reference_id,
        actor=current_user,
        reason=payload.reason,
    )
    db.commit()
    return PccActionResponse(
        reference_type=payload.reference_type,
        reference_id=payload.reference_id,
        transaction_id=tx.id,
        amount=float(tx.amount_pcc or 0.0),
        pcc_status="revoked",
    )


@router.get("/logs/citizen-segregation", response_model=CitizenSegregationLogListResponse)
def list_citizen_segregation_logs(
    q: str | None = Query(default=None),
    pcc_status: str | None = Query(default=None),
    date_from: datetime | None = Query(default=None),
    date_to: datetime | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=200),
    db: Session = Depends(get_db),
    _: User = Depends(deps.require_super_admin_or_verified_worker),
):
    qry = (
        db.query(SegregationLog, User, Household)
        .join(User, SegregationLog.citizen_id == User.id)
        .outerjoin(Household, Household.id == SegregationLog.household_id)
    )
    if q:
        p = f"%{q.strip()}%"
        qry = qry.filter(or_(User.full_name.ilike(p), User.email.ilike(p)))
    if pcc_status:
        qry = qry.filter(func.lower(SegregationLog.pcc_status) == pcc_status.lower())
    if date_from:
        qry = qry.filter(SegregationLog.created_at >= date_from)
    if date_to:
        qry = qry.filter(SegregationLog.created_at <= date_to)

    total = qry.count()
    rows = (
        qry.order_by(SegregationLog.created_at.desc(), SegregationLog.id.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    items = [
        CitizenSegregationLogItem(
            id=log.id,
            user_id=user.id,
            user_name=user.full_name or user.email,
            household=hh.name if hh else None,
            waste_category=log.waste_category,
            weight_kg=float(log.weight_kg or (log.dry_kg or 0.0) + (log.wet_kg or 0.0) + (log.reject_kg or 0.0)),
            quality_score=float(log.quality_score) if log.quality_score is not None else None,
            quality_level=log.quality_level,
            pcc_status=(log.pcc_status or "pending"),
            awarded_pcc_amount=float(log.awarded_pcc_amount) if log.awarded_pcc_amount is not None else None,
            created_at=log.created_at,
            evidence_image_url=log.evidence_image_url,
        )
        for log, user, hh in rows
    ]
    return CitizenSegregationLogListResponse(items=items, total=total, page=page, page_size=page_size)


@router.get("/logs/bulk-generator", response_model=BulkGeneratorLogListResponse)
def list_bulk_generator_logs(
    q: str | None = Query(default=None),
    verification_status: str | None = Query(default=None),
    pcc_status: str | None = Query(default=None),
    date_from: datetime | None = Query(default=None),
    date_to: datetime | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=200),
    db: Session = Depends(get_db),
    _: User = Depends(deps.require_super_admin_or_verified_worker),
):
    qry = (
        db.query(WasteLog, User, BulkGenerator)
        .join(User, WasteLog.user_id == User.id)
        .outerjoin(BulkGenerator, BulkGenerator.id == WasteLog.bulk_generator_id)
    )
    if q:
        p = f"%{q.strip()}%"
        qry = qry.filter(
            or_(
                User.full_name.ilike(p),
                User.email.ilike(p),
                BulkGenerator.organization_name.ilike(p),
            )
        )
    if verification_status:
        qry = qry.filter(func.lower(WasteLog.verification_status) == verification_status.lower())
    if pcc_status:
        qry = qry.filter(func.lower(WasteLog.pcc_status) == pcc_status.lower())
    if date_from:
        qry = qry.filter(WasteLog.logged_at >= date_from)
    if date_to:
        qry = qry.filter(WasteLog.logged_at <= date_to)

    total = qry.count()
    rows = (
        qry.order_by(WasteLog.logged_at.desc(), WasteLog.id.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    items = [
        BulkGeneratorLogItem(
            id=log.id,
            user_id=user.id,
            org_name=bg.organization_name if bg else None,
            waste_category=str(log.category.value if hasattr(log.category, "value") else log.category).lower() if log.category else None,
            weight_kg=float(log.weight_kg or log.logged_weight or 0.0),
            quality_level=log.quality_level,
            verification_status=log.verification_status or "pending",
            pcc_status=log.pcc_status or "pending",
            awarded_pcc_amount=float(log.awarded_pcc_amount) if log.awarded_pcc_amount is not None else None,
            created_at=log.logged_at,
        )
        for log, user, bg in rows
    ]
    return BulkGeneratorLogListResponse(items=items, total=total, page=page, page_size=page_size)


@router.get("/reports/demo-requests.csv", response_class=PlainTextResponse)
def export_demo_requests(
    date_from: datetime | None = Query(default=None),
    date_to: datetime | None = Query(default=None),
    db: Session = Depends(get_db),
    _: User = Depends(deps.require_super_admin),
):
    qry = db.query(DemoRequest)
    if date_from:
        qry = qry.filter(DemoRequest.created_at >= date_from)
    if date_to:
        qry = qry.filter(DemoRequest.created_at <= date_to)
    rows = qry.order_by(DemoRequest.created_at.desc()).all()
    out = StringIO()
    w = csv.writer(out)
    w.writerow(["id", "name", "organization", "org_type", "email", "status", "created_at"])
    for row in rows:
        w.writerow([row.id, row.name, row.organization, row.org_type, row.email, row.status, row.created_at.isoformat()])
    return out.getvalue()


@router.get("/reports/contact-messages.csv", response_class=PlainTextResponse)
def export_contact_messages(
    date_from: datetime | None = Query(default=None),
    date_to: datetime | None = Query(default=None),
    db: Session = Depends(get_db),
    _: User = Depends(deps.require_super_admin),
):
    qry = db.query(ContactMessage)
    if date_from:
        qry = qry.filter(ContactMessage.created_at >= date_from)
    if date_to:
        qry = qry.filter(ContactMessage.created_at <= date_to)
    rows = qry.order_by(ContactMessage.created_at.desc()).all()
    out = StringIO()
    w = csv.writer(out)
    w.writerow(["id", "name", "email", "subject", "status", "is_read", "created_at"])
    for row in rows:
        w.writerow([row.id, row.name, row.email, row.subject or "", row.status, row.is_read, row.created_at.isoformat()])
    return out.getvalue()


@router.get("/reports/pcc-transactions.csv", response_class=PlainTextResponse)
def export_pcc_transactions(
    date_from: datetime | None = Query(default=None),
    date_to: datetime | None = Query(default=None),
    db: Session = Depends(get_db),
    _: User = Depends(deps.require_super_admin),
):
    qry = db.query(Transaction)
    if date_from:
        qry = qry.filter(Transaction.created_at >= date_from)
    if date_to:
        qry = qry.filter(Transaction.created_at <= date_to)
    rows = qry.order_by(Transaction.created_at.desc()).all()
    out = StringIO()
    w = csv.writer(out)
    w.writerow(["id", "user_id", "type", "amount_pcc", "reason", "created_at"])
    for row in rows:
        w.writerow([
            row.id,
            row.user_id,
            row.tx_type.value if hasattr(row.tx_type, "value") else str(row.tx_type),
            row.amount_pcc or 0,
            row.reason or "",
            row.created_at.isoformat(),
        ])
    return out.getvalue()


@router.get("/reports/users.csv", response_class=PlainTextResponse)
def export_users(
    db: Session = Depends(get_db),
    _: User = Depends(deps.require_super_admin),
):
    rows = db.query(User).order_by(User.id.desc()).all()
    out = StringIO()
    w = csv.writer(out)
    w.writerow(["id", "full_name", "email", "role", "is_active"])
    for row in rows:
        w.writerow([row.id, row.full_name or "", row.email, row.role.value, row.is_active])
    return out.getvalue()


@router.get("/audit-logs", response_model=AuditLogListResponse)
def list_audit_logs(
    actor: str | None = Query(default=None),
    action: str | None = Query(default=None),
    entity: str | None = Query(default=None),
    date_from: datetime | None = Query(default=None),
    date_to: datetime | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=200),
    db: Session = Depends(get_db),
    _: User = Depends(deps.require_super_admin),
):
    qry = db.query(AuditLog)
    if actor:
        p = f"%{actor.strip()}%"
        qry = qry.filter(AuditLog.actor_email.ilike(p))
    if action:
        qry = qry.filter(AuditLog.action == action)
    if entity:
        qry = qry.filter(AuditLog.entity == entity)
    if date_from:
        qry = qry.filter(AuditLog.created_at >= date_from)
    if date_to:
        qry = qry.filter(AuditLog.created_at <= date_to)

    total = qry.count()
    rows = (
        qry.order_by(AuditLog.created_at.desc(), AuditLog.id.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    items = [
        AuditLogItem(
            id=row.id,
            actor_user_id=row.actor_user_id,
            actor_email=row.actor_email,
            action=row.action,
            entity=row.entity,
            entity_id=row.entity_id,
            metadata=row.meta_json or {},
            created_at=row.created_at,
        )
        for row in rows
    ]
    return AuditLogListResponse(items=items, total=total)


@router.get("/settings", response_model=SettingsRead)
def get_settings(
    db: Session = Depends(get_db),
    _: User = Depends(deps.require_super_admin),
):
    ef_rows = db.query(EmissionFactor).filter(EmissionFactor.active.is_(True)).all()
    ef_map = {row.category: float(row.kgco2e_per_kg) for row in ef_rows}

    return SettingsRead(
        pcc_unit_kgco2e=float(_setting(db, "pcc_unit_kgco2e", SETTINGS_DEFAULTS["pcc_unit_kgco2e"])),
        emission_factors=ef_map,
        quality_multipliers=dict(_setting(db, "quality_multipliers", SETTINGS_DEFAULTS["quality_multipliers"])),
        feature_flags=dict(_setting(db, "feature_flags", SETTINGS_DEFAULTS["feature_flags"])),
    )


@router.put("/settings", response_model=SettingsRead)
def update_settings(
    payload: SettingsUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.require_super_admin),
):
    update_data = payload.model_dump(exclude_unset=True)
    if "pcc_unit_kgco2e" in update_data:
        _upsert_setting(db, "pcc_unit_kgco2e", update_data["pcc_unit_kgco2e"], current_user)
    if "quality_multipliers" in update_data:
        _upsert_setting(db, "quality_multipliers", update_data["quality_multipliers"], current_user)
    if "feature_flags" in update_data:
        _upsert_setting(db, "feature_flags", update_data["feature_flags"], current_user)
    if "emission_factors" in update_data:
        for category, factor in update_data["emission_factors"].items():
            row = db.query(EmissionFactor).filter(EmissionFactor.category == category).first()
            if row is None:
                row = EmissionFactor(category=category, kgco2e_per_kg=factor, active=True)
            else:
                row.kgco2e_per_kg = factor
                row.active = True
            db.add(row)

    log_admin_action(
        db,
        actor=current_user,
        action="update",
        entity="platform_settings",
        entity_id="global",
        metadata=update_data,
    )
    db.commit()

    return get_settings(db=db, _=current_user)
