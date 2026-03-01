from datetime import datetime, timezone
import enum

from sqlalchemy import (
    Column,
    Integer,
    String,
    DateTime,
    ForeignKey,
    Float,
    Enum,
    Boolean,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship

from app.core.database import Base


def utc_now():
    return datetime.now(timezone.utc)


class BulkApprovalStatus(str, enum.Enum):
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"


class WasteLogCategory(str, enum.Enum):
    DRY = "DRY"
    WET = "WET"
    PLASTIC = "PLASTIC"
    METAL = "METAL"
    GLASS = "GLASS"
    E_WASTE = "E_WASTE"
    HAZARDOUS = "HAZARDOUS"
    ORGANIC = "ORGANIC"


class WasteLogStatus(str, enum.Enum):
    LOGGED = "LOGGED"
    PICKUP_REQUESTED = "PICKUP_REQUESTED"
    PICKED_UP = "PICKED_UP"
    VERIFIED = "VERIFIED"
    REJECTED = "REJECTED"


class PickupRequestStatus(str, enum.Enum):
    REQUESTED = "REQUESTED"
    ACCEPTED = "ACCEPTED"
    IN_TRANSIT = "IN_TRANSIT"
    PICKED_UP = "PICKED_UP"
    CANCELLED = "CANCELLED"


class TransactionType(str, enum.Enum):
    CREDIT = "CREDIT"
    DEBIT = "DEBIT"
    ADJUSTMENT = "ADJUSTMENT"


class TransactionStatus(str, enum.Enum):
    COMPLETED = "COMPLETED"
    REVERSED = "REVERSED"


class BulkGenerator(Base):
    __tablename__ = "bulk_generators"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False, index=True)

    organization_name = Column(String(255), nullable=False)
    organization_type = Column(String(100), nullable=True)
    address = Column(String(500), nullable=True)
    city = Column(String(120), nullable=True)
    pincode = Column(String(6), nullable=True)
    license_number = Column(String(120), nullable=True, index=True)

    approval_status = Column(
        Enum(BulkApprovalStatus, name="bulkapprovalstatus"),
        nullable=False,
        default=BulkApprovalStatus.PENDING,
    )
    approved_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    approved_at = Column(DateTime(timezone=True), nullable=True)

    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)

    user = relationship("User", foreign_keys=[user_id], backref="bulk_generator_profile")
    approved_by = relationship("User", foreign_keys=[approved_by_user_id], backref="approved_bulk_generators")
    waste_logs = relationship("WasteLog", back_populates="bulk_generator")
    wallet = relationship("Wallet", back_populates="bulk_generator", uselist=False)


class WasteLog(Base):
    __tablename__ = "waste_logs"

    id = Column(Integer, primary_key=True, index=True)
    bulk_generator_id = Column(Integer, ForeignKey("bulk_generators.id"), nullable=True, index=True)
    created_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    org_id = Column(Integer, nullable=True, index=True)

    category = Column(Enum(WasteLogCategory, name="wastelogcategory"), nullable=False, index=True)
    weight_kg = Column(Float, nullable=False)
    logged_weight = Column(Float, nullable=True)
    photo_path = Column(String(500), nullable=False)
    image_url = Column(String(500), nullable=True)
    notes = Column(String(1000), nullable=True)
    verification_status = Column(String(16), nullable=False, default="pending", index=True)
    quality_level = Column(String(16), nullable=True, index=True)
    pcc_status = Column(String(16), nullable=False, default="pending", index=True)
    awarded_pcc_amount = Column(Float, nullable=True)
    awarded_at = Column(DateTime(timezone=True), nullable=True)
    awarded_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)

    status = Column(
        Enum(WasteLogStatus, name="wastelogstatus"),
        nullable=False,
        default=WasteLogStatus.LOGGED,
        index=True,
    )
    logged_at = Column(DateTime(timezone=True), default=utc_now, nullable=False, index=True)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)

    bulk_generator = relationship("BulkGenerator", back_populates="waste_logs")
    created_by = relationship("User", foreign_keys=[created_by_user_id], backref="created_waste_logs")
    user = relationship("User", foreign_keys=[user_id], backref="pcc_waste_logs")
    awarded_by = relationship("User", foreign_keys=[awarded_by_user_id], backref="awarded_bulk_waste_logs")
    pickup_requests = relationship("PickupRequest", back_populates="waste_log")
    verification = relationship("Verification", back_populates="waste_log", uselist=False)


