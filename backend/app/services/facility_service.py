from sqlalchemy.orm import Session
from app.models.facility import Facility
from datetime import datetime


def create_facility(db: Session, data):
    facility = Facility(
        name=data.name,
        type=data.type,
        address=data.address,
        ward=data.ward,
        city=data.city,
        latitude=data.latitude,
        longitude=data.longitude,
        capacity_tpd=data.capacity_tpd,
        contact_person=data.contact_person,
        contact_phone=data.contact_phone,
        created_at=datetime.utcnow(),
        is_active=True,
    )
    db.add(facility)
    db.commit()
    db.refresh(facility)
    return facility


def update_facility(db: Session, facility: Facility, data):
    for field, value in data.dict().items():
        setattr(facility, field, value)
    db.commit()
    db.refresh(facility)
    return facility
