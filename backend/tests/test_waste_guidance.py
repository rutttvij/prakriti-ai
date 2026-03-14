import json

from app.api.waste_reporting import CLASS_NAMES, build_classification_response, load_class_names_from_map
from app.schemas.waste_classes import WASTE_CLASS_GUIDANCE, WASTE_CLASS_IDS, get_waste_guidance


def test_guidance_exists_for_all_known_labels():
    assert set(WASTE_CLASS_IDS) == set(CLASS_NAMES)
    assert len(WASTE_CLASS_IDS) == 58
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


def test_class_map_labels_align_with_waste_class_ids(tmp_path):
    class_to_idx = {label: i for i, label in enumerate(WASTE_CLASS_IDS)}
    p = tmp_path / "class_to_idx.json"
    p.write_text(json.dumps(class_to_idx), encoding="utf-8")

    class_names = load_class_names_from_map(p)
    assert set(class_names) == set(WASTE_CLASS_IDS)
