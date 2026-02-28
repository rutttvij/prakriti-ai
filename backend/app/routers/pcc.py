from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import inspect
from sqlalchemy.orm import Session

from app.api import deps
from app.core.database import get_db
from app.models.badge import Badge, UserBadge
from app.models.bulk import Verification, Wallet, WasteLog, WasteLogCategory, WasteLogStatus, Transaction
from app.models.pcc import EmissionFactor
from app.models.user import User, UserRole
from app.schemas.pcc import (
    APIResponse,
    BadgeRead,
    EmissionFactorUpsert,
    VerifyWasteLogRequest,
    VerifyWasteLogResponse,
    WalletSummary,
    ImpactSummary as ImpactSummarySchema,
    WasteLogCreate,
)
from app.services.badge_engine import build_impact_summary, evaluate_and_award_badges
from app.services.carbon_engine import (
    DEFAULT_EMISSION_FACTORS,
    compute_carbon_saved,
    compute_pcc,
    credit_pcc_transaction,
    derive_quality_score,
)

router = APIRouter(tags=["pcc"])


def _has_column(db: Session, table: str, column: str) -> bool:
    try:
        cols = inspect(db.get_bind()).get_columns(table)
        return any(c.get("name") == column for c in cols)
    except Exception:
        return False


def _norm_category(value: str) -> str:
    v = (value or "").strip().lower()
    if v in {"e_waste", "e-waste"}:
        return "ewaste"
    return v


def _to_wastelog_enum(category: str) -> WasteLogCategory:
    cat = _norm_category(category)
    mapping = {
        "plastic": WasteLogCategory.PLASTIC,
        "paper": WasteLogCategory.DRY,
        "glass": WasteLogCategory.GLASS,
        "metal": WasteLogCategory.METAL,
        "organic": WasteLogCategory.ORGANIC,
        "ewaste": WasteLogCategory.E_WASTE,
    }
    if cat in mapping:
        return mapping[cat]
    try:
        return WasteLogCategory[cat.upper()]
    except KeyError as exc:
        raise HTTPException(status_code=400, detail=f"Unsupported category: {category}") from exc


@router.post("/emission-factors", response_model=APIResponse)
def upsert_emission_factor(
    payload: EmissionFactorUpsert,
    db: Session = Depends(get_db),
    _: User = Depends(deps.require_super_admin),
):
    category = _norm_category(payload.category)
    row = db.query(EmissionFactor).filter(EmissionFactor.category == category).first()
    if row is None:
        row = EmissionFactor(category=category)
    row.kgco2e_per_kg = payload.kgco2e_per_kg
    row.active = payload.active
    db.add(row)
    db.commit()
    db.refresh(row)
    return APIResponse(message="Emission factor saved.", data={"emission_factor": EmissionFactorUpsert(**payload.dict()).dict()})


@router.get("/emission-factors", response_model=APIResponse)
def list_emission_factors(db: Session = Depends(get_db)):
    rows = db.query(EmissionFactor).order_by(EmissionFactor.category.asc()).all()
    data = [{"category": r.category, "kgco2e_per_kg": r.kgco2e_per_kg, "active": r.active} for r in rows]

    if not data:
        data = [{"category": k, "kgco2e_per_kg": v, "active": True} for k, v in DEFAULT_EMISSION_FACTORS.items()]

    return APIResponse(message="Emission factors fetched.", data={"emission_factors": data})


@router.post("/waste-logs", response_model=APIResponse, status_code=status.HTTP_201_CREATED)
def create_waste_log(
    payload: WasteLogCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        deps.require_roles(
            UserRole.CITIZEN,
            UserRole.BULK_GENERATOR,
            UserRole.BULK_MANAGER,
            UserRole.BULK_STAFF,
            UserRole.SUPER_ADMIN,
        )
    ),
):
    category_enum = _to_wastelog_enum(payload.category)
    log = WasteLog(
        user_id=current_user.id,
        created_by_user_id=current_user.id,
        org_id=payload.org_id,
        category=category_enum,
        weight_kg=payload.logged_weight,
        logged_weight=payload.logged_weight,
        photo_path=payload.image_url or "",
        image_url=payload.image_url,
        status=WasteLogStatus.LOGGED,
    )
    db.add(log)
    db.commit()
    db.refresh(log)

    return APIResponse(
        message="Waste log created.",
        data={
            "waste_log": {
                "id": log.id,
                "user_id": log.user_id,
                "org_id": log.org_id,
                "category": payload.category,
                "logged_weight": log.logged_weight or log.weight_kg,
                "image_url": log.image_url,
                "status": log.status.value if hasattr(log.status, "value") else str(log.status),
                "logged_at": log.logged_at,
            }
        },
    )


