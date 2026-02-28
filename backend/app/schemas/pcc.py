from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class EmissionFactorUpsert(BaseModel):
    category: str
    kgco2e_per_kg: float = Field(gt=0)
    active: bool = True


class EmissionFactorRead(BaseModel):
    id: int
    category: str
    kgco2e_per_kg: float
    active: bool

    class Config:
        from_attributes = True


class WasteLogCreate(BaseModel):
    category: str
    logged_weight: float = Field(gt=0)
    image_url: Optional[str] = None
    org_id: Optional[int] = None


class WasteLogRead(BaseModel):
    id: int
    user_id: Optional[int] = None
    org_id: Optional[int] = None
    category: str
    logged_weight: float
    image_url: Optional[str] = None
    status: str
    logged_at: datetime


class VerifyWasteLogRequest(BaseModel):
    verified_weight: float = Field(gt=0)
    contamination_rate: Optional[float] = Field(default=None, ge=0, le=1)
    quality_score: Optional[float] = Field(default=None, ge=0, le=1.2)
    evidence_url: str
    org_id: Optional[int] = None


class BadgeRead(BaseModel):
    id: int
    code: Optional[str] = None
    name: str
    category: str
    threshold: Optional[float] = None
    rule_json: Dict[str, Any] = Field(default_factory=dict)
    active: bool = True

    class Config:
        from_attributes = True


class WalletTransactionRead(BaseModel):
    id: int
    type: str
    amount_pcc: float
    reason: Optional[str] = None
    ref_type: Optional[str] = None
    ref_id: Optional[int] = None
    created_at: datetime

    class Config:
        from_attributes = True


class WalletSummary(BaseModel):
    wallet_id: int
    balance_pcc: float
    transactions: List[WalletTransactionRead] = Field(default_factory=list)


class ImpactSummary(BaseModel):
    total_carbon_saved_kgco2e: float
    total_pcc_earned: float
    current_streak_days: int
    rolling_30d_quality_score: Optional[float] = None
    rolling_30d_verified_logs: int


class VerifyWasteLogResponse(BaseModel):
    success: bool
    message: str
    carbon_saved_kgco2e: float
    pcc_awarded: float
    quality_score_used: float
    updated_wallet_balance: float
    newly_awarded_badges: List[BadgeRead] = Field(default_factory=list)


class APIResponse(BaseModel):
    success: bool = True
    message: str
    data: Dict[str, Any] = Field(default_factory=dict)
