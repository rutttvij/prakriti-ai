from datetime import datetime, timedelta, timezone

from app.core.database import SessionLocal
from app.core.security import get_password_hash
from app.models.bulk import (
    BulkApprovalStatus,
    BulkGenerator,
    OrganizationStatus,
    PickupRequest,
    PickupRequestStatus,
    Wallet,
    WasteLog,
    WasteLogCategory,
    WasteLogStatus,
)
from app.models.user import User, UserRole


def run() -> None:
    db = SessionLocal()
    try:
        email = "bulk.demo@prakriti.ai"
        user = db.query(User).filter(User.email == email).first()
        if user is None:
            user = User(
                email=email,
                full_name="Demo Bulk Compliance Officer",
                hashed_password=get_password_hash("BulkDemo@123"),
                role=UserRole.BULK_GENERATOR,
                is_active=True,
                government_id="123456789012",
                pincode="400001",
                meta={"contact_mobile": "9876543210"},
            )
            db.add(user)
            db.flush()

        org = db.query(BulkGenerator).filter(BulkGenerator.user_id == user.id).first()
        if org is None:
            org = BulkGenerator(
                user_id=user.id,
                organization_name="Green Arc Corporate Park",
                industry_type="Office",
                registration_or_license_no="LIC-BULK-2026-001",
                estimated_daily_waste_kg=185.0,
                waste_categories=["PLASTIC", "PAPER", "GLASS", "METAL", "WET"],
                address="Plot 21, Central Business District",
                ward="Ward 14",
                pincode="400001",
                approval_status=BulkApprovalStatus.APPROVED,
                status=OrganizationStatus.APPROVED.value,
                approved_by_user_id=user.id,
                approved_at=datetime.now(timezone.utc),
            )
            db.add(org)
            db.flush()

        if not db.query(Wallet).filter(Wallet.bulk_generator_id == org.id).first():
            db.add(
                Wallet(
                    bulk_generator_id=org.id,
                    balance_points=32.0,
                    balance_pcc=32.0,
                    lifetime_credited=32.0,
                    lifetime_debited=0.0,
                )
            )

        if db.query(WasteLog).filter(WasteLog.bulk_generator_id == org.id).count() == 0:
            now = datetime.now(timezone.utc)
            logs = [
                WasteLog(
                    bulk_generator_id=org.id,
                    bulk_org_id=org.id,
                    created_by_user_id=user.id,
                    user_id=user.id,
                    category=WasteLogCategory.PLASTIC,
                    weight_kg=42.5,
                    logged_weight=42.5,
                    notes="Clean PET bottles from cafeteria",
                    status=WasteLogStatus.LOGGED,
                    verification_status="pending",
                    pcc_status="pending",
                    logged_at=now - timedelta(days=2),
                    created_at=now - timedelta(days=2),
                ),
                WasteLog(
                    bulk_generator_id=org.id,
                    bulk_org_id=org.id,
                    created_by_user_id=user.id,
                    user_id=user.id,
                    category=WasteLogCategory.PAPER,
                    weight_kg=58.0,
                    logged_weight=58.0,
                    notes="Office paper bundles",
                    status=WasteLogStatus.PICKUP_REQUESTED,
                    verification_status="pending",
                    pcc_status="pending",
                    logged_at=now - timedelta(days=1),
                    created_at=now - timedelta(days=1),
                ),
                WasteLog(
                    bulk_generator_id=org.id,
                    bulk_org_id=org.id,
                    created_by_user_id=user.id,
                    user_id=user.id,
                    category=WasteLogCategory.WET,
                    weight_kg=67.25,
                    logged_weight=67.25,
                    notes="Food waste from canteen",
                    status=WasteLogStatus.LOGGED,
                    verification_status="pending",
                    pcc_status="pending",
                    logged_at=now,
                    created_at=now,
                ),
            ]
            db.add_all(logs)
            db.flush()

            db.add(
                PickupRequest(
                    waste_log_id=logs[1].id,
                    bulk_org_id=org.id,
                    requested_by_user_id=user.id,
                    status=PickupRequestStatus.REQUESTED,
                    note="Pickup at loading bay B",
                    status_note="Pickup at loading bay B",
                    created_at=now,
                )
            )

        user.meta = {**(user.meta or {}), "bulk_generator_id": org.id}
        db.add(user)
        db.commit()
        print("Bulk demo seed complete:", {"user_id": user.id, "org_id": org.id})
    finally:
        db.close()


if __name__ == "__main__":
    run()
