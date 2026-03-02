from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile, status
from sqlalchemy.orm import Session

from app.api import deps
from app.core.database import get_db
from app.models.bulk import PickupRequestStatus, WasteLogCategory, WasteLogStatus
from app.models.notification import Notification
from app.models.training import TrainingProgress
from app.models.user import User, UserRole
from app.schemas.bulk import (
    ApiEnvelope,
    BulkMeUpdateRequest,
    BulkRegisterRequest,
    PickupRequestCreate,
    PickupStatusSchema,
    WasteCategorySchema,
)
from app.services.bulk_service import (
    create_bulk_pickup_request,
    create_bulk_waste_log,
    create_pickup_request,
    create_waste_log,
    get_bulk_dashboard_summary,
    get_bulk_badges_timeline,
    get_bulk_insights_summary,
    get_bulk_me,
    get_bulk_training_modules,
    list_bulk_pickup_requests,
    list_bulk_waste_logs,
    update_bulk_me,
    update_pickup_status,
    verify_waste_log,
)
from app.services.training_service import evaluate_training_milestone_badges


router = APIRouter(prefix="/bulk", tags=["bulk"])


@router.post("/register", response_model=ApiEnvelope, status_code=status.HTTP_201_CREATED)
def register_bulk_legacy(payload: BulkRegisterRequest, db: Session = Depends(get_db)):
    from app.services.bulk_service import register_bulk_generator

    user, org = register_bulk_generator(db, payload)
    return ApiEnvelope(
        message="Bulk registration submitted for admin approval.",
        data={
            "user": {
                "id": user.id,
                "email": user.email,
                "role": user.role.value,
                "is_active": user.is_active,
            },
            "bulk_org": {
                "id": org.id,
                "organization_name": org.organization_name,
                "status": org.status,
            },
        },
    )


@router.get("/me", response_model=ApiEnvelope)
def bulk_me(
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.require_roles(UserRole.BULK_GENERATOR, UserRole.BULK_MANAGER, UserRole.BULK_STAFF)),
):
    org, summary = get_bulk_me(db, current_user)
    return ApiEnvelope(
        message="Bulk profile fetched.",
        data={
            "organization": {
                "id": org.id,
                "owner_user_id": org.user_id,
                "organization_name": org.organization_name,
                "industry_type": org.industry_type,
                "registration_or_license_no": org.registration_or_license_no,
                "estimated_daily_waste_kg": org.estimated_daily_waste_kg,
                "waste_categories": org.waste_categories or [],
                "address": org.address,
                "ward": org.ward,
                "pincode": org.pincode,
                "status": org.status,
            },
            "summary": summary,
        },
    )


@router.put("/me", response_model=ApiEnvelope)
def bulk_me_update(
    payload: BulkMeUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.require_roles(UserRole.BULK_GENERATOR, UserRole.BULK_MANAGER, UserRole.BULK_STAFF)),
):
    user, org = update_bulk_me(db, current_user=current_user, payload=payload)
    return ApiEnvelope(
        message="Bulk profile updated.",
        data={
            "user": {
                "id": user.id,
                "full_name": user.full_name,
                "email": user.email,
                "pincode": user.pincode,
                "government_id": user.government_id,
                "meta": user.meta or {},
                "role": user.role.value,
            },
            "organization": {
                "id": org.id,
                "organization_name": org.organization_name,
                "industry_type": org.industry_type,
                "registration_or_license_no": org.registration_or_license_no,
                "estimated_daily_waste_kg": org.estimated_daily_waste_kg,
                "waste_categories": org.waste_categories or [],
                "address": org.address,
                "ward": org.ward,
                "pincode": org.pincode,
                "status": org.status,
            },
        },
    )


@router.post("/waste-logs", response_model=ApiEnvelope, status_code=status.HTTP_201_CREATED)
def create_bulk_log(
    category: WasteCategorySchema = Form(...),
    weight_kg: float = Form(...),
    notes: Optional[str] = Form(None),
    photo: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.require_roles(UserRole.BULK_GENERATOR, UserRole.BULK_MANAGER, UserRole.BULK_STAFF)),
):
    log = create_bulk_waste_log(
        db,
        current_user=current_user,
        category=WasteLogCategory(category.value),
        weight_kg=weight_kg,
        notes=notes,
        photo=photo,
    )
    item = {
        "id": log.id,
        "category": log.category.value,
        "weight_kg": float(log.weight_kg),
        "status": log.status.value,
        "notes": log.notes,
        "logged_at": log.logged_at,
    }
    return ApiEnvelope(message="Waste log created.", data={"waste_log": item})


