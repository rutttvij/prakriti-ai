from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, EmailStr, Field, constr


class IndustryTypeSchema(str, Enum):
    APARTMENT_SOCIETY = "Apartment Society"
    HOTEL = "Hotel"
    HOSPITAL = "Hospital"
    OFFICE = "Office"
    INSTITUTION = "Institution"
    MALL = "Mall"
    FACTORY = "Factory"


class WasteCategorySchema(str, Enum):
    PLASTIC = "PLASTIC"
    PAPER = "PAPER"
    GLASS = "GLASS"
    METAL = "METAL"
    WET = "WET"
    E_WASTE = "E_WASTE"
    HAZARDOUS = "HAZARDOUS"
    TEXTILE = "TEXTILE"
    MIXED = "MIXED"
    DRY = "DRY"
    ORGANIC = "ORGANIC"


class WasteLogStatusSchema(str, Enum):
    LOGGED = "LOGGED"
    PICKUP_REQUESTED = "PICKUP_REQUESTED"
    PICKED_UP = "PICKED_UP"
    VERIFIED = "VERIFIED"
    CREDITED = "CREDITED"


class PickupStatusSchema(str, Enum):
    REQUESTED = "REQUESTED"
    ASSIGNED = "ASSIGNED"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"


class OrganizationStatusSchema(str, Enum):
    PENDING_APPROVAL = "PENDING_APPROVAL"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"


class ApiEnvelope(BaseModel):
    success: bool = True
    message: str
    data: Optional[Dict[str, Any]] = None


class BulkRegisterRequest(BaseModel):
    full_name: str = Field(..., min_length=2)
    email: EmailStr
    contact_mobile: constr(min_length=10, max_length=15, pattern=r"^\d{10,15}$")  # type: ignore
    government_id: constr(min_length=12, max_length=12, pattern=r"^\d{12}$")  # type: ignore
    password: str = Field(..., min_length=8)
    confirm_password: str = Field(..., min_length=8)

    organization_name: str = Field(..., min_length=2, max_length=255)
    industry_type: IndustryTypeSchema
    registration_or_license_no: Optional[str] = None
    estimated_daily_waste_kg: float = Field(..., gt=0)
    waste_categories: List[WasteCategorySchema] = Field(default_factory=list, min_length=1)
    address: str = Field(..., min_length=5)
    ward: str = Field(..., min_length=1)
    pincode: constr(min_length=6, max_length=6, pattern=r"^\d{6}$")  # type: ignore


class BulkOrgRead(BaseModel):
    id: int
    owner_user_id: int
    organization_name: str
    industry_type: Optional[str] = None
    registration_or_license_no: Optional[str] = None
    estimated_daily_waste_kg: Optional[float] = None
    waste_categories: List[str] = Field(default_factory=list)
    address: Optional[str] = None
    ward: Optional[str] = None
    pincode: Optional[str] = None
    status: OrganizationStatusSchema


class BulkMeResponse(BaseModel):
    organization: BulkOrgRead
    summary: Dict[str, Any]


class BulkMeUpdateRequest(BaseModel):
    full_name: Optional[str] = None
    contact_mobile: Optional[str] = None
    pincode: Optional[str] = None
    organization_name: Optional[str] = None
    industry_type: Optional[IndustryTypeSchema] = None
    registration_or_license_no: Optional[str] = None
    estimated_daily_waste_kg: Optional[float] = None
    waste_categories: Optional[List[WasteCategorySchema]] = None
    address: Optional[str] = None
    ward: Optional[str] = None


class WasteLogCreate(BaseModel):
    category: WasteCategorySchema
    weight_kg: float = Field(..., gt=0)
    notes: Optional[str] = Field(default=None, max_length=1000)


class WasteLogRead(BaseModel):
    id: int
    category: str
    weight_kg: float
    status: str
    notes: Optional[str] = None
    logged_at: datetime


class PickupRequestCreate(BaseModel):
    waste_log_id: int
    scheduled_at: Optional[datetime] = None
    note: Optional[str] = Field(default=None, max_length=500)


class PickupRequestRead(BaseModel):
    id: int
    waste_log_id: int
    bulk_org_id: Optional[int] = None
    status: str
    scheduled_at: Optional[datetime] = None
    note: Optional[str] = None
    assigned_worker_id: Optional[int] = None
    created_at: datetime


class WorkerPickupStatusUpdate(BaseModel):
    status: PickupStatusSchema
    note: Optional[str] = Field(default=None, max_length=500)


class VerificationCreate(BaseModel):
    waste_log_id: int
    pickup_request_id: Optional[int] = None
    verified_weight_kg: float = Field(..., gt=0)
    reject_weight_kg: float = Field(default=0.0, ge=0)
    notes: Optional[str] = Field(default=None, max_length=1000)


class VerificationRead(BaseModel):
    id: int
    waste_log_id: int
    pickup_request_id: Optional[int] = None
    verified_weight_kg: float
    reject_weight_kg: float
    score: float
    carbon_saved_kgco2e: float
    pcc_awarded: float
    created_at: datetime


class BadgeItem(BaseModel):
    code: str
    name: str
    description: Optional[str] = None
    category: str
    awarded_at: datetime
    metadata: Dict[str, Any] = Field(default_factory=dict)


class BadgeTierSummary(BaseModel):
    tier_key: str
    unlocked_count: int
    total_count: int


class BulkDashboardSummary(BaseModel):
    total_waste_logs: int
    total_logged_weight_kg: float
    verified_weight_kg: float
    wallet_balance_pcc: float
    pickup_completed: int
    pickup_total: int
    segregation_score: float
    carbon_saved_total: float
    recent_badges: List[BadgeItem]


class BulkInsightsSummary(BaseModel):
    carbon_saved_total: float
    pcc_earned_total: float
    current_streak_days: int
    quality_30d: float
    earned_badges: List[BadgeItem]
    badge_tiers: List[BadgeTierSummary] = Field(default_factory=list)


class WorkerBadgeSummary(BaseModel):
    earned_count: int
    latest_unlocked: List[BadgeItem] = Field(default_factory=list)


class WorkerJobRead(BaseModel):
    pickup_request_id: int
    waste_log_id: int
    bulk_org_id: Optional[int] = None
    organization_name: Optional[str] = None
    category: str
    weight_kg: float
    status: str
    scheduled_at: Optional[datetime] = None
    note: Optional[str] = None
    created_at: datetime
