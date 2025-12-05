# app/core/waste_classifier.py

from typing import Literal

ClassificationLabel = Literal["GREEN", "YELLOW", "RED"]


def classify_household_from_metrics(
    total_dry_kg: float,
    total_wet_kg: float,
    total_reject_kg: float,
    avg_segregation_score: float,
) -> ClassificationLabel:
    """
    Simple rule-based classifier for household waste patterns.

    - GREEN:  reject <= 10% of total AND avg score >= 80
    - YELLOW: reject <= 25% of total
    - RED:    otherwise
    """
    total = total_dry_kg + total_wet_kg + total_reject_kg

    if total <= 0:
        return "RED"

    reject_ratio = total_reject_kg / total

    if reject_ratio <= 0.10 and avg_segregation_score >= 80:
        return "GREEN"
    elif reject_ratio <= 0.25:
        return "YELLOW"
    else:
        return "RED"