@router.get("/waste-logs", response_model=ApiEnvelope)
def get_bulk_logs(
    status_filter: Optional[WasteLogStatus] = Query(default=None, alias="status"),
    limit: int = Query(default=20, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.require_roles(UserRole.BULK_GENERATOR, UserRole.BULK_MANAGER, UserRole.BULK_STAFF)),
):
    rows = list_bulk_waste_logs(db, current_user=current_user, status=status_filter, limit=limit)
    items = [
        {
            "id": row.id,
            "category": row.category.value,
            "weight_kg": float(row.weight_kg),
            "status": row.status.value,
            "notes": row.notes,
            "logged_at": row.logged_at,
            "bulk_generator_id": row.bulk_generator_id,
            "photo_path": row.photo_path,
        }
        for row in rows
    ]
    return ApiEnvelope(message="Waste logs fetched.", data={"items": items, "waste_logs": items})


@router.post("/pickup-requests", response_model=ApiEnvelope, status_code=status.HTTP_201_CREATED)
def create_bulk_pickup(
    payload: PickupRequestCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.require_roles(UserRole.BULK_GENERATOR, UserRole.BULK_MANAGER, UserRole.BULK_STAFF)),
):
    req = create_bulk_pickup_request(db, current_user=current_user, payload=payload)
    item = {
        "id": req.id,
        "waste_log_id": req.waste_log_id,
        "bulk_org_id": req.bulk_org_id,
        "requested_by_user_id": req.requested_by_user_id,
        "status": req.status.value,
        "scheduled_at": req.scheduled_at,
        "note": req.note or req.status_note,
        "status_note": req.status_note,
        "assigned_worker_id": req.assigned_worker_id,
        "created_at": req.created_at,
        "updated_at": req.updated_at,
    }
    return ApiEnvelope(message="Pickup request created.", data={"pickup_request": item})


@router.get("/pickup-requests", response_model=ApiEnvelope)
def get_bulk_pickups(
    status_filter: Optional[PickupRequestStatus] = Query(default=None, alias="status"),
    limit: int = Query(default=20, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(
        deps.require_roles(UserRole.BULK_GENERATOR, UserRole.BULK_MANAGER, UserRole.BULK_STAFF, UserRole.WASTE_WORKER, UserRole.SUPER_ADMIN)
    ),
):
    if current_user.role in (UserRole.BULK_GENERATOR, UserRole.BULK_MANAGER, UserRole.BULK_STAFF):
        rows = list_bulk_pickup_requests(db, current_user=current_user, status=status_filter, limit=limit)
    else:
        from app.services.bulk_service import list_pickup_requests

        rows = list_pickup_requests(db, current_user=current_user, limit=limit)

    items = [
        {
            "id": row.id,
            "waste_log_id": row.waste_log_id,
            "bulk_org_id": row.bulk_org_id,
            "requested_by_user_id": row.requested_by_user_id,
            "status": row.status.value,
            "scheduled_at": row.scheduled_at,
            "note": row.note or row.status_note,
            "status_note": row.status_note,
            "assigned_worker_id": row.assigned_worker_id,
            "created_at": row.created_at,
            "updated_at": row.updated_at,
        }
        for row in rows
    ]
    return ApiEnvelope(message="Pickup requests fetched.", data={"items": items, "pickup_requests": items})


@router.get("/dashboard/summary", response_model=ApiEnvelope)
def bulk_dashboard_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.require_roles(UserRole.BULK_GENERATOR, UserRole.BULK_MANAGER, UserRole.BULK_STAFF)),
):
    summary = get_bulk_dashboard_summary(db, current_user=current_user)
    return ApiEnvelope(message="Dashboard summary fetched.", data={"summary": summary.model_dump()})


@router.get("/insights/summary", response_model=ApiEnvelope)
def bulk_insights_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.require_roles(UserRole.BULK_GENERATOR, UserRole.BULK_MANAGER, UserRole.BULK_STAFF)),
):
    summary = get_bulk_insights_summary(db, current_user=current_user)
    return ApiEnvelope(message="Insights summary fetched.", data={"summary": summary.model_dump()})


