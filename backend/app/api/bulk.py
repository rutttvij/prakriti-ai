from typing import Optional

from fastapi import APIRouter, Depends, File, Form, UploadFile, status
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from app.api import deps
from app.core.database import get_db
from app.models.bulk import WasteLogCategory
from app.models.user import User, UserRole
from app.schemas.bulk import (
    ApiEnvelope,
    BulkRegisterRequest,
    PickupRequestCreate,
    PickupRequestStatusUpdate,
    WasteCategorySchema,
)
from app.services.bulk_service import (
    create_pickup_request,
    create_waste_log,
    get_bulk_dashboard,
    list_pickup_requests,
    list_waste_logs,
    register_bulk_generator,
    update_pickup_status,
    verify_waste_log,
)


router = APIRouter(prefix="/bulk", tags=["bulk"])


def _ok(message: str, data: Optional[dict] = None) -> ApiEnvelope:
    return ApiEnvelope(success=True, message=message, data=data or {})


def _error(status_code: int, message: str) -> JSONResponse:
    return JSONResponse(
        status_code=status_code,
        content={"success": False, "message": message, "data": {}},
    )


@router.post("/register", response_model=ApiEnvelope, status_code=status.HTTP_201_CREATED)
def bulk_register(
    payload: BulkRegisterRequest,
    db: Session = Depends(get_db),
):
    """
    Register bulk waste entity user (manager/staff).
    Account stays inactive until admin approval.
    """
    try:
        user, bulk = register_bulk_generator(db, payload)
    except ValueError as exc:
        return _error(status.HTTP_400_BAD_REQUEST, str(exc))
    except Exception:
        return _error(status.HTTP_500_INTERNAL_SERVER_ERROR, "Failed to register bulk generator.")

    return _ok(
        "Bulk registration submitted for admin approval.",
        data={
            "user": {
                "id": user.id,
                "email": user.email,
                "role": user.role.value,
                "is_active": user.is_active,
            },
            "bulk_generator": {
                "id": bulk.id,
                "organization_name": bulk.organization_name,
                "approval_status": bulk.approval_status.value,
            },
        },
    )


@router.post("/waste-log", response_model=ApiEnvelope, status_code=status.HTTP_201_CREATED)
def bulk_waste_log(
    category: WasteCategorySchema = Form(...),
    weight_kg: float = Form(...),
    notes: Optional[str] = Form(None),
    photo: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(
        deps.require_roles(
            UserRole.BULK_GENERATOR,
            UserRole.BULK_MANAGER,
            UserRole.BULK_STAFF,
            UserRole.SUPER_ADMIN,
        )
    ),
):
    """
    Log bulk waste with category, measured weight and supporting photo.
    """
    try:
        log = create_waste_log(
            db=db,
            current_user=current_user,
            category=WasteLogCategory(category.value),
            weight_kg=weight_kg,
            notes=notes,
            photo=photo,
        )
    except ValueError as exc:
        return _error(status.HTTP_400_BAD_REQUEST, str(exc))
    except Exception:
        return _error(status.HTTP_500_INTERNAL_SERVER_ERROR, "Failed to create waste log.")

    return _ok(
        "Waste log created successfully.",
        data={
            "waste_log": {
                "id": log.id,
                "bulk_generator_id": log.bulk_generator_id,
                "category": log.category.value,
                "weight_kg": log.weight_kg,
                "status": log.status.value,
                "photo_path": log.photo_path,
                "logged_at": log.logged_at,
            }
        },
    )


@router.post("/pickup-request", response_model=ApiEnvelope, status_code=status.HTTP_201_CREATED)
def bulk_pickup_request(
    payload: PickupRequestCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        deps.require_roles(
            UserRole.BULK_GENERATOR,
            UserRole.BULK_MANAGER,
            UserRole.BULK_STAFF,
            UserRole.SUPER_ADMIN,
        )
    ),
):
    try:
        req = create_pickup_request(db=db, current_user=current_user, payload=payload)
    except ValueError as exc:
        return _error(status.HTTP_400_BAD_REQUEST, str(exc))
    except Exception:
        return _error(status.HTTP_500_INTERNAL_SERVER_ERROR, "Failed to create pickup request.")

    return _ok(
        "Pickup request created successfully.",
        data={
            "pickup_request": {
                "id": req.id,
                "waste_log_id": req.waste_log_id,
                "status": req.status.value,
                "scheduled_at": req.scheduled_at,
                "status_note": req.status_note,
            }
        },
    )


@router.patch("/pickup-status", response_model=ApiEnvelope)
def bulk_pickup_status(
    payload: PickupRequestStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        deps.require_roles(UserRole.WASTE_WORKER, UserRole.SUPER_ADMIN)
    ),
):
    try:
        req = update_pickup_status(db=db, current_user=current_user, payload=payload)
    except ValueError as exc:
        return _error(status.HTTP_400_BAD_REQUEST, str(exc))
    except Exception:
        return _error(status.HTTP_500_INTERNAL_SERVER_ERROR, "Failed to update pickup status.")

    return _ok(
        "Pickup status updated successfully.",
        data={
            "pickup_request": {
                "id": req.id,
                "waste_log_id": req.waste_log_id,
                "status": req.status.value,
                "assigned_worker_id": req.assigned_worker_id,
                "status_note": req.status_note,
                "updated_at": req.updated_at,
            }
        },
    )


