from enum import Enum
from typing import Any

GUIDANCE_LOW_CONFIDENCE_THRESHOLD = 0.60


class WasteClass(str, Enum):
    BLOOD_SOAKED_BANDAGES = "blood_soaked_bandages"
    LED_BULB = "led_bulb"
    IV_BOTTLES = "iv_bottles"
    MOUSE = "mouse"
    METAL_ROD = "metal_rod"
    RUBBLE = "rubble"
    PAINT_BRUSH = "paint_brush"
    MASKS = "masks"
    AEROSOL_CANS = "aerosol_cans"
    GLOVES = "gloves"
    THERMOMETER = "thermometer"
    TOOTHPASTE = "toothpaste"
    PAPER_BAG = "paper_bag"
    SYRUP_BOTTLES = "syrup_bottles"
    DISPOSABLE_PLASTIC_CUTLERY = "disposable_plastic_cutlery"
    BATTERY = "battery"
    SMALL_APPLIANCES = "small_appliances"
    BANDAID = "bandaid"
    LEAF_WASTE = "leaf_waste"
    DIAPER = "diaper"
    CONCRETE_CHUNK = "concrete_chunk"
    GREEN_GLASS = "green_glass"
    SMARTPHONES = "smartphones"
    SHOES = "shoes"
    CURTAINS = "curtains"
    TABLET_STRIPS = "tablet_strips"
    KEYBOARD = "keyboard"
    TEA_BAGS = "tea_bags"
    PLASTIC_CUPS = "plastic_cups"
    ALUMINUM_SODA_CANS = "aluminum_soda_cans"
    PLASTIC_DETERGENT_BOTTLES = "plastic_detergent_bottles"
    STYROFOAM_FOOD_CONTAINERS = "styrofoam_food_containers"
    GLASS_CONTAINERS = "glass_containers"
    EGGSHELLS = "eggshells"
    PLASTIC_TRASH_BAGS = "plastic_trash_bags"
    PLASTIC_FOOD_CONTAINERS = "plastic_food_containers"
    PLASTIC_SHOPPING_BAGS = "plastic_shopping_bags"
    PLASTIC_STRAWS = "plastic_straws"
    TOYS = "toys"
    MAGAZINES = "magazines"
    SYRINGE = "syringe"
    ELECTRICAL_CABLES = "electrical_cables"
    PAPER_CUPS = "paper_cups"
    TOILET_PAPER = "toilet_paper"
    TOWELS = "towels"
    GLASS_BEVERAGE_BOTTLES = "glass_beverage_bottles"
    LAPTOPS = "laptops"
    METAL_CONTAINERS = "metal_containers"
    ELECTRONIC_CHIPS = "electronic_chips"
    FOOD_FRUIT_WASTE = "food_fruit_waste"
    NEWSPAPER = "newspaper"
    STEEL_FOOD_CANS = "steel_food_cans"
    OFFICE_PAPER = "office_paper"
    PLASTIC_BOTTLES = "plastic_bottles"
    CLOTHING = "clothing"
    PLASTIC_WATER_BOTTLES = "plastic_water_bottles"
    CARDBOARD_PACKAGING = "cardboard_packaging"
    CARDBOARD_BOXES = "cardboard_boxes"


WASTE_CLASS_IDS: list[str] = [w.value for w in WasteClass]


def _guidance(
    *,
    display_name: str,
    recyclable: bool,
    stream: str,
    recycle_steps: list[str] | None = None,
    dispose_steps: list[str] | None = None,
    do_not: list[str] | None = None,
    where_to_take: list[str] | None = None,
    description: str | None = None,
) -> dict[str, Any]:
    return {
        "display_name": display_name,
        "recyclable": recyclable,
        "stream": stream,
        "recycle_steps": recycle_steps or [],
        "dispose_steps": dispose_steps or [],
        "do_not": do_not or [],
        "where_to_take": where_to_take or [],
        "description": description,
        "low_confidence_threshold": GUIDANCE_LOW_CONFIDENCE_THRESHOLD,
    }


