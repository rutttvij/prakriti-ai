from __future__ import annotations

from dataclasses import dataclass
from typing import Optional

from sqlalchemy.orm import Session

from app.models.bulk import Transaction, TransactionStatus, TransactionType, Wallet
from app.models.pcc import CarbonLedger, EmissionFactor

PCC_UNIT_KGCO2E = 1.0

DEFAULT_EMISSION_FACTORS = {
    "plastic": 2.5,
    "paper": 1.8,
    "glass": 0.6,
    "metal": 4.0,
    "organic": 1.2,
    "ewaste": 3.5,
}


@dataclass
class CreditResult:
    carbon_saved_kgco2e: float
    pcc_awarded: float
    wallet_balance: float
    wallet_id: int
    transaction_id: int
    ledger_id: int


def _normalized_category(category: str) -> str:
    c = (category or "").strip().lower()
    return "ewaste" if c in {"e_waste", "e-waste"} else c


def compute_carbon_saved(weight: float, category: str, db: Optional[Session] = None) -> float:
    if weight <= 0:
        return 0.0

    category_key = _normalized_category(category)
    factor = None
    if db is not None:
        row = (
            db.query(EmissionFactor)
            .filter(EmissionFactor.category == category_key, EmissionFactor.active.is_(True))
            .first()
        )
        if row:
            factor = float(row.kgco2e_per_kg)

    if factor is None:
        factor = DEFAULT_EMISSION_FACTORS.get(category_key, 1.0)

    return round(weight * factor, 6)


def compute_pcc(carbon_saved: float, quality_score: float, pcc_unit_kgco2e: float = PCC_UNIT_KGCO2E) -> float:
    safe_quality = min(1.2, max(0.0, quality_score))
    if pcc_unit_kgco2e <= 0:
        raise ValueError("PCC unit must be > 0.")
    base_pcc = carbon_saved / pcc_unit_kgco2e
    return round(base_pcc * safe_quality, 6)


def derive_quality_score(contamination_rate: Optional[float], explicit_quality_score: Optional[float]) -> float:
    if explicit_quality_score is not None:
        return min(1.2, max(0.0, explicit_quality_score))
    if contamination_rate is not None:
        return min(1.2, max(0.0, 1.0 - contamination_rate))
    return 1.0


def credit_pcc_transaction(
    db: Session,
    *,
    user_id: Optional[int],
    org_id: Optional[int],
    ref_type: str,
    ref_id: int,
    carbon_saved_kgco2e: float,
    pcc_awarded: float,
    quality_score: float,
    reason: str,
) -> CreditResult:
    if pcc_awarded < 0 or carbon_saved_kgco2e < 0:
        raise ValueError("Carbon and PCC amounts must be non-negative.")
    if user_id is None and org_id is None:
        raise ValueError("At least one of user_id or org_id is required.")

    existing = (
        db.query(CarbonLedger)
        .filter(CarbonLedger.ref_type == ref_type, CarbonLedger.ref_id == ref_id)
        .first()
    )
    if existing:
        raise ValueError("PCC for this reference has already been credited.")

    wallet_query = db.query(Wallet)
    if user_id is not None:
        wallet_query = wallet_query.filter(Wallet.user_id == user_id)
    else:
        wallet_query = wallet_query.filter(Wallet.user_id.is_(None))

    if org_id is not None:
        wallet_query = wallet_query.filter(Wallet.org_id == org_id)
    else:
        wallet_query = wallet_query.filter(Wallet.org_id.is_(None))

    wallet = wallet_query.first()
    if wallet is None:
        wallet = Wallet(
            user_id=user_id,
            org_id=org_id,
            balance_pcc=0.0,
            balance_points=0.0,
            lifetime_credited=0.0,
            lifetime_debited=0.0,
        )
        db.add(wallet)
        db.flush()

    wallet.balance_pcc = float(wallet.balance_pcc or 0.0) + pcc_awarded
    wallet.balance_points = float(wallet.balance_points or 0.0) + pcc_awarded
    wallet.lifetime_credited = float(wallet.lifetime_credited or 0.0) + pcc_awarded
    db.add(wallet)
    db.flush()

    tx = Transaction(
        wallet_id=wallet.id,
        user_id=user_id,
        org_id=org_id,
        tx_type=TransactionType.CREDIT,
        type="credit",
        status=TransactionStatus.COMPLETED,
        amount_points=pcc_awarded,
        amount_pcc=pcc_awarded,
        reason=reason,
        ref_type=ref_type,
        ref_id=ref_id,
        description=reason,
        meta_json={"quality_score": quality_score},
    )
    db.add(tx)
    db.flush()

    ledger = CarbonLedger(
        ref_type=ref_type,
        ref_id=ref_id,
        user_id=user_id,
        org_id=org_id,
        carbon_saved_kgco2e=carbon_saved_kgco2e,
        pcc_awarded=pcc_awarded,
        quality_score=quality_score,
        details={"reason": reason},
    )
    db.add(ledger)
    db.flush()

    return CreditResult(
        carbon_saved_kgco2e=carbon_saved_kgco2e,
        pcc_awarded=pcc_awarded,
        wallet_balance=float(wallet.balance_pcc or 0.0),
        wallet_id=wallet.id,
        transaction_id=tx.id,
        ledger_id=ledger.id,
    )