@router.get("/badges/me", response_model=ApiEnvelope)
def bulk_badges_me(
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.require_roles(UserRole.BULK_GENERATOR, UserRole.BULK_MANAGER, UserRole.BULK_STAFF)),
):
    timeline = get_bulk_badges_timeline(db, current_user=current_user)
    return ApiEnvelope(message="Bulk badges fetched.", data=timeline)


@router.get("/training/modules", response_model=ApiEnvelope)
def bulk_training_modules(
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.require_roles(UserRole.BULK_GENERATOR, UserRole.BULK_MANAGER, UserRole.BULK_STAFF)),
):
    modules = get_bulk_training_modules(db)
    return ApiEnvelope(
        message="Training modules fetched.",
        data={
            "modules": [
                {
                    "id": m.id,
                    "title": m.title,
                    "summary": m.summary,
                    "audience": m.audience.value if getattr(m, "audience", None) else None,
                    "difficulty": m.difficulty.value if getattr(m, "difficulty", None) else None,
                    "est_minutes": m.est_minutes,
                    "lessons": [
                        {
                            "id": l.id,
                            "title": l.title,
                            "lesson_type": l.lesson_type.value if getattr(l, "lesson_type", None) else None,
                            "content": l.content,
                            "order_index": l.order_index,
                        }
                        for l in (m.lessons or [])
                    ],
                }
                for m in modules
            ]
        },
    )


@router.post("/training/complete-lesson", response_model=ApiEnvelope)
def bulk_training_complete_lesson(
    module_id: int = Form(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.require_roles(UserRole.BULK_GENERATOR, UserRole.BULK_MANAGER, UserRole.BULK_STAFF)),
):
    from app.models.training import TrainingModule

    module_row = (
        db.query(TrainingModule)
        .filter(TrainingModule.id == module_id, TrainingModule.audience == "bulk_generator")
        .first()
    )
    if module_row is None:
        raise HTTPException(status_code=404, detail="Training module not found.")

    progress = (
        db.query(TrainingProgress)
        .filter(TrainingProgress.user_id == current_user.id, TrainingProgress.module_id == module_id)
        .first()
    )
    if progress is None:
        progress = TrainingProgress(
            user_id=current_user.id,
            module_id=module_id,
            completed=True,
            score=100.0,
            completed_at=datetime.utcnow(),
        )
    else:
        progress.completed = True
        progress.score = 100.0
        progress.completed_at = datetime.utcnow()
    db.add(progress)

    completed_count = (
        db.query(TrainingProgress)
        .join(TrainingModule, TrainingModule.id == TrainingProgress.module_id)
        .filter(
            TrainingProgress.user_id == current_user.id,
            TrainingProgress.completed.is_(True),
            TrainingModule.audience == "bulk_generator",
            TrainingModule.is_published.is_(True),
        )
        .count()
    )
    total_count = (
        db.query(TrainingModule)
        .filter(TrainingModule.audience == "bulk_generator", TrainingModule.is_published.is_(True))
        .count()
    )
    unlocked = evaluate_training_milestone_badges(
        db,
        user_id=current_user.id,
        audience="bulk_generator",
        completed_count=completed_count,
        total_count=total_count,
    )
    unlocked_badges = []
    for badge in unlocked:
        code = badge.code or badge.criteria_key or f"badge_{badge.id}"
        db.add(
            Notification(
                user_id=current_user.id,
                title="Badge Unlocked",
                body=f"You earned {code.upper()} from bulk training milestones.",
                is_read=False,
            )
        )
        unlocked_badges.append(
            {
                "code": code,
                "name": badge.name,
                "description": badge.description,
                "category": badge.category,
                "awarded_at": datetime.utcnow(),
                "metadata": {"source": "training_milestone", "audience": "bulk_generator"},
            }
        )

    db.commit()
    db.refresh(progress)
    return ApiEnvelope(
        message="Lesson marked complete.",
        data={
            "progress": {"module_id": progress.module_id, "completed": progress.completed},
            "newly_unlocked_badges": unlocked_badges,
        },
    )


