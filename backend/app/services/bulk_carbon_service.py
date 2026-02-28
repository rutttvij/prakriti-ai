from app.models.bulk import WasteLogCategory


EMISSION_FACTORS = {
    WasteLogCategory.DRY: 0.45,
    WasteLogCategory.WET: 0.30,
    WasteLogCategory.PLASTIC: 1.90,
    WasteLogCategory.METAL: 2.10,
    WasteLogCategory.GLASS: 0.80,
    WasteLogCategory.E_WASTE: 2.80,
    WasteLogCategory.HAZARDOUS: 1.40,
    WasteLogCategory.ORGANIC: 0.35,
}

POINTS_MULTIPLIER = 10.0


def calculate_carbon_and_points(category: WasteLogCategory, verified_weight_kg: float) -> tuple[float, float]:
    emission_factor = EMISSION_FACTORS.get(category, 0.0)
    carbon_saved = max(0.0, verified_weight_kg) * emission_factor
    points = carbon_saved * POINTS_MULTIPLIER
    return carbon_saved, points
