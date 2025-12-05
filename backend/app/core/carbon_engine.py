# app/core/carbon_engine.py

from typing import Optional, Dict

from sqlalchemy.orm import Session

from app.models.user import User
from app.models.carbon import CarbonActivity, CarbonActivityType


# Emission / savings factors (kg CO2e per kg waste)
DRY_SAVED_PER_KG = 1.25    # Recycling dry waste
WET_SAVED_PER_KG = 0.45    # Composting wet waste
REJECT_EMITTED_PER_KG = 0.75  # Landfilled reject waste

# Conversion between CO2e and PCC tokens
PCC_PER_KG_CO2 = 1.0 / 8.0  # 1 PCC ≈ 8 kg CO2e saved


def _safe_default(val: Optional[float]) -> float:
    return float(val) if val is not None else 0.0


# ---------------------------------------------------------
# 1) Segregation log → carbon and PCC
# ---------------------------------------------------------
def compute_segregation_carbon(
    dry_kg: float,
    wet_kg: float,
    reject_kg: float,
    segregation_score: int,
) -> tuple[float, float]:
    """
    Compute net carbon impact and PCC tokens for a segregation log.

    - dry_kg, wet_kg contribute to CO2 savings
    - reject_kg contributes to emissions
    - segregation_score (0–100) scales the effect
    """

    dry_kg = _safe_default(dry_kg)
    wet_kg = _safe_default(wet_kg)
    reject_kg = _safe_default(reject_kg)

    # Base net CO2e impact (positive = saved, negative = emitted)
    base_carbon = (
        dry_kg * DRY_SAVED_PER_KG
        + wet_kg * WET_SAVED_PER_KG
        - reject_kg * REJECT_EMITTED_PER_KG
    )

    # Apply segregation score scaling (0–100)
    score_factor = max(0.0, min(100.0, float(segregation_score))) / 100.0
    carbon_kg = base_carbon * score_factor

    # Only award PCC on positive carbon savings
    pcc_tokens = max(carbon_kg, 0.0) * PCC_PER_KG_CO2

    return carbon_kg, pcc_tokens


# ---------------------------------------------------------
# 2) Waste report resolution → carbon and PCC
# ---------------------------------------------------------
def compute_waste_report_resolution_carbon(
    resolution_hours: Optional[float] = None,
) -> tuple[float, float]:
    """
    Compute carbon impact of resolving a waste report.
    Faster resolution → higher impact.

    Rough heuristic:
      - <= 24h  → 3 kg CO2e saved
      - <= 72h  → 2 kg CO2e saved
      - > 72h   → 1 kg CO2e saved
    """
    if resolution_hours is None:
        base = 1.0
    elif resolution_hours <= 24:
        base = 3.0
    elif resolution_hours <= 72:
        base = 2.0
    else:
        base = 1.0

    carbon_kg = base
    pcc_tokens = carbon_kg * PCC_PER_KG_CO2
    return carbon_kg, pcc_tokens


# ---------------------------------------------------------
# 3) Household classification → carbon and PCC
# ---------------------------------------------------------
def compute_household_classification_reward(
    classification: str,
) -> tuple[float, float]:
    """
    Map household classification to PCC tokens and carbon.

    - GREEN  → 10 PCC
    - YELLOW → 3 PCC
    - RED    → 0 PCC
    """
    cls = classification.upper()

    if cls == "GREEN":
        tokens = 10.0
    elif cls == "YELLOW":
        tokens = 3.0
    else:
        tokens = 0.0

    carbon_kg = tokens * 8.0  # inverse of PCC_PER_KG_CO2
    return carbon_kg, tokens


# ---------------------------------------------------------
# 4) Persist carbon activity + update PCC balance
# ---------------------------------------------------------
def record_carbon_activity(
    db: Session,
    user_id: int,
    activity_type: CarbonActivityType,
    carbon_kg: float,
    pcc_tokens: float,
    metadata: Optional[Dict] = None,
) -> Optional[CarbonActivity]:
    """
    Create a CarbonActivity row and update user's PCC balance.

    If both carbon_kg and pcc_tokens are (almost) zero, this is a no-op.
    """

    if abs(carbon_kg) < 1e-6 and abs(pcc_tokens) < 1e-6:
        return None

    user = db.get(User, user_id)
    if not user:
        # Silently ignore if user no longer exists (or raise if you prefer)
        return None

    details = metadata or {}
    activity = CarbonActivity(
        user_id=user_id,
        activity_type=activity_type,
        carbon_kg=carbon_kg,
        pcc_tokens=pcc_tokens,
        metadata=metadata,
    )

    # Update PCC balance
    current_balance = _safe_default(user.pcc_balance)
    user.pcc_balance = current_balance + float(pcc_tokens)

    db.add(activity)
    db.add(user)
    db.commit()
    db.refresh(activity)

    return activity
