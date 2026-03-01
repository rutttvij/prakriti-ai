from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any

from fastapi import HTTPException
from sqlalchemy import func, text
from sqlalchemy.orm import Session

from app.models.admin_ops import PlatformSetting
from app.models.bulk import Transaction, TransactionStatus, TransactionType, Wallet, WasteLog
from app.models.household import SegregationLog
from app.models.notification import Notification
from app.models.pcc import EmissionFactor
from app.models.user import User
from app.services.admin_audit_service import log_admin_action

DEFAULT_PCC_UNIT = 10.0
DEFAULT_QUALITY_MULTIPLIERS = {"low": 0.8, "medium": 1.0, "high": 1.1}


@dataclass
class AwardResult:
    amount: float
    transaction: Transaction


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def _setting(db: Session, key: str, default: Any) -> Any:
    row = db.query(PlatformSetting).filter(PlatformSetting.key == key).first()
    return row.value_json if row else default


def _normalize_quality_level(level: str | None, quality_score: float | None = None) -> str:
    if level:
        v = str(level).strip().lower()
        if v in {"low", "medium", "high"}:
            return v
    if quality_score is None:
        return "medium"

    score = float(quality_score)
    if score > 1.0:
        if score >= 85:
            return "high"
        if score >= 60:
            return "medium"
        return "low"

    if score >= 0.85:
        return "high"
    if score >= 0.60:
        return "medium"
    return "low"


def _normalized_category(raw: str | None) -> str:
    if not raw:
        return "mixed"
    v = raw.strip().lower().replace("_", "-")
    if v in {"e-waste", "ewaste", "e waste"}:
        return "e-waste"
    if v == "wet":
        return "organic"
    if v == "dry":
        return "mixed"
    return v


def _emission_factor(db: Session, waste_category: str) -> float:
    category = _normalized_category(waste_category)
    row = db.query(EmissionFactor).filter(
        func.lower(EmissionFactor.category) == category,
        EmissionFactor.active.is_(True),
    ).first()
    if not row and category != "mixed":
        row = db.query(EmissionFactor).filter(
            func.lower(EmissionFactor.category) == "mixed",
            EmissionFactor.active.is_(True),
        ).first()
    if not row:
        raise HTTPException(status_code=400, detail=f"No active emission factor for category '{category}'")
    return float(row.kgco2e_per_kg)


def _quality_multiplier(db: Session, level: str) -> float:
    multipliers = _setting(db, "quality_multipliers", DEFAULT_QUALITY_MULTIPLIERS)
    if not isinstance(multipliers, dict):
        multipliers = DEFAULT_QUALITY_MULTIPLIERS
    return float(multipliers.get(level, DEFAULT_QUALITY_MULTIPLIERS.get(level, 1.0)))


def _pcc_unit(db: Session) -> float:
    value = _setting(db, "pcc_unit_kgco2e", DEFAULT_PCC_UNIT)
    try:
        unit = float(value)
    except (TypeError, ValueError):
        unit = DEFAULT_PCC_UNIT
    if unit <= 0:
        unit = DEFAULT_PCC_UNIT
    return unit


def compute_pcc_award(
    db: Session,
    *,
    weight_kg: float,
    waste_category: str | None,
    quality_level: str | None,
    quality_score: float | None = None,
) -> float:
    if weight_kg <= 0:
        raise HTTPException(status_code=400, detail="weight_kg must be > 0")
    level = _normalize_quality_level(quality_level, quality_score)
    factor = _emission_factor(db, waste_category or "mixed")
    multiplier = _quality_multiplier(db, level)
    unit = _pcc_unit(db)
    co2e = float(weight_kg) * factor * multiplier
    return round(co2e / unit, 2)


def _ensure_wallet(db: Session, user_id: int) -> Wallet:
    wallet = db.query(Wallet).filter(Wallet.user_id == user_id).order_by(Wallet.id.asc()).first()
    if wallet:
        return wallet
    db.execute(text("ALTER TABLE IF EXISTS wallets ALTER COLUMN bulk_generator_id DROP NOT NULL;"))
    wallet = Wallet(user_id=user_id, org_id=None, balance_points=0.0, balance_pcc=0.0, lifetime_credited=0.0, lifetime_debited=0.0)
    db.add(wallet)
    db.flush()
    return wallet


def _create_notification(db: Session, *, user_id: int, title: str, body: str) -> None:
    db.add(Notification(user_id=user_id, title=title, body=body, is_read=False))


def _existing_credit(db: Session, *, reference_type: str, reference_id: int) -> Transaction | None:
    return db.query(Transaction).filter(
        Transaction.ref_type == reference_type,
        Transaction.ref_id == reference_id,
        Transaction.tx_type == TransactionType.CREDIT,
    ).order_by(Transaction.id.desc()).first()


