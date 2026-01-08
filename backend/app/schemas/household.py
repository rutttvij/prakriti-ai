from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class HouseholdCreate(BaseModel):
    """
    Used when a citizen creates or updates a household.
    `is_primary` is optional — backend decides whether to set it as primary.
    """
    name: str
    address: Optional[str] = None
    ward: Optional[str] = None
    city: Optional[str] = None
    pincode: Optional[str] = None
    is_bulk_generator: bool = False

    # Optional: allow user to request this to be the primary household
    is_primary: Optional[bool] = None


class HouseholdRead(BaseModel):
    id: int
    name: str
    address: Optional[str] = None
    ward: Optional[str] = None
    city: Optional[str] = None
    pincode: Optional[str] = None
    is_bulk_generator: bool
    is_primary: bool        # ⬅ NEW
    created_at: datetime

    class Config:
        from_attributes = True


class HouseholdLinkRequest(BaseModel):
    """Citizen links themselves to an existing household by ID."""
    household_id: int
