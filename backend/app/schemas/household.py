from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class HouseholdCreate(BaseModel):
    name: str
    address: Optional[str] = None
    ward: Optional[str] = None
    city: Optional[str] = None
    pincode: Optional[str] = None
    is_bulk_generator: bool = False


class HouseholdRead(BaseModel):
    id: int
    name: str
    address: Optional[str] = None
    ward: Optional[str] = None
    city: Optional[str] = None
    pincode: Optional[str] = None
    is_bulk_generator: bool
    created_at: datetime

    class Config:
        from_attributes = True
