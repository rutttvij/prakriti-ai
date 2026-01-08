from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.api import deps
from app.models.facility import Facility
from app.schemas.facility import FacilityCreate, FacilityRead
from app.services.facility_service import create_facility, update_facility

router = APIRouter(prefix="/facilities", tags=["facilities"])

# Create facility (Super Admin Only) endpoint

@router.post("", response_model=FacilityRead)
def create_facility_endpoint(
    body: FacilityCreate,
    db: Session = Depends(get_db),
    current_user = Depends(deps.require_super_admin),
):
    facility = create_facility(db, body)
    return facility

# List all facilities endpoint

@router.get("", response_model=List[FacilityRead])
def list_facilities(
    db: Session = Depends(get_db),
    current_user = Depends(deps.require_super_admin),
):
    return db.query(Facility).order_by(Facility.created_at.desc()).all()

# Update facility endpoint

@router.patch("/{facility_id}", response_model=FacilityRead)
def update_facility_endpoint(
    facility_id: int,
    body: FacilityCreate,
    db: Session = Depends(get_db),
    current_user = Depends(deps.require_super_admin),
):
    facility = db.query(Facility).filter(Facility.id == facility_id).first()
    if not facility:
        raise HTTPException(status_code=404, detail="Facility not found")

    return update_facility(db, facility, body)

# Soft-delete facility endpoint

@router.delete("/{facility_id}")
def delete_facility(
    facility_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(deps.require_super_admin),
):
    facility = db.query(Facility).filter(Facility.id == facility_id).first()
    if not facility:
        raise HTTPException(status_code=404, detail="Facility not found")

    facility.is_active = False
    db.commit()
    return {"message": "Facility deactivated"}
