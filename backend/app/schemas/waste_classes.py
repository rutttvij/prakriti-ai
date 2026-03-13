from enum import Enum
from typing import Any

GUIDANCE_LOW_CONFIDENCE_THRESHOLD = 0.60


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


WASTE_CLASS_GUIDANCE: dict[str, dict[str, Any]] = {
    "aerosol_cans": _guidance(
        display_name="Aerosol Cans",
        recyclable=True,
        stream="Dry recyclable - metal",
        recycle_steps=[
            "Use the can fully so no spray remains.",
            "Do not puncture or burn the can.",
            "Wipe the can dry and place it in the dry metal stream.",
            "Hand over with metal recyclables to kabadiwala or MRF dry collection.",
        ],
        do_not=["Do not mix partly-filled aerosol cans with wet waste."],
        where_to_take=["Dry waste pickup", "Kabadiwala / scrap dealer", "Material Recovery Facility (MRF)"],
    ),
    "aluminum_food_cans": _guidance(
        display_name="Aluminum Food Cans",
        recyclable=True,
        stream="Dry recyclable - metal",
        recycle_steps=[
            "Empty all food residue.",
            "Rinse lightly and let the can dry.",
            "Flatten only if safe and required by local collector.",
            "Put in dry metal recyclables for pickup or scrap resale.",
        ],
        where_to_take=["Dry waste stream", "Kabadiwala", "MRF"],
    ),
    "aluminum_soda_cans": _guidance(
        display_name="Aluminum Soda Cans",
        recyclable=True,
        stream="Dry recyclable - metal",
        recycle_steps=[
            "Empty and rinse quickly.",
            "Crush the can to reduce space.",
            "Keep it clean and dry.",
            "Send with dry metal recyclables.",
        ],
        where_to_take=["Dry waste pickup", "Kabadiwala"],
    ),
    "cardboard_boxes": _guidance(
        display_name="Cardboard Boxes",
        recyclable=True,
        stream="Dry recyclable - paper/cardboard",
        recycle_steps=[
            "Remove tapes, plastic wraps, and labels where possible.",
            "Flatten boxes to save storage space.",
            "Keep cardboard dry and clean.",
            "Bundle and hand over in dry paper stream.",
        ],
        do_not=["Do not include oily or food-soiled cardboard with clean paper recycling."],
        where_to_take=["Dry paper collection", "Kabadiwala", "MRF"],
    ),
    "cardboard_packaging": _guidance(
        display_name="Cardboard Packaging",
        recyclable=True,
        stream="Dry recyclable - paper/cardboard",
        recycle_steps=[
            "Separate cardboard from plastic liners and foils.",
            "Flatten and keep it dry.",
            "Bundle with other dry paper items.",
            "Give to dry waste collector or scrap buyer.",
        ],
        where_to_take=["Dry waste stream", "Kabadiwala"],
    ),
    "clothing": _guidance(
        display_name="Clothing",
        recyclable=True,
        stream="Dry reusable / textile recovery",
        recycle_steps=[
            "Set aside wearable items for donation first.",
            "Wash and dry clothing before handing over.",
            "Send damaged cloth for textile reuse (rags, stuffing, upcycling).",
            "Use dedicated textile collection drives where available.",
        ],
        where_to_take=["Donation centers", "NGO collection drives", "Textile recyclers"],
    ),
    "coffee_grounds": _guidance(
        display_name="Coffee Grounds",
        recyclable=True,
        stream="Wet / organic (composting)",
        recycle_steps=[
            "Collect separately with wet kitchen waste.",
            "Add to home/community compost in thin layers.",
            "Mix with dry leaves or cocopeat to avoid odor.",
            "Send to municipal wet-waste composting if home compost is unavailable.",
        ],
        where_to_take=["Home compost bin", "Community compost pit", "Wet-waste municipal pickup"],
    ),
    "disposable_plastic_cutlery": _guidance(
        display_name="Disposable Plastic Cutlery",
        recyclable=False,
        stream="Dry reject / non-recyclable",
        dispose_steps=[
            "Rinse quickly if food residue is present.",
            "Keep separate from recyclable rigid plastics.",
            "Place in dry reject waste stream.",
            "Prefer reusable steel cutlery to reduce repeat waste.",
        ],
        do_not=["Do not put disposable cutlery in paper or compost streams."],
        where_to_take=["Dry reject municipal collection"],
    ),
    "eggshells": _guidance(
        display_name="Eggshells",
        recyclable=True,
        stream="Wet / organic (composting)",
        recycle_steps=[
            "Rinse lightly if needed and crush shells.",
            "Add to compost with other wet waste.",
            "Balance with dry browns (leaves/cardboard).",
            "Use compost output in home plants where suitable.",
        ],
        where_to_take=["Home compost", "Community compost", "Wet-waste collection"],
    ),
    "food_waste": _guidance(
        display_name="Food Waste",
        recyclable=True,
        stream="Wet / organic (composting/biogas)",
        recycle_steps=[
            "Segregate wet food waste at source daily.",
            "Drain excess liquid and avoid plastic contamination.",
            "Compost at home or send to community/municipal composting.",
            "Use closed bins to prevent pests and odor.",
        ],
        where_to_take=["Home compost", "Community compost", "Municipal wet-waste route"],
    ),
    "glass_beverage_bottles": _guidance(
        display_name="Glass Beverage Bottles",
        recyclable=True,
        stream="Dry recyclable - glass",
        recycle_steps=[
            "Empty fully and rinse the bottle.",
            "Remove caps and separate by material.",
            "Keep bottles unbroken when possible.",
            "Send with dry glass recyclables.",
        ],
        do_not=["Do not mix broken glass loosely with regular dry waste."],
        where_to_take=["Dry waste glass stream", "Kabadiwala", "Bottle take-back where available"],
    ),
    "glass_cosmetic_containers": _guidance(
        display_name="Glass Cosmetic Containers",
        recyclable=True,
        stream="Dry recyclable - glass",
        recycle_steps=[
            "Empty and clean residue from jars/bottles.",
            "Separate pumps/caps (often plastic/metal).",
            "Keep the glass dry.",
            "Send clean glass into dry recycling stream.",
        ],
        where_to_take=["Dry recyclable collection", "Kabadiwala"],
    ),
    "glass_food_jars": _guidance(
        display_name="Glass Food Jars",
        recyclable=True,
        stream="Dry recyclable - glass",
        recycle_steps=[
            "Scrape and rinse food leftovers.",
            "Remove lids/rings and sort separately.",
            "Store safely to avoid breakage.",
            "Hand over with dry glass recyclables.",
        ],
        where_to_take=["Dry waste stream", "MRF / scrap channels"],
    ),
    "magazines": _guidance(
        display_name="Magazines",
        recyclable=True,
        stream="Dry recyclable - paper",
        recycle_steps=[
            "Keep magazines dry and free from food stains.",
            "Bundle with other paper recyclables.",
            "Remove plastic wrapping before handover.",
            "Send through dry paper collection or kabadiwala.",
        ],
        where_to_take=["Dry paper stream", "Kabadiwala"],
    ),
    "newspaper": _guidance(
        display_name="Newspaper",
        recyclable=True,
        stream="Dry recyclable - paper",
        recycle_steps=[
            "Stack and tie old newspapers.",
            "Keep away from moisture.",
            "Separate from laminated/non-paper inserts.",
            "Sell or hand over through paper recycling channel.",
        ],
        where_to_take=["Kabadiwala", "Dry paper pickup"],
    ),
    "office_paper": _guidance(
        display_name="Office Paper",
        recyclable=True,
        stream="Dry recyclable - paper",
        recycle_steps=[
            "Keep clean white/mixed office paper separate.",
            "Remove staples/binders where practical.",
            "Store in dry stack.",
            "Send with paper recyclables.",
        ],
        where_to_take=["Office dry-paper collection", "Kabadiwala", "MRF"],
    ),
    "paper_cups": _guidance(
        display_name="Paper Cups",
        recyclable=False,
        stream="Dry reject / specialized stream only",
        dispose_steps=[
            "Empty all liquids and drain.",
            "Segregate from clean paper recycling.",
            "Place in dry reject stream unless your city has cup-specific collection.",
            "Prefer reusable cup options for future use.",
        ],
        do_not=["Do not mix lined paper cups with cardboard/newsprint bundles."],
        where_to_take=["Dry reject collection", "Specialized cup recycler if available"],
    ),
    "plastic_cup_lids": _guidance(
        display_name="Plastic Cup Lids",
        recyclable=False,
        stream="Dry reject / low-value plastic",
        dispose_steps=[
            "Rinse off beverage residue.",
            "Keep separate from PET bottles and rigid containers.",
            "Dispose in dry reject stream.",
            "Avoid single-use lids where possible.",
        ],
        where_to_take=["Dry reject municipal stream"],
    ),
    "plastic_detergent_bottles": _guidance(
        display_name="Plastic Detergent Bottles",
        recyclable=True,
        stream="Dry recyclable - rigid plastic",
        recycle_steps=[
            "Empty the bottle completely.",
            "Rinse once and drain.",
            "Keep cap separate if requested by local recycler.",
            "Crush and place in dry plastic recyclables.",
        ],
        where_to_take=["Dry plastic stream", "Kabadiwala", "MRF"],
    ),
    "plastic_food_containers": _guidance(
        display_name="Plastic Food Containers",
        recyclable=True,
        stream="Dry recyclable - rigid plastic (if clean)",
        recycle_steps=[
            "Scrape food leftovers first.",
            "Rinse and dry container.",
            "Sort with rigid plastics only.",
            "Send via dry recyclable channel.",
        ],
        do_not=["Do not include heavily oily or contaminated containers in recyclables."],
        where_to_take=["Dry plastic collection", "MRF"],
    ),
    "plastic_shopping_bags": _guidance(
        display_name="Plastic Shopping Bags",
        recyclable=True,
        stream="Dry recyclable - plastic film (special channel)",
        recycle_steps=[
            "Shake out dust and keep bags dry.",
            "Bundle many bags together.",
            "Send only through plastic film collector/drop-off, not mixed dry recyclables.",
            "Prefer cloth/jute reusable bags for daily shopping.",
        ],
        do_not=["Do not send loose film plastics in wet waste."],
        where_to_take=["Plastic film drop-off", "Authorized scrap aggregator"],
    ),
    "plastic_soda_bottles": _guidance(
        display_name="Plastic Soda Bottles",
        recyclable=True,
        stream="Dry recyclable - PET",
        recycle_steps=[
            "Empty bottle and rinse lightly.",
            "Remove cap and label if possible.",
            "Crush bottle to save space.",
            "Place in dry PET recycling stream.",
        ],
        where_to_take=["Dry plastic/PET collection", "Kabadiwala"],
    ),
    "plastic_straws": _guidance(
        display_name="Plastic Straws",
        recyclable=False,
        stream="Dry reject / non-recyclable",
        dispose_steps=[
            "Collect separately from recyclable plastics.",
            "Dispose in dry reject stream.",
            "Avoid flushing or littering due to drain/waterway blockage risk.",
            "Switch to reusable alternatives (steel/bamboo/silicone).",
        ],
        where_to_take=["Dry reject collection"],
    ),
    "plastic_trash_bags": _guidance(
        display_name="Plastic Trash Bags",
        recyclable=False,
        stream="Dry reject / contaminated plastic",
        dispose_steps=[
            "Tie securely to avoid spillage.",
            "Keep separate from clean dry recyclables.",
            "Place in municipal reject waste stream.",
            "Prefer segregated bins over mixed-bag disposal.",
        ],
        where_to_take=["Reject waste pickup"],
    ),
    "plastic_water_bottles": _guidance(
        display_name="Plastic Water Bottles",
        recyclable=True,
        stream="Dry recyclable - PET",
        recycle_steps=[
            "Empty, rinse, and dry bottle.",
            "Crush to reduce volume.",
            "Keep with PET/rigid plastic recyclables.",
            "Hand over to dry waste collector or kabadiwala.",
        ],
        where_to_take=["Dry PET stream", "Kabadiwala", "MRF"],
    ),
    "shoes": _guidance(
        display_name="Shoes",
        recyclable=True,
        stream="Dry reusable / specialized material recovery",
        recycle_steps=[
            "Pair and clean shoes before disposal.",
            "Donate reusable pairs.",
            "Route damaged shoes through cobbler/textile-footwear recovery channels.",
            "Use brand take-back programs where available.",
        ],
        where_to_take=["Donation centers", "Footwear take-back programs", "Specialized scrap aggregators"],
    ),
    "steel_food_cans": _guidance(
        display_name="Steel Food Cans",
        recyclable=True,
        stream="Dry recyclable - metal",
        recycle_steps=[
            "Empty and rinse can.",
            "Dry fully to avoid odor/rust.",
            "Keep with metal recyclables.",
            "Send through dry metal collection.",
        ],
        where_to_take=["Dry metal stream", "Kabadiwala"],
    ),
    "styrofoam_cups": _guidance(
        display_name="Styrofoam Cups",
        recyclable=False,
        stream="Dry reject / non-recyclable",
        dispose_steps=[
            "Empty and keep separate from plastics and paper.",
            "Place in dry reject stream.",
            "Avoid burning as it releases harmful fumes.",
            "Shift to reusable cups where possible.",
        ],
        where_to_take=["Dry reject collection"],
    ),
    "styrofoam_food_containers": _guidance(
        display_name="Styrofoam Food Containers",
        recyclable=False,
        stream="Dry reject / non-recyclable",
        dispose_steps=[
            "Remove food leftovers.",
            "Keep out of regular plastic recycling stream.",
            "Dispose in reject dry waste.",
            "Choose reusable steel/glass containers in future.",
        ],
        where_to_take=["Dry reject stream"],
    ),
    "tea_bags": _guidance(
        display_name="Tea Bags",
        recyclable=False,
        stream="Wet/organic only if plastic-free, else dry reject",
        dispose_steps=[
            "If tea bag is paper/cotton and staple-free, add to compost.",
            "If bag contains plastic mesh/nylon, put in dry reject waste.",
            "Squeeze excess liquid before disposal.",
            "Prefer loose-leaf tea or certified compostable tea bags.",
        ],
        where_to_take=["Home compost (plastic-free only)", "Wet waste route", "Dry reject route for nylon mesh"],
    ),
}


def _readable_label(label: str) -> str:
    return str(label or "unknown_item").replace("_", " ").title()


def fallback_guidance(label: str) -> dict[str, Any]:
    return {
        "display_name": _readable_label(label),
        "recyclable": False,
        "stream": "Dry segregated stream (fallback)",
        "recycle_steps": [],
        "dispose_steps": [
            "Keep this item separate from wet/organic waste.",
            "If the item is clean and rigid, verify with local dry recyclables list before mixing.",
            "If uncertain, place in dry reject stream to avoid contaminating recyclables.",
            "Check your ward-level municipal guidance for final channel.",
        ],
        "do_not": [
            "Do not mix uncertain items with wet waste.",
            "Do not contaminate clean paper/plastic recycling bundles.",
        ],
        "where_to_take": ["Dry waste collection", "Ward-level MRF guidance desk", "Kabadiwala (after confirmation)"],
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