# ------------------------------
# Legacy endpoints (back-compat)
# ------------------------------
@router.post("/waste-log", response_model=ApiEnvelope, status_code=status.HTTP_201_CREATED)
def bulk_waste_log_legacy(
    category: WasteCategorySchema = Form(...),
    weight_kg: float = Form(...),
    notes: Optional[str] = Form(None),
    photo: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(
        deps.require_roles(UserRole.BULK_GENERATOR, UserRole.BULK_MANAGER, UserRole.BULK_STAFF, UserRole.SUPER_ADMIN)
    ),
):
    log = create_waste_log(db=db, current_user=current_user, category=WasteLogCategory(category.value), weight_kg=weight_kg, notes=notes, photo=photo)
    return ApiEnvelope(message="Waste log created successfully.", data={"waste_log": {"id": log.id, "status": log.status.value}})


@router.post("/pickup-request", response_model=ApiEnvelope, status_code=status.HTTP_201_CREATED)
def bulk_pickup_request_legacy(
    payload: PickupRequestCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        deps.require_roles(UserRole.BULK_GENERATOR, UserRole.BULK_MANAGER, UserRole.BULK_STAFF, UserRole.SUPER_ADMIN)
    ),
):
    req = create_pickup_request(db=db, current_user=current_user, payload=payload)
    return ApiEnvelope(message="Pickup request created successfully.", data={"pickup_request": {"id": req.id, "status": req.status.value}})


@router.patch("/pickup-status", response_model=ApiEnvelope)
def bulk_pickup_status_legacy(
    pickup_request_id: int = Form(...),
    status_value: PickupStatusSchema = Form(..., alias="status"),
    note: Optional[str] = Form(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.require_roles(UserRole.WASTE_WORKER, UserRole.SUPER_ADMIN)),
):
    class _P:
        def __init__(self, pickup_request_id: int, status_value: PickupStatusSchema, note: Optional[str]):
            self.pickup_request_id = pickup_request_id
            self.status = status_value
            self.note = note

    req = update_pickup_status(db=db, current_user=current_user, payload=_P(pickup_request_id, status_value, note))
    return ApiEnvelope(message="Pickup status updated successfully.", data={"pickup_request": {"id": req.id, "status": req.status.value}})


@router.post("/verify", response_model=ApiEnvelope, status_code=status.HTTP_201_CREATED)
def bulk_verify_legacy(
    waste_log_id: int = Form(...),
    verified_weight_kg: float = Form(...),
    remarks: Optional[str] = Form(None),
    pickup_request_id: Optional[int] = Form(None),
    evidence: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.require_roles(UserRole.WASTE_WORKER, UserRole.SUPER_ADMIN)),
):
    verification, wallet = verify_waste_log(
        db=db,
        current_user=current_user,
        waste_log_id=waste_log_id,
        verified_weight_kg=verified_weight_kg,
        remarks=remarks,
        evidence=evidence,
        pickup_request_id=pickup_request_id,
    )
    return ApiEnvelope(
        message="Waste log verified and credits added to wallet.",
        data={
            "verification": {
                "id": verification.id,
                "waste_log_id": verification.waste_log_id,
                "verified_weight_kg": verification.verified_weight_kg,
                "points_awarded": verification.pcc_awarded,
            },
            "wallet": {"id": wallet.id, "balance_points": wallet.balance_points},
        },
    )


@router.get("/dashboard", response_model=ApiEnvelope)
def bulk_dashboard_legacy(
    db: Session = Depends(get_db),
    current_user: User = Depends(
        deps.require_roles(UserRole.BULK_GENERATOR, UserRole.BULK_MANAGER, UserRole.BULK_STAFF, UserRole.SUPER_ADMIN)
    ),
):
    summary = get_bulk_dashboard_summary(db, current_user=current_user)
    return ApiEnvelope(
        message="Bulk dashboard fetched successfully.",
        data={
            "dashboard": {
                "total_logs": summary.total_waste_logs,
                "total_logged_weight_kg": summary.total_logged_weight_kg,
                "total_verified_weight_kg": summary.verified_weight_kg,
                "wallet_balance_points": summary.wallet_balance_pcc,
                "total_pickup_requests": summary.pickup_total,
                "completed_pickups": summary.pickup_completed,
                "segregation_score": summary.segregation_score,
                "total_carbon_saved_kg": summary.carbon_saved_total,
            }
        },
    )