def _existing_debit(db: Session, *, reference_type: str, reference_id: int) -> Transaction | None:
    return db.query(Transaction).filter(
        Transaction.ref_type == reference_type,
        Transaction.ref_id == reference_id,
        Transaction.tx_type == TransactionType.DEBIT,
    ).order_by(Transaction.id.desc()).first()


def _award_citizen_log(db: Session, *, log: SegregationLog, actor: User) -> AwardResult:
    user_id = log.citizen_id
    if user_id is None:
        raise HTTPException(status_code=400, detail="Citizen log has no user_id")

    if log.pcc_status == "awarded" or bool(getattr(log, "pcc_awarded", False)):
        existing = _existing_credit(db, reference_type="citizen_log", reference_id=log.id)
        if existing:
            raise HTTPException(status_code=409, detail="PCC already awarded for this log")
    if log.pcc_status == "revoked":
        raise HTTPException(status_code=409, detail="PCC already revoked for this log")

    amount = compute_pcc_award(
        db,
        weight_kg=float(log.weight_kg or (log.dry_kg or 0) + (log.wet_kg or 0) + (log.reject_kg or 0)),
        waste_category=log.waste_category,
        quality_level=log.quality_level,
        quality_score=log.quality_score if log.quality_score is not None else float(log.segregation_score or 0),
    )
    wallet = _ensure_wallet(db, user_id)
    wallet.balance_pcc = float(wallet.balance_pcc or 0.0) + amount
    wallet.balance_points = float(wallet.balance_points or 0.0) + amount
    wallet.lifetime_credited = float(wallet.lifetime_credited or 0.0) + amount

    tx = Transaction(
        wallet_id=wallet.id,
        user_id=user_id,
        created_by_user_id=actor.id,
        tx_type=TransactionType.CREDIT,
        status=TransactionStatus.COMPLETED,
        amount_points=amount,
        amount_pcc=amount,
        reason=f"Award for citizen log #{log.id}",
        ref_type="citizen_log",
        ref_id=log.id,
        description=f"PCC awarded for citizen segregation log #{log.id}",
        meta_json={"reference_type": "citizen_log", "reference_id": log.id, "weight_kg": float(log.weight_kg or 0)},
    )
    db.add(wallet)
    db.add(tx)

    now = utc_now()
    log.pcc_status = "awarded"
    log.awarded_pcc_amount = amount
    log.awarded_at = now
    log.awarded_by_user_id = actor.id
    log.pcc_awarded = True
    log.pcc_awarded_at = now
    log.awarded_pcc_tokens = amount

    _create_notification(
        db,
        user_id=user_id,
        title="PCC Awarded",
        body=f"{amount} PCC awarded for segregation log #{log.id}.",
    )
    log_admin_action(
        db,
        actor=actor,
        action="pcc_awarded",
        entity="citizen_log",
        entity_id=log.id,
        metadata={"amount": amount, "reference_type": "citizen_log", "reference_id": log.id},
    )
    db.flush()
    return AwardResult(amount=amount, transaction=tx)


def _award_bulk_log(db: Session, *, log: WasteLog, actor: User) -> AwardResult:
    user_id = log.user_id
    if user_id is None:
        raise HTTPException(status_code=400, detail="Bulk log has no user_id")
    if log.verification_status != "verified":
        raise HTTPException(status_code=400, detail="Bulk log must be verified before award")
    if log.pcc_status == "awarded":
        raise HTTPException(status_code=409, detail="PCC already awarded for this log")
    if log.pcc_status == "revoked":
        raise HTTPException(status_code=409, detail="PCC already revoked for this log")

    amount = compute_pcc_award(
        db,
        weight_kg=float(log.weight_kg or log.logged_weight or 0),
        waste_category=str(log.category.value if hasattr(log.category, "value") else log.category),
        quality_level=log.quality_level,
        quality_score=None,
    )
    wallet = _ensure_wallet(db, user_id)
    wallet.balance_pcc = float(wallet.balance_pcc or 0.0) + amount
    wallet.balance_points = float(wallet.balance_points or 0.0) + amount
    wallet.lifetime_credited = float(wallet.lifetime_credited or 0.0) + amount

    tx = Transaction(
        wallet_id=wallet.id,
        user_id=user_id,
        created_by_user_id=actor.id,
        tx_type=TransactionType.CREDIT,
        status=TransactionStatus.COMPLETED,
        amount_points=amount,
        amount_pcc=amount,
        reason=f"Award for bulk log #{log.id}",
        ref_type="bulk_log",
        ref_id=log.id,
        description=f"PCC awarded for bulk generator log #{log.id}",
        meta_json={"reference_type": "bulk_log", "reference_id": log.id, "weight_kg": float(log.weight_kg or 0)},
    )
    db.add(wallet)
    db.add(tx)

    now = utc_now()
    log.pcc_status = "awarded"
    log.awarded_pcc_amount = amount
    log.awarded_at = now
    log.awarded_by_user_id = actor.id

    _create_notification(
        db,
        user_id=user_id,
        title="PCC Awarded",
        body=f"{amount} PCC awarded for bulk waste log #{log.id}.",
    )
    log_admin_action(
        db,
        actor=actor,
        action="pcc_awarded",
        entity="bulk_log",
        entity_id=log.id,
        metadata={"amount": amount, "reference_type": "bulk_log", "reference_id": log.id},
    )
    db.flush()
    return AwardResult(amount=amount, transaction=tx)