def _readable_label(label: str) -> str:
    return str(label or "unknown_item").replace("_", " ").title()


_BIOMEDICAL = {
    "blood_soaked_bandages",
    "iv_bottles",
    "masks",
    "gloves",
    "syrup_bottles",
    "bandaid",
    "diaper",
    "tablet_strips",
    "syringe",
}

_E_WASTE = {
    "led_bulb",
    "battery",
    "small_appliances",
    "smartphones",
    "keyboard",
    "electrical_cables",
    "laptops",
    "electronic_chips",
    "mouse",
    "thermometer",
}

_WET_ORGANIC = {
    "leaf_waste",
    "eggshells",
    "food_fruit_waste",
    "tea_bags",
}

_PAPER = {
    "paper_bag",
    "magazines",
    "paper_cups",
    "toilet_paper",
    "newspaper",
    "office_paper",
    "cardboard_packaging",
    "cardboard_boxes",
}

_GLASS = {
    "green_glass",
    "glass_containers",
    "glass_beverage_bottles",
}

_METAL = {
    "metal_rod",
    "aerosol_cans",
    "aluminum_soda_cans",
    "metal_containers",
    "steel_food_cans",
}

_PLASTIC_RECYCLABLE = {
    "plastic_detergent_bottles",
    "plastic_food_containers",
    "plastic_shopping_bags",
    "plastic_bottles",
    "plastic_water_bottles",
}

_PLASTIC_REJECT = {
    "disposable_plastic_cutlery",
    "plastic_cups",
    "styrofoam_food_containers",
    "plastic_trash_bags",
    "plastic_straws",
    "toothpaste",
}

_TEXTILE_REUSE = {"shoes", "curtains", "towels", "clothing"}

_CONSTRUCTION = {"rubble", "concrete_chunk"}


