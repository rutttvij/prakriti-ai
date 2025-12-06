# backend/app/schemas/waste_classes.py

from enum import Enum
from typing import Dict, List


class WasteClass(str, Enum):
    AEROSOL_CANS = "aerosol_cans"
    ALUMINUM_FOOD_CANS = "aluminum_food_cans"
    ALUMINUM_SODA_CANS = "aluminum_soda_cans"
    CARDBOARD_BOXES = "cardboard_boxes"
    CARDBOARD_PACKAGING = "cardboard_packaging"
    CLOTHING = "clothing"
    COFFEE_GROUNDS = "coffee_grounds"
    DISPOSABLE_PLASTIC_CUTLERY = "disposable_plastic_cutlery"
    EGGSHELLS = "eggshells"
    FOOD_WASTE = "food_waste"
    GLASS_BEVERAGE_BOTTLES = "glass_beverage_bottles"
    GLASS_COSMETIC_CONTAINERS = "glass_cosmetic_containers"
    GLASS_FOOD_JARS = "glass_food_jars"
    MAGAZINES = "magazines"
    NEWSPAPER = "newspaper"
    OFFICE_PAPER = "office_paper"
    PAPER_CUPS = "paper_cups"
    PLASTIC_CUP_LIDS = "plastic_cup_lids"
    PLASTIC_DETERGENT_BOTTLES = "plastic_detergent_bottles"
    PLASTIC_FOOD_CONTAINERS = "plastic_food_containers"
    PLASTIC_SHOPPING_BAGS = "plastic_shopping_bags"
    PLASTIC_SODA_BOTTLES = "plastic_soda_bottles"
    PLASTIC_STRAWS = "plastic_straws"
    PLASTIC_TRASH_BAGS = "plastic_trash_bags"
    PLASTIC_WATER_BOTTLES = "plastic_water_bottles"
    SHOES = "shoes"
    STEEL_FOOD_CANS = "steel_food_cans"
    STYROFOAM_CUPS = "styrofoam_cups"
    STYROFOAM_FOOD_CONTAINERS = "styrofoam_food_containers"
    TEA_BAGS = "tea_bags"


# list of all classes – used by WasteClassifierService.num_classes
WASTE_CLASSES: List[WasteClass] = list(WasteClass)


# Optional: high-level suggestions per class (your service can use this;
# for now we keep simple defaults so imports work and behavior is sane).
WASTE_CLASS_SUGGESTIONS: Dict[WasteClass, List[str]] = {
    WasteClass.FOOD_WASTE: [
        "Segregate as wet / organic waste.",
        "Compost where possible or send to community composting / biogas.",
    ],
    WasteClass.PAPER_CUPS: [
        "Empty all liquids.",
        "Dispose in dry, non-recyclable waste unless a special paper-cup stream exists.",
    ],
    WasteClass.CARDBOARD_BOXES: [
        "Flatten and keep dry.",
        "Place in paper/cardboard recycling.",
    ],
    WasteClass.ALUMINUM_SODA_CANS: [
        "Empty and lightly rinse.",
        "Place in metal recycling / dry waste.",
    ],
    WasteClass.PLASTIC_WATER_BOTTLES: [
        "Empty, lightly rinse, and crush.",
        "Place in dry plastic recyclables.",
    ],
    # You can expand per-class suggestions later as needed.
}