@router.post("/waste-logs/{waste_log_id}/verify", response_model=VerifyWasteLogResponse)
def verify_waste_log(
    waste_log_id: int,
    payload: VerifyWasteLogRequest,
    db: Session = Depends(get_db),
    verifier: User = Depends(deps.require_roles(UserRole.WASTE_WORKER, UserRole.SUPER_ADMIN)),
):
    waste_log = db.get(WasteLog, waste_log_id)
    if waste_log is None:
        raise HTTPException(status_code=404, detail="Waste log not found.")

    existing = db.query(Verification).filter(Verification.waste_log_id == waste_log_id).first()
    if existing:
        raise HTTPException(status_code=409, detail="Waste log already verified.")

    quality = derive_quality_score(payload.contamination_rate, payload.quality_score)
    cat = _norm_category(waste_log.category.value if hasattr(waste_log.category, "value") else str(waste_log.category))
    carbon_saved = compute_carbon_saved(payload.verified_weight, cat, db=db)
    pcc_awarded = compute_pcc(carbon_saved, quality)

    try:
        with db.begin():
            verification = Verification(
                waste_log_id=waste_log.id,
                verified_by_user_id=verifier.id,
                verifier_id=verifier.id,
                verified_weight_kg=payload.verified_weight,
                verified_weight=payload.verified_weight,
                contamination_rate=payload.contamination_rate,
                quality_score=quality,
                evidence_path=payload.evidence_url,
                evidence_url=payload.evidence_url,
                carbon_saved_kg=carbon_saved,
                points_awarded=pcc_awarded,
                meta_json={"source": "pcc_verify"},
            )
            db.add(verification)

            waste_log.status = WasteLogStatus.VERIFIED
            db.add(waste_log)
            db.flush()

            credit = credit_pcc_transaction(
                db,
                user_id=waste_log.user_id,
                org_id=payload.org_id if payload.org_id is not None else waste_log.org_id,
                ref_type="WASTE_LOG_VERIFICATION",
                ref_id=waste_log.id,
                carbon_saved_kgco2e=carbon_saved,
                pcc_awarded=pcc_awarded,
                quality_score=quality,
                reason=f"Verified waste log #{waste_log.id}",
            )

            new_badges = evaluate_and_award_badges(
                db,
                user_id=waste_log.user_id,
                org_id=payload.org_id if payload.org_id is not None else waste_log.org_id,
            )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    return VerifyWasteLogResponse(
        success=True,
        message="Waste log verified and PCC credited.",
        carbon_saved_kgco2e=credit.carbon_saved_kgco2e,
        pcc_awarded=credit.pcc_awarded,
        quality_score_used=quality,
        updated_wallet_balance=credit.wallet_balance,
        newly_awarded_badges=[BadgeRead.model_validate(b) for b in new_badges],
    )


@router.get("/wallet", response_model=APIResponse)
def get_wallet(
    org_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_user),
):
    wallet = db.query(Wallet).filter(Wallet.user_id == current_user.id, Wallet.org_id == org_id).first()
    if wallet is None:
        wallet = Wallet(user_id=current_user.id, org_id=org_id, balance_pcc=0.0, balance_points=0.0)
        db.add(wallet)
        db.commit()
        db.refresh(wallet)

    txs = (
        db.query(Transaction)
        .filter(Transaction.wallet_id == wallet.id)
        .order_by(Transaction.created_at.desc())
        .limit(20)
        .all()
    )

    payload = WalletSummary(
        wallet_id=wallet.id,
        balance_pcc=float(wallet.balance_pcc or 0.0),
        transactions=[
            {
                "id": t.id,
                "type": t.type or (t.tx_type.value.lower() if t.tx_type else "credit"),
                "amount_pcc": float(t.amount_pcc or t.amount_points or 0.0),
                "reason": t.reason or t.description,
                "ref_type": t.ref_type,
                "ref_id": t.ref_id,
                "created_at": t.created_at,
            }
            for t in txs
        ],
    )
    return APIResponse(message="Wallet fetched.", data={"wallet": payload.model_dump()})


@router.get("/badges", response_model=APIResponse)
def list_badges(db: Session = Depends(get_db)):
    from app.services.badge_engine import _seed_badges_if_missing

    _seed_badges_if_missing(db)
    db.commit()
    badges = db.query(Badge).filter(Badge.active.is_(True)).order_by(Badge.id.asc()).all()
    return APIResponse(message="Badges fetched.", data={"badges": [BadgeRead.model_validate(b).model_dump() for b in badges]})


@router.get("/badges/me", response_model=APIResponse)
def my_badges(
    org_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_user),
):
    has_meta = _has_column(db, "user_badges", "metadata_json")
    select_cols = [UserBadge.badge_id, UserBadge.awarded_at]
    if has_meta:
        select_cols.append(UserBadge.metadata_json)

    q = (
        db.query(*select_cols)
        .filter(UserBadge.user_id == current_user.id)
    )
    if org_id is not None and _has_column(db, "user_badges", "org_id"):
        q = q.filter(UserBadge.org_id == org_id)
    earned = q.order_by(UserBadge.awarded_at.desc()).all()
    result = []
    for row in earned:
        badge_id = row[0]
        awarded_at = row[1]
        metadata_json = row[2] if has_meta and len(row) > 2 else {}
        badge = db.get(Badge, badge_id)
        if not badge:
            continue
        result.append(
            {
                "badge": BadgeRead.model_validate(badge).model_dump(),
                "awarded_at": awarded_at,
                "metadata_json": metadata_json or {},
            }
        )
    return APIResponse(message="Earned badges fetched.", data={"earned_badges": result})


@router.get("/impact/me", response_model=APIResponse)
def my_impact(
    org_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_user),
):
    summary = build_impact_summary(db, user_id=current_user.id, org_id=org_id)
    return APIResponse(
        message="Impact summary fetched.",
        data={"impact": ImpactSummarySchema(**summary.__dict__).model_dump()},
    )
