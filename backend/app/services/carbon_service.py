# app/services/carbon_service.py

from typing import Optional, Dict, Any

from sqlalchemy.orm import Session

from app.models.carbon import CarbonActivity, CarbonActivityType
from app.core.carbon_engine import record_carbon_activity


def add_carbon_activity(
    db: Session,
    user_id: int,
    carbon_kg: float = 0.0,
    pcc_tokens: float = 0.0,
    metadata: Optional[Dict[str, Any]] = None,
    activity_type: CarbonActivityType = CarbonActivityType.TRAINING,
    **kwargs: Any,
) -> Optional[CarbonActivity]:
    """
    Backwards-compatible helper used by the training module.

    Old code might have called this with slightly different param names, for example:
      add_carbon_activity(db, user.id, carbon, tokens, meta=...)

    This wrapper:
      - Accepts positional carbon_kg, pcc_tokens
      - Also inspects kwargs for common aliases:
          carbon / co2 / carbon_saved
          tokens / pcc / pcc_tokens
          meta / metadata
      - Defaults activity_type to TRAINING (can be overridden via kwargs)
    """

    # Try to extract carbon_kg / pcc_tokens from kwargs if zero/not provided
    if not carbon_kg:
        for key in ("carbon_kg", "carbon", "co2", "carbon_saved"):
            if key in kwargs:
                try:
                    carbon_kg = float(kwargs[key])
                    break
                except (TypeError, ValueError):
                    pass

    if not pcc_tokens:
        for key in ("pcc_tokens", "tokens", "pcc"):
            if key in kwargs:
                try:
                    pcc_tokens = float(kwargs[key])
                    break
                except (TypeError, ValueError):
                    pass

    # Metadata from kwargs
    if metadata is None:
        meta_kw = kwargs.get("meta") or kwargs.get("metadata")
        metadata = meta_kw if isinstance(meta_kw, dict) else {}

    # Allow explicit activity_type override via kwargs
    atype_kw = kwargs.get("activity_type")
    if isinstance(atype_kw, CarbonActivityType):
        activity_type = atype_kw
    elif isinstance(atype_kw, str):
        # Try to map string to enum safely
        try:
            activity_type = CarbonActivityType(atype_kw.upper())
        except ValueError:
            pass

    # Delegate to the core carbon engine
    return record_carbon_activity(
        db=db,
        user_id=user_id,
        activity_type=activity_type,
        carbon_kg=float(carbon_kg),
        pcc_tokens=float(pcc_tokens),
        metadata=metadata,
    )
