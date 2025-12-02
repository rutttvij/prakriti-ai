from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.api import deps
from app.models.user import User, UserRole
from app.models.household import Household, SegregationLog
from app.schemas.household import HouseholdCreate, HouseholdRead
from app.schemas.segregation import SegregationLogCreate, SegregationLogRead
from app.services.segregation_service import log_segregation

router = APIRouter(prefix="/segregation", tags=["segregation"])

# Register household endpoint

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

# List my households endpoint

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

# Create segregation log (for workers; for now any logged-in user) endpoint

@router.post("/logs", response_model=SegregationLogRead)
def create_segregation_log(
    body: SegregationLogCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_user),
):
    # ensure household exists
    household = (
        db.query(Household).filter(Household.id == body.household_id).first()
    )
    if household is None:
        raise HTTPException(status_code=404, detail="Household not found")

    # later we can restrict to role == WASTE_WORKER
    log = log_segregation(
        db=db,
        household_id=body.household_id,
        worker_id=current_user.id,
        wet_correct=body.wet_correct,
        dry_correct=body.dry_correct,
        reject_correct=body.reject_correct,
        hazardous_present=body.hazardous_present,
        notes=body.notes,
    )

    return log

# List logs for my households (optional but handy) endpoints

@router.get("/logs/household/{household_id}", response_model=List[SegregationLogRead])
def list_logs_for_household(
    household_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_user),
):
    # basic ownership check
    household = db.query(Household).filter(Household.id == household_id).first()
    if household is None:
        raise HTTPException(status_code=404, detail="Household not found")
    if household.owner_user_id != current_user.id:
        # later Super Admin can bypass this
        raise HTTPException(status_code=403, detail="Not your household")

    logs = (
        db.query(SegregationLog)
        .filter(SegregationLog.household_id == household_id)
        .order_by(SegregationLog.log_date.desc())
        .all()
    )
    return logs
