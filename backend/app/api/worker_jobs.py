from typing import Optional

from fastapi import APIRouter, Depends, File, Form, UploadFile, status
from sqlalchemy.orm import Session

from app.api import deps
from app.core.database import get_db
from app.models.user import User, UserRole
from app.schemas.bulk import ApiEnvelope, VerificationCreate, WorkerPickupStatusUpdate
from app.services.bulk_service import (
    claim_worker_job,
    list_assigned_worker_jobs,
    list_available_worker_jobs,
    update_worker_job_status,
    verify_bulk_waste,
)


router = APIRouter(prefix="/worker", tags=["worker_jobs"])


@router.get("/jobs/available", response_model=ApiEnvelope)
def worker_jobs_available(
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.require_roles(UserRole.WASTE_WORKER, UserRole.SUPER_ADMIN)),
):
    jobs = list_available_worker_jobs(db, current_user=current_user)
    return ApiEnvelope(message="Available jobs fetched.", data={"items": [j.model_dump() for j in jobs]})


@router.get("/jobs/assigned", response_model=ApiEnvelope)
def worker_jobs_assigned(
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.require_roles(UserRole.WASTE_WORKER, UserRole.SUPER_ADMIN)),
):
    jobs = list_assigned_worker_jobs(db, current_user=current_user)
    return ApiEnvelope(message="Assigned jobs fetched.", data={"items": [j.model_dump() for j in jobs]})


@router.post("/jobs/{pickup_request_id}/claim", response_model=ApiEnvelope)
def worker_claim_pickup_job(
    pickup_request_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.require_roles(UserRole.WASTE_WORKER, UserRole.SUPER_ADMIN)),
):
    req = claim_worker_job(db, current_user=current_user, pickup_request_id=pickup_request_id)
    return ApiEnvelope(
        message="Job claimed.",
        data={
            "pickup_request": {
                "id": req.id,
                "status": req.status.value,
                "assigned_worker_id": req.assigned_worker_id,
                "waste_log_id": req.waste_log_id,
            }
        },
    )


@router.post("/jobs/{pickup_request_id}/status", response_model=ApiEnvelope)
def worker_update_pickup_job_status(
    pickup_request_id: int,
    payload: WorkerPickupStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.require_roles(UserRole.WASTE_WORKER, UserRole.SUPER_ADMIN)),
):
    req = update_worker_job_status(
        db,
        current_user=current_user,
        pickup_request_id=pickup_request_id,
        payload=payload,
    )
    return ApiEnvelope(
        message="Job status updated.",
        data={
            "pickup_request": {
                "id": req.id,
                "status": req.status.value,
                "assigned_worker_id": req.assigned_worker_id,
                "waste_log_id": req.waste_log_id,
            }
        },
    )


@router.post("/verifications", response_model=ApiEnvelope, status_code=status.HTTP_201_CREATED)
def worker_submit_verification(
    waste_log_id: int = Form(...),
    pickup_request_id: Optional[int] = Form(None),
    verified_weight_kg: float = Form(...),
    reject_weight_kg: float = Form(0.0),
    notes: Optional[str] = Form(None),
    proof_photo: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.require_roles(UserRole.WASTE_WORKER, UserRole.SUPER_ADMIN)),
):
    payload = VerificationCreate(
        waste_log_id=waste_log_id,
        pickup_request_id=pickup_request_id,
        verified_weight_kg=verified_weight_kg,
        reject_weight_kg=reject_weight_kg,
        notes=notes,
    )
    verification, wallet = verify_bulk_waste(
        db,
        current_user=current_user,
        payload=payload,
        proof_photo=proof_photo,
    )
    return ApiEnvelope(
        message="Verification submitted and credits awarded.",
        data={
            "verification": {
                "id": verification.id,
                "waste_log_id": verification.waste_log_id,
                "verified_weight_kg": verification.verified_weight_kg,
                "reject_weight_kg": verification.reject_weight_kg,
                "score": verification.score,
                "carbon_saved_kgco2e": verification.carbon_saved_kgco2e,
                "pcc_awarded": verification.pcc_awarded,
                "created_at": verification.created_at,
            },
            "wallet": {
                "id": wallet.id,
                "balance_pcc": wallet.balance_pcc,
                "balance_points": wallet.balance_points,
            },
        },
    )
