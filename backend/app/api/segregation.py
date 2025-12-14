from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.api import deps
from app.models.user import User, UserRole
from app.models.household import Household, SegregationLog
from app.schemas.household import (
    HouseholdCreate,
    HouseholdRead,
    HouseholdLinkRequest,
)
from app.schemas.segregation import SegregationLogCreate, SegregationLogRead
from app.services.segregation_service import log_segregation, list_logs_for_worker

router = APIRouter(prefix="/segregation", tags=["segregation"])


# -----------------------
# Internal helpers
# -----------------------


def _get_existing_primary(db: Session, user_id: int) -> Optional[Household]:
    return (
        db.query(Household)
        .filter(
            Household.owner_user_id == user_id,
            Household.is_primary.is_(True),
        )
        .first()
    )


def _set_primary_for_user(db: Session, user_id: int, household: Household) -> Household:
    """
    Make `household` the single primary household for this user.
    """
    db.query(Household).filter(
        Household.owner_user_id == user_id
    ).update({"is_primary": False})
    household.is_primary = True
    db.commit()
    db.refresh(household)
    return household


# -----------------------
# Household management
# -----------------------


@router.post("/households", response_model=HouseholdRead)
def create_household(
    body: HouseholdCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_user),
):
    existing_primary = _get_existing_primary(db, current_user.id)

    make_primary = False
    if body.is_primary is True:
        make_primary = True
    elif existing_primary is None:
        make_primary = True

    household = Household(
        name=body.name,
        address=body.address,
        ward=body.ward,
        city=body.city,
        pincode=body.pincode,
        is_bulk_generator=body.is_bulk_generator,
        owner_user_id=current_user.id,
        is_primary=make_primary,
    )

    db.add(household)
    db.commit()
    db.refresh(household)

    if make_primary:
        household = _set_primary_for_user(db, current_user.id, household)

    return household


@router.get("/households/me", response_model=List[HouseholdRead])
def list_my_households(
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_user),
):
    return (
        db.query(Household)
        .filter(Household.owner_user_id == current_user.id)
        .order_by(Household.is_primary.desc(), Household.created_at.asc())
        .all()
    )


@router.get("/households/primary", response_model=Optional[HouseholdRead])
def get_primary_household(
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_user),
):
    return _get_existing_primary(db, current_user.id)


@router.post(
    "/households/{household_id}/make-primary",
    response_model=HouseholdRead,
)
def make_household_primary(
    household_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_user),
):
    household = (
        db.query(Household)
        .filter(Household.id == household_id)
        .first()
    )

    if household is None:
        raise HTTPException(status_code=404, detail="Household not found")

    if (
        household.owner_user_id != current_user.id
        and current_user.role != UserRole.SUPER_ADMIN
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not allowed to modify this household",
        )

    return _set_primary_for_user(db, household.owner_user_id, household)


@router.post("/households/link", response_model=HouseholdRead)
def link_existing_household(
    body: HouseholdLinkRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_user),
):
    household = (
        db.query(Household)
        .filter(Household.id == body.household_id)
        .first()
    )

    if household is None:
        raise HTTPException(status_code=404, detail="Household not found")

    if (
        household.owner_user_id is not None
        and household.owner_user_id != current_user.id
    ):
        raise HTTPException(
            status_code=400,
            detail="This household is already linked to another user",
        )

    household.owner_user_id = current_user.id

    existing_primary = _get_existing_primary(db, current_user.id)
    if existing_primary is None:
        household.is_primary = True
        db.commit()
        return _set_primary_for_user(db, current_user.id, household)

    db.commit()
    db.refresh(household)
    return household


@router.put("/households/{household_id}", response_model=HouseholdRead)
def update_household(
    household_id: int,
    body: HouseholdCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_user),
):
    household = (
        db.query(Household)
        .filter(Household.id == household_id)
        .first()
    )

    if household is None:
        raise HTTPException(status_code=404, detail="Household not found")

    if (
        household.owner_user_id != current_user.id
        and current_user.role != UserRole.SUPER_ADMIN
    ):
        raise HTTPException(status_code=403, detail="Not allowed to edit this household")

    household.name = body.name
    household.address = body.address
    household.ward = body.ward
    household.city = body.city
    household.pincode = body.pincode

    db.commit()
    db.refresh(household)
    return household


# -----------------------
# Segregation logging
# -----------------------


@router.post("/logs", response_model=SegregationLogRead)
def create_segregation_log(
    body: SegregationLogCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_user),
):
    if current_user.role != UserRole.WASTE_WORKER:
        raise HTTPException(
            status_code=403, detail="Only waste workers can record logs"
        )

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
        waste_report_id=body.waste_report_id,
    )

    return log


@router.get("/logs/me", response_model=List[SegregationLogRead])
def list_my_segregation_logs(
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_user),
):
    if current_user.role != UserRole.WASTE_WORKER:
        raise HTTPException(
            status_code=403, detail="Only waste workers can view this"
        )

    return list_logs_for_worker(db, worker_id=current_user.id)


@router.get(
    "/logs/household/{household_id}",
    response_model=List[SegregationLogRead],
)
def list_logs_for_household(
    household_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_user),
):
    household = (
        db.query(Household).filter(Household.id == household_id).first()
    )
    if household is None:
        raise HTTPException(status_code=404, detail="Household not found")

    if (
        household.owner_user_id != current_user.id
        and current_user.role != UserRole.SUPER_ADMIN
    ):
        raise HTTPException(status_code=403, detail="Not your household")

    return (
        db.query(SegregationLog)
        .filter(SegregationLog.household_id == household_id)
        .order_by(SegregationLog.log_date.desc())
        .all()
    )
