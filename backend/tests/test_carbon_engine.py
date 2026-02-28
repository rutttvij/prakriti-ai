from app.services.carbon_engine import compute_carbon_saved, compute_pcc, derive_quality_score


def test_compute_carbon_saved_with_default_factor():
    value = compute_carbon_saved(10.0, "plastic")
    assert value == 25.0


def test_compute_pcc_with_quality_multiplier():
    pcc = compute_pcc(20.0, 1.1)
    assert pcc == 22.0


def test_derive_quality_from_contamination_rate():
    q = derive_quality_score(contamination_rate=0.2, explicit_quality_score=None)
    assert q == 0.8


def test_derive_quality_explicit_clamped():
    q = derive_quality_score(contamination_rate=None, explicit_quality_score=2.0)
    assert q == 1.2
