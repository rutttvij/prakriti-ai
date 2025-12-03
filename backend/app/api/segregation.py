from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.api import deps
from app.models.user import User, UserRole
from app.models.household import Household, SegregationLog
from app.schemas.household import HouseholdCreate, HouseholdRead
from app.schemas.segregation import SegregationLogCreate, SegregationLogRead
from app.services.segregation_service import log_segregation, list_logs_for_worker

router = APIRouter(prefix="/segregation", tags=["segregation"])

# -----------------------
# Household management
# -----------------------


@router.post("/households", response_model=HouseholdRead)
def create_household(
    body: HouseholdCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_user),
):
    household = Household(
        name=body.name,
        address=body.address,
        ward=body.ward,
        city=body.city,
        pincode=body.pincode,
        is_bulk_generator=body.is_bulk_generator,
        owner_user_id=current_user.id,
    )
    db.add(household)
    db.commit()
    db.refresh(household)
    return household


@router.get("/households/me", response_model=List[HouseholdRead])
def list_my_households(
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_user),
):
    households = (
        db.query(Household)
        .filter(Household.owner_user_id == current_user.id)
        .all()
    )
    return households


# -----------------------
# Segregation logging
# -----------------------


@router.post("/logs", response_model=SegregationLogRead)
def create_segregation_log(
    body: SegregationLogCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_user),
):
    # Optional: only waste workers can record logs
    if current_user.role != UserRole.WASTE_WORKER:
        raise HTTPException(status_code=403, detail="Only waste workers can record logs")

    # ensure household exists
    household = (
        db.query(Household).filter(Household.id == body.household_id).first()
    )
    if household is None:
        raise HTTPException(status_code=404, detail="Household not found")

    log = log_segregation(
        db=db,
        household_id=body.household_id,
        worker_id=current_user.id,
        log_date=body.log_date,
        dry_kg=body.dry_kg,
        wet_kg=body.wet_kg,
        reject_kg=body.reject_kg,
        notes=body.notes,
    )

    return log


@router.get("/logs/me", response_model=List[SegregationLogRead])
def list_my_segregation_logs(
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_user),
):
    if current_user.role != UserRole.WASTE_WORKER:
        raise HTTPException(status_code=403, detail="Only waste workers can view this")

    logs = list_logs_for_worker(db, worker_id=current_user.id)
    return logs


@router.get(
    "/logs/household/{household_id}",
    response_model=List[SegregationLogRead],
)
def list_logs_for_household(
    household_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_user),
):
    # basic ownership check
    household = db.query(Household).filter(Household.id == household_id).first()
    if household is None:
        raise HTTPException(status_code=404, detail="Household not found")
    if household.owner_user_id != current_user.id and current_user.role != UserRole.SUPER_ADMIN:
        # Super Admin can bypass ownership
        raise HTTPException(status_code=403, detail="Not your household")

    logs = (
        db.query(SegregationLog)
        .filter(SegregationLog.household_id == household_id)
        .order_by(SegregationLog.log_date.desc())
        .all()
    )
    return logs