def award_reference(db: Session, *, reference_type: str, reference_id: int, actor: User) -> AwardResult:
    reference_type = reference_type.strip().lower()
    existing = _existing_credit(db, reference_type=reference_type, reference_id=reference_id)
    if existing:
        raise HTTPException(status_code=409, detail="PCC already awarded for this log")

    if reference_type == "citizen_log":
        log = db.get(SegregationLog, reference_id)
        if log is None:
            raise HTTPException(status_code=404, detail="Citizen log not found")
        return _award_citizen_log(db, log=log, actor=actor)

    if reference_type == "bulk_log":
        log = db.get(WasteLog, reference_id)
        if log is None:
            raise HTTPException(status_code=404, detail="Bulk log not found")
        return _award_bulk_log(db, log=log, actor=actor)

    raise HTTPException(status_code=400, detail="reference_type must be citizen_log or bulk_log")


def revoke_reference(db: Session, *, reference_type: str, reference_id: int, actor: User, reason: str | None = None) -> Transaction:
    reference_type = reference_type.strip().lower()
    credit = _existing_credit(db, reference_type=reference_type, reference_id=reference_id)
    if credit is None:
        raise HTTPException(status_code=404, detail="Awarded credit transaction not found")

    existing_debit = _existing_debit(db, reference_type=reference_type, reference_id=reference_id)
    if existing_debit is not None:
        raise HTTPException(status_code=409, detail="PCC already revoked for this log")

    if reference_type == "citizen_log":
        log = db.get(SegregationLog, reference_id)
        if log is None:
            raise HTTPException(status_code=404, detail="Citizen log not found")
        if log.pcc_status != "awarded":
            raise HTTPException(status_code=409, detail="Citizen log is not in awarded status")
        user_id = log.citizen_id
    elif reference_type == "bulk_log":
        log = db.get(WasteLog, reference_id)
        if log is None:
            raise HTTPException(status_code=404, detail="Bulk log not found")
        if log.pcc_status != "awarded":
            raise HTTPException(status_code=409, detail="Bulk log is not in awarded status")
        user_id = log.user_id
    else:
        raise HTTPException(status_code=400, detail="reference_type must be citizen_log or bulk_log")

    if user_id is None:
        raise HTTPException(status_code=400, detail="Linked log has no user_id")

    amount = float(credit.amount_pcc or credit.amount_points or 0.0)
    wallet = _ensure_wallet(db, user_id)
    wallet.balance_pcc = float(wallet.balance_pcc or 0.0) - amount
    wallet.balance_points = float(wallet.balance_points or 0.0) - amount
    wallet.lifetime_debited = float(wallet.lifetime_debited or 0.0) + amount

    debit = Transaction(
        wallet_id=wallet.id,
        user_id=user_id,
        created_by_user_id=actor.id,
        tx_type=TransactionType.DEBIT,
        status=TransactionStatus.COMPLETED,
        amount_points=amount,
        amount_pcc=amount,
        reason=(reason or f"Revoke for {reference_type} #{reference_id}"),
        ref_type=reference_type,
        ref_id=reference_id,
        description=f"PCC revoked for {reference_type} #{reference_id}",
        meta_json={
            "reference_type": reference_type,
            "reference_id": reference_id,
            "credit_transaction_id": credit.id,
            "reason": reason,
        },
    )

    db.add(wallet)
    db.add(debit)

    if reference_type == "citizen_log":
        log.pcc_status = "revoked"
        log.pcc_awarded = False
        log.award_reason = reason
    else:
        log.pcc_status = "revoked"

    _create_notification(
        db,
        user_id=user_id,
        title="PCC Revoked",
        body=f"{amount} PCC was revoked for {reference_type.replace('_', ' ')} #{reference_id}.",
    )
    log_admin_action(
        db,
        actor=actor,
        action="pcc_revoked",
        entity=reference_type,
        entity_id=reference_id,
        metadata={"amount": amount, "reference_type": reference_type, "reference_id": reference_id, "reason": reason},
    )

    db.flush()
    return debit
