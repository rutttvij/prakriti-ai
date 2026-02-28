from datetime import datetime, date
from enum import Enum
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, EmailStr, Field, constr


class BulkUserRole(str, Enum):
    BULK_MANAGER = "BULK_MANAGER"
    BULK_STAFF = "BULK_STAFF"


class BulkApprovalStatusSchema(str, Enum):
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"


class WasteCategorySchema(str, Enum):
    DRY = "DRY"
    WET = "WET"
    PLASTIC = "PLASTIC"
    METAL = "METAL"
    GLASS = "GLASS"
    E_WASTE = "E_WASTE"
    HAZARDOUS = "HAZARDOUS"
    ORGANIC = "ORGANIC"


class WasteLogStatusSchema(str, Enum):
    LOGGED = "LOGGED"
    PICKUP_REQUESTED = "PICKUP_REQUESTED"
    PICKED_UP = "PICKED_UP"
    VERIFIED = "VERIFIED"
    REJECTED = "REJECTED"


class PickupStatusSchema(str, Enum):
    REQUESTED = "REQUESTED"
    ACCEPTED = "ACCEPTED"
    IN_TRANSIT = "IN_TRANSIT"
    PICKED_UP = "PICKED_UP"
    CANCELLED = "CANCELLED"


class BulkRegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8)
    full_name: Optional[str] = None

    requested_role: BulkUserRole = BulkUserRole.BULK_MANAGER
    organization_name: str = Field(..., min_length=2, max_length=255)
    organization_type: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    pincode: Optional[constr(min_length=6, max_length=6, pattern=r"^\d{6}$")] = None  # type: ignore
    government_id: Optional[constr(min_length=12, max_length=12, pattern=r"^\d{12}$")] = None  # type: ignore
    license_number: Optional[str] = None
    meta: Dict[str, Any] = Field(default_factory=dict)


class BulkGeneratorRead(BaseModel):
    id: int
    user_id: int
    organization_name: str
    organization_type: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    pincode: Optional[str] = None
    license_number: Optional[str] = None
    approval_status: BulkApprovalStatusSchema
    approved_by_user_id: Optional[int] = None
    approved_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True


class WasteLogRead(BaseModel):
    id: int
    bulk_generator_id: int
    created_by_user_id: int
    category: WasteCategorySchema
    weight_kg: float
    photo_path: str
    notes: Optional[str] = None
    status: WasteLogStatusSchema
    logged_at: datetime

    class Config:
        from_attributes = True


class PickupRequestCreate(BaseModel):
    waste_log_id: int
    scheduled_at: Optional[datetime] = None
    note: Optional[str] = None


class PickupRequestStatusUpdate(BaseModel):
    pickup_request_id: int
    status: PickupStatusSchema
    note: Optional[str] = None


class PickupRequestRead(BaseModel):
    id: int
    waste_log_id: int
    requested_by_user_id: int
    assigned_worker_id: Optional[int] = None
    status: PickupStatusSchema
    scheduled_at: Optional[datetime] = None
    status_note: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class VerificationRead(BaseModel):
    id: int
    waste_log_id: int
    pickup_request_id: Optional[int] = None
    verified_by_user_id: int
    verified_weight_kg: float
    evidence_path: str
    remarks: Optional[str] = None
    verified_at: datetime
    carbon_saved_kg: float
    points_awarded: float

    class Config:
        from_attributes = True


class WalletRead(BaseModel):
    id: int
    bulk_generator_id: int
    balance_points: float
    lifetime_credited: float
    lifetime_debited: float
    updated_at: datetime

    class Config:
        from_attributes = True


class DashboardTrendPoint(BaseModel):
    day: date
    logged_weight_kg: float
    verified_weight_kg: float
    carbon_saved_kg: float
    points_credited: float


class CategoryBreakdownPoint(BaseModel):
    category: WasteCategorySchema
    total_weight_kg: float
    verified_weight_kg: float


class BulkDashboardData(BaseModel):
    total_logs: int
    total_logged_weight_kg: float
    total_verified_weight_kg: float
    total_pickup_requests: int
    completed_pickups: int
    segregation_score: float
    total_carbon_saved_kg: float
    wallet_balance_points: float
    trends: List[DashboardTrendPoint]
    category_breakdown: List[CategoryBreakdownPoint]


class ApiEnvelope(BaseModel):
    success: bool = True
    message: str
    data: Optional[Dict[str, Any]] = None
