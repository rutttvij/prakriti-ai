from app.api.waste_reporting import CLASS_NAMES, build_classification_response
from app.schemas.waste_classes import WASTE_CLASS_GUIDANCE, WASTE_CLASS_IDS, get_waste_guidance


def test_guidance_exists_for_all_known_labels():
    assert set(WASTE_CLASS_IDS) == set(CLASS_NAMES)
    missing = [label for label in CLASS_NAMES if label not in WASTE_CLASS_GUIDANCE]
    assert missing == []


def test_fallback_guidance_for_unknown_label():
    item = get_waste_guidance("unknown_material")
    assert item["guidance_source"] == "fallback"
    assert item["recyclable"] is False
    assert len(item["dispose_steps"]) > 0


def test_build_classification_response_contains_guidance_fields():
    out = build_classification_response("plastic_water_bottles", 0.82)
    assert out.recyclable is True
    assert out.display_name
    assert out.stream
    assert out.recycle_steps
    assert out.guidance_source == "label_metadata"
    assert out.low_confidence_threshold > 0