class PickupRequest(Base):
    __tablename__ = "pickup_requests"

    id = Column(Integer, primary_key=True, index=True)
    waste_log_id = Column(Integer, ForeignKey("waste_logs.id"), nullable=False, index=True)
    requested_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    assigned_worker_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)

    status = Column(
        Enum(PickupRequestStatus, name="pickuprequeststatus"),
        nullable=False,
        default=PickupRequestStatus.REQUESTED,
        index=True,
    )
    scheduled_at = Column(DateTime(timezone=True), nullable=True)
    status_note = Column(String(500), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)

    waste_log = relationship("WasteLog", back_populates="pickup_requests")
    requested_by = relationship("User", foreign_keys=[requested_by_user_id], backref="bulk_pickup_requests")
    assigned_worker = relationship("User", foreign_keys=[assigned_worker_id], backref="assigned_pickups")
    verification = relationship("Verification", back_populates="pickup_request", uselist=False)


class Verification(Base):
    __tablename__ = "verifications"

    id = Column(Integer, primary_key=True, index=True)
    waste_log_id = Column(Integer, ForeignKey("waste_logs.id"), unique=True, nullable=False, index=True)
    pickup_request_id = Column(Integer, ForeignKey("pickup_requests.id"), nullable=True, index=True)
    verified_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    verifier_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)

    verified_weight_kg = Column(Float, nullable=False)
    verified_weight = Column(Float, nullable=True)
    contamination_rate = Column(Float, nullable=True)
    quality_score = Column(Float, nullable=False, default=1.0)
    evidence_path = Column(String(500), nullable=False)
    evidence_url = Column(String(500), nullable=True)
    remarks = Column(String(1000), nullable=True)
    verified_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)

    carbon_saved_kg = Column(Float, nullable=False, default=0.0)
    points_awarded = Column(Float, nullable=False, default=0.0)
    meta_json = Column("metadata", JSONB, nullable=False, server_default="{}")

    waste_log = relationship("WasteLog", back_populates="verification")
    pickup_request = relationship("PickupRequest", back_populates="verification")
    verified_by = relationship("User", foreign_keys=[verified_by_user_id], backref="bulk_verifications")
    verifier = relationship("User", foreign_keys=[verifier_id], backref="pcc_verifications")


class Wallet(Base):
    __tablename__ = "wallets"

    id = Column(Integer, primary_key=True, index=True)
    bulk_generator_id = Column(Integer, ForeignKey("bulk_generators.id"), unique=True, nullable=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    org_id = Column(Integer, nullable=True, index=True)

    balance_points = Column(Float, nullable=False, default=0.0)
    balance_pcc = Column(Float, nullable=False, default=0.0)
    lifetime_credited = Column(Float, nullable=False, default=0.0)
    lifetime_debited = Column(Float, nullable=False, default=0.0)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)

    bulk_generator = relationship("BulkGenerator", back_populates="wallet")
    transactions = relationship("Transaction", back_populates="wallet")


class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(Integer, primary_key=True, index=True)
    wallet_id = Column(Integer, ForeignKey("wallets.id"), nullable=False, index=True)
    verification_id = Column(Integer, ForeignKey("verifications.id"), nullable=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    created_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    org_id = Column(Integer, nullable=True, index=True)

    tx_type = Column(Enum(TransactionType, name="transactiontype"), nullable=False, default=TransactionType.CREDIT)
    type = Column(String(20), nullable=True)
    status = Column(
        Enum(TransactionStatus, name="transactionstatus"),
        nullable=False,
        default=TransactionStatus.COMPLETED,
    )
    amount_points = Column(Float, nullable=False)
    amount_pcc = Column(Float, nullable=True)
    reason = Column(String(500), nullable=True)
    ref_type = Column(String(50), nullable=True)
    ref_id = Column(Integer, nullable=True)
    description = Column(String(500), nullable=True)
    meta_json = Column("metadata", JSONB, nullable=False, server_default="{}")
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False, index=True)

    wallet = relationship("Wallet", back_populates="transactions")
    verification = relationship("Verification", backref="transactions")
    actor = relationship("User", foreign_keys=[created_by_user_id], backref="issued_transactions")
