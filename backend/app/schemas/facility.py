from datetime import datetime
from typing import Optional
from pydantic import BaseModel


class FacilityCreate(BaseModel):
    name: str
    type: str  # BIOMETHANIZATION, W2E, RECYCLING, SCRAP_SHOP, OTHER
    address: Optional[str] = None
    ward: Optional[str] = None
    city: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    capacity_tpd: Optional[float] = None
    contact_person: Optional[str] = None
    contact_phone: Optional[str] = None


class FacilityRead(BaseModel):
    id: int
    name: str
    type: str
    address: Optional[str]
    ward: Optional[str]
    city: Optional[str]
    latitude: Optional[float]
    longitude: Optional[float]
    capacity_tpd: Optional[float]
    contact_person: Optional[str]
    contact_phone: Optional[str]
    created_at: datetime
    is_active: bool

    class Config:
        from_attributes = True
