from datetime import datetime
import json
from typing import Optional

from sqlalchemy.orm import Session

from app.models.token import TokenAccount, TokenTransaction, TokenBlock, TokenAccount, TokenTransaction, TokenBlock


PCC_PER_CO2E_KG = 1.0  # 1 PCC token per 1 kg CO2e (we can tune later)


def get_or_create_account(db: Session, user_id: int) -> TokenAccount:
    account = db.query(TokenAccount).filter(TokenAccount.user_id == user_id).first()
    if account is None:
        account = TokenAccount(user_id=user_id, balance=0.0)
        db.add(account)
        db.commit()
        db.refresh(account)
    return account


def add_transaction(
    db: Session,
    user_id: int,
    amount: float,
    tx_type: str,
    description: Optional[str] = None,
) -> TokenTransaction:
    """
    amount > 0 => credit
    amount < 0 => debit
    """
    account = get_or_create_account(db, user_id=user_id)

    account.balance += amount

    tx = TokenTransaction(
        account_id=account.id,
        amount=amount,
        type=tx_type,
        description=description,
        created_at=datetime.utcnow(),
    )
    db.add(tx)
    db.commit()
    db.refresh(tx)

    _append_block_for_transaction(db, tx)

    return tx


def _append_block_for_transaction(db: Session, tx: TokenTransaction) -> None:
    # Serialize transaction into a simple string payload
    data = json.dumps(
        {
            "tx_id": tx.id,
            "account_id": tx.account_id,
            "amount": tx.amount,
            "type": tx.type,
            "description": tx.description,
            "created_at": tx.created_at.isoformat(),
        },
        sort_keys=True,
    )

    last_block = (
        db.query(TokenBlock).order_by(TokenBlock.id.desc()).first()
    )

    previous_hash = last_block.hash if last_block else None
    new_hash = TokenBlock.compute_hash(previous_hash, data)

    block = TokenBlock(
        previous_hash=previous_hash,
        hash=new_hash,
        data=data,
        created_at=datetime.utcnow(),
    )
    db.add(block)
    db.commit()
