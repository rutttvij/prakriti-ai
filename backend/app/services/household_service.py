from typing import Optional

from sqlalchemy.orm import Session

from app.models.household import Household
from app.schemas.household import HouseholdCreate


def get_my_household(db: Session, user_id: int) -> Optional[Household]:
    return (
        db.query(Household)
        .filter(Household.owner_user_id == user_id)
        .order_by(Household.id.desc())
        .first()
    )


def create_household_for_user(
    db: Session, user_id: int, data: HouseholdCreate
) -> Household:
    household = Household(
        name=data.name,
        address=data.address,
        ward=data.ward,
        city=data.city,
        pincode=data.pincode,
        # citizens cannot mark themselves as bulk generators directly
        is_bulk_generator=False,
        owner_user_id=user_id,
    )
    db.add(household)
    db.commit()
    db.refresh(household)
    return household


def update_household_for_user(
    db: Session, user_id: int, data: HouseholdCreate
) -> Household:
    household = get_my_household(db, user_id)
    if not household:
        return create_household_for_user(db, user_id, data)

    household.name = data.name
    household.address = data.address
    household.ward = data.ward
    household.city = data.city
    household.pincode = data.pincode
    # keep is_bulk_generator as-is for now (admin may manage it)

    db.commit()
    db.refresh(household)
    return household


def link_existing_household_to_user(
    db: Session, user_id: int, household_id: int
) -> Household:
    household = db.query(Household).get(household_id)
    if not household:
        raise ValueError("Household not found")

    if household.owner_user_id and household.owner_user_id != user_id:
        # Someone else already owns this household
        raise PermissionError("Household is already linked to another user")

    household.owner_user_id = user_id
    db.commit()
    db.refresh(household)
    return household