@router.post("/verify", response_model=ApiEnvelope, status_code=status.HTTP_201_CREATED)
def bulk_verify(
    waste_log_id: int = Form(...),
    verified_weight_kg: float = Form(...),
    remarks: Optional[str] = Form(None),
    pickup_request_id: Optional[int] = Form(None),
    evidence: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(
        deps.require_roles(UserRole.WASTE_WORKER, UserRole.SUPER_ADMIN)
    ),
):
    """
    Waste worker verifies actual weight and uploads evidence.
    Carbon credits are minted only at this stage.
    """
    try:
        verification, wallet = verify_waste_log(
            db=db,
            current_user=current_user,
            waste_log_id=waste_log_id,
            verified_weight_kg=verified_weight_kg,
            remarks=remarks,
            evidence=evidence,
            pickup_request_id=pickup_request_id,
        )
    except ValueError as exc:
        return _error(status.HTTP_400_BAD_REQUEST, str(exc))
    except Exception:
        return _error(status.HTTP_500_INTERNAL_SERVER_ERROR, "Failed to verify waste log.")

    return _ok(
        "Waste log verified and credits added to wallet.",
        data={
            "verification": {
                "id": verification.id,
                "waste_log_id": verification.waste_log_id,
                "verified_weight_kg": verification.verified_weight_kg,
                "carbon_saved_kg": verification.carbon_saved_kg,
                "points_awarded": verification.points_awarded,
                "verified_at": verification.verified_at,
                "evidence_path": verification.evidence_path,
            },
            "wallet": {
                "id": wallet.id,
                "balance_points": wallet.balance_points,
                "lifetime_credited": wallet.lifetime_credited,
            },
        },
    )


@router.get("/dashboard", response_model=ApiEnvelope)
def bulk_dashboard(
    days: int = 30,
    bulk_generator_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        deps.require_roles(
            UserRole.BULK_GENERATOR,
            UserRole.BULK_MANAGER,
            UserRole.BULK_STAFF,
            UserRole.WASTE_WORKER,
            UserRole.SUPER_ADMIN,
        )
    ),
):
    try:
        dashboard = get_bulk_dashboard(
            db=db,
            current_user=current_user,
            days=days,
            bulk_generator_id=bulk_generator_id if current_user.role == UserRole.SUPER_ADMIN else None,
        )
    except ValueError as exc:
        return _error(status.HTTP_400_BAD_REQUEST, str(exc))
    except Exception:
        return _error(status.HTTP_500_INTERNAL_SERVER_ERROR, "Failed to fetch bulk dashboard.")

    return _ok("Bulk dashboard fetched successfully.", data={"dashboard": dashboard.dict()})


@router.get("/waste-logs", response_model=ApiEnvelope)
def bulk_waste_logs(
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        deps.require_roles(
            UserRole.BULK_GENERATOR,
            UserRole.BULK_MANAGER,
            UserRole.BULK_STAFF,
            UserRole.SUPER_ADMIN,
        )
    ),
):
    try:
        logs = list_waste_logs(db=db, current_user=current_user, limit=limit)
    except ValueError as exc:
        return _error(status.HTTP_400_BAD_REQUEST, str(exc))
    except Exception:
        return _error(status.HTTP_500_INTERNAL_SERVER_ERROR, "Failed to fetch waste logs.")

    return _ok(
        "Waste logs fetched successfully.",
        data={
            "waste_logs": [
                {
                    "id": log.id,
                    "bulk_generator_id": log.bulk_generator_id,
                    "category": log.category.value,
                    "weight_kg": log.weight_kg,
                    "status": log.status.value,
                    "photo_path": log.photo_path,
                    "notes": log.notes,
                    "logged_at": log.logged_at,
                }
                for log in logs
            ]
        },
    )


@router.get("/pickup-requests", response_model=ApiEnvelope)
def bulk_pickup_requests(
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        deps.require_roles(
            UserRole.BULK_GENERATOR,
            UserRole.BULK_MANAGER,
            UserRole.BULK_STAFF,
            UserRole.WASTE_WORKER,
            UserRole.SUPER_ADMIN,
        )
    ),
):
    try:
        requests = list_pickup_requests(db=db, current_user=current_user, limit=limit)
    except ValueError as exc:
        return _error(status.HTTP_400_BAD_REQUEST, str(exc))
    except Exception:
        return _error(status.HTTP_500_INTERNAL_SERVER_ERROR, "Failed to fetch pickup requests.")

    return _ok(
        "Pickup requests fetched successfully.",
        data={
            "pickup_requests": [
                {
                    "id": req.id,
                    "waste_log_id": req.waste_log_id,
                    "requested_by_user_id": req.requested_by_user_id,
                    "assigned_worker_id": req.assigned_worker_id,
                    "status": req.status.value,
                    "scheduled_at": req.scheduled_at,
                    "status_note": req.status_note,
                    "created_at": req.created_at,
                    "updated_at": req.updated_at,
                }
                for req in requests
            ]
        },
    )
