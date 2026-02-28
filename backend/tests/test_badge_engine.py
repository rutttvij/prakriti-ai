from datetime import date, timedelta

from app.services.badge_engine import compute_streak_days


def test_compute_streak_days_empty():
    assert compute_streak_days([]) == 0


def test_compute_streak_days_consecutive_tail():
    start = date(2026, 1, 1)
    days = [start + timedelta(days=d) for d in [0, 1, 2, 5, 6, 7]]
    assert compute_streak_days(days) == 3


def test_compute_streak_days_single_day():
    assert compute_streak_days([date(2026, 2, 1)]) == 1