def _infer_guidance(label: str) -> dict[str, Any]:
    display = _readable_label(label)

    if label in _BIOMEDICAL:
        return _guidance(
            display_name=display,
            recyclable=False,
            stream="Biomedical / sanitary hazardous stream",
            dispose_steps=[
                "Keep this waste sealed and separate from dry/wet household waste.",
                "Use authorized biomedical or sanitary collection where available.",
                "If unavailable, wrap securely before handing over as reject waste.",
            ],
            do_not=["Do not mix with recyclables or compost."],
            where_to_take=["Authorized biomedical/sanitary collection", "Municipal reject stream (sealed)"],
            description="Potentially infectious or sanitary material requiring separate handling.",
        )

    if label in _E_WASTE:
        return _guidance(
            display_name=display,
            recyclable=True,
            stream="E-waste / hazardous dry",
            recycle_steps=[
                "Keep item dry and intact.",
                "Store separately from household dry recyclables.",
                "Hand over to authorized e-waste collector/drop-off.",
            ],
            do_not=["Do not burn, dismantle unsafely, or mix with wet waste."],
            where_to_take=["Authorized e-waste center", "Producer take-back programs"],
            description="Contains recoverable metals/components and may include hazardous parts.",
        )

    if label in _WET_ORGANIC:
        return _guidance(
            display_name=display,
            recyclable=True,
            stream="Wet / organic (composting)",
            recycle_steps=[
                "Segregate with wet kitchen/yard waste.",
                "Compost at home/community where possible.",
                "Send via municipal wet-waste route if composting is unavailable.",
            ],
            where_to_take=["Home/community compost", "Municipal wet-waste collection"],
            description="Biodegradable organic waste.",
        )

    if label in _PAPER:
        recyclable = label not in {"paper_cups", "toilet_paper"}
        if recyclable:
            return _guidance(
                display_name=display,
                recyclable=True,
                stream="Dry recyclable - paper/cardboard",
                recycle_steps=[
                    "Keep clean and dry.",
                    "Flatten/fold to reduce volume.",
                    "Bundle with paper/cardboard recyclables.",
                ],
                where_to_take=["Dry paper stream", "Kabadiwala", "MRF"],
            )
        return _guidance(
            display_name=display,
            recyclable=False,
            stream="Dry reject / contaminated paper",
            dispose_steps=[
                "Keep out of clean paper recycling.",
                "Place in dry reject waste stream.",
            ],
            where_to_take=["Municipal reject waste"],
        )

    if label in _GLASS:
        return _guidance(
            display_name=display,
            recyclable=True,
            stream="Dry recyclable - glass",
            recycle_steps=[
                "Empty and rinse item.",
                "Keep separate from mixed waste and avoid breakage.",
                "Send to dry glass recyclables.",
            ],
            where_to_take=["Dry glass stream", "Kabadiwala", "MRF"],
        )

    if label in _METAL:
        return _guidance(
            display_name=display,
            recyclable=True,
            stream="Dry recyclable - metal",
            recycle_steps=[
                "Empty/clean if needed and keep dry.",
                "Group with metal recyclables.",
                "Send to dry metal collection or scrap channel.",
            ],
            where_to_take=["Dry metal stream", "Kabadiwala", "MRF"],
        )

    if label in _PLASTIC_RECYCLABLE:
        return _guidance(
            display_name=display,
            recyclable=True,
            stream="Dry recyclable - plastic",
            recycle_steps=[
                "Rinse and dry item where practical.",
                "Keep with rigid dry plastics.",
                "Send via plastic recycling channel.",
            ],
            where_to_take=["Dry plastic stream", "Kabadiwala", "MRF"],
        )

    if label in _PLASTIC_REJECT:
        return _guidance(
            display_name=display,
            recyclable=False,
            stream="Dry reject / low-value plastic",
            dispose_steps=[
                "Keep separate from recyclable plastics.",
                "Send through municipal reject stream.",
            ],
            where_to_take=["Municipal reject waste"],
        )

    if label in _TEXTILE_REUSE:
        return _guidance(
            display_name=display,
            recyclable=True,
            stream="Dry reusable / textile recovery",
            recycle_steps=[
                "Reuse or donate if usable.",
                "Route damaged fabric/footwear to textile recovery.",
            ],
            where_to_take=["Donation channels", "Textile recovery"],
        )

    if label in _CONSTRUCTION:
        return _guidance(
            display_name=display,
            recyclable=False,
            stream="Construction and demolition debris",
            dispose_steps=[
                "Collect separately from household waste.",
                "Use authorized C&D collection or drop-off.",
            ],
            where_to_take=["C&D collection point"],
        )

    return _guidance(
        display_name=display,
        recyclable=False,
        stream="Dry segregated stream (best-effort)",
        dispose_steps=[
            "Keep this item separate from wet/organic waste.",
            "If uncertain, place in dry reject stream to avoid contamination.",
        ],
        where_to_take=["Dry waste collection"],
        description="Best-effort guidance generated for this class.",
    )


WASTE_CLASS_GUIDANCE: dict[str, dict[str, Any]] = {
    label: _infer_guidance(label)
    for label in WASTE_CLASS_IDS
}


def fallback_guidance(label: str) -> dict[str, Any]:
    return {
        "display_name": _readable_label(label),
        "recyclable": False,
        "stream": "Dry segregated stream (fallback)",
        "recycle_steps": [],
        "dispose_steps": [
            "Keep this item separate from wet/organic waste.",
            "If uncertain, place in dry reject stream to avoid contaminating recyclables.",
            "Check ward-level municipal guidance for final channel.",
        ],
        "do_not": [
            "Do not mix uncertain items with wet waste.",
            "Do not contaminate clean recyclables.",
        ],
        "where_to_take": ["Dry waste collection", "Ward-level MRF guidance desk"],
        "description": "Guidance fallback used because this label was not found in metadata.",
        "guidance_source": "fallback",
        "low_confidence_threshold": GUIDANCE_LOW_CONFIDENCE_THRESHOLD,
    }


def get_waste_guidance(label: str) -> dict[str, Any]:
    key = str(label or "").strip().lower()
    data = WASTE_CLASS_GUIDANCE.get(key)
    if not data:
        return fallback_guidance(key or "unknown_item")

    out = dict(data)
    out["guidance_source"] = "label_metadata"
    return out
