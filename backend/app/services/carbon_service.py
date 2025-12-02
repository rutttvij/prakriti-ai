from datetime import datetime
from typing import Optional

from sqlalchemy.orm import Session

from app.models.carbon import CarbonActivity, CarbonBalance
from app.services.token_service import add_transaction, PCC_PER_CO2E_KG


def _get_or_create_balance(db: Session, user_id: int) -> CarbonBalance:
    balance = db.query(CarbonBalance).filter(CarbonBalance.user_id == user_id).first()
    if balance is None:
        balance = CarbonBalance(
            user_id=user_id,
            total_co2e_kg=0.0,
            total_pcc=0.0,
            updated_at=datetime.utcnow(),
        )
        db.add(balance)
        db.commit()
        db.refresh(balance)
    return balance


def add_carbon_activity(
    db: Session,
    user_id: int,
    activity_type: str,
    co2e_kg: float,
    reference_id: Optional[int] = None,
    description: Optional[str] = None,
) -> CarbonActivity:
    """
    Core carbon engine entry point.
    - Records carbon activity
    - Updates carbon balance
    - Mints PCC via token ledger (1 PCC per kg for now)
    """
    activity = CarbonActivity(
        user_id=user_id,
        activity_type=activity_type,
        reference_id=reference_id,
        description=description,
        co2e_kg=co2e_kg,
        created_at=datetime.utcnow(),
    )
    db.add(activity)

    balance = _get_or_create_balance(db, user_id)
    balance.total_co2e_kg += co2e_kg

    # Mint PCC tokens for this activity
    tokens_to_mint = co2e_kg * PCC_PER_CO2E_KG
    if tokens_to_mint != 0:
        add_transaction(
            db=db,
            user_id=user_id,
            amount=tokens_to_mint,
            tx_type="MINT",
            description=f"Carbon activity: {activity_type}",
        )
        balance.total_pcc += tokens_to_mint

    balance.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(activity)
    db.refresh(balance)

    return activity
