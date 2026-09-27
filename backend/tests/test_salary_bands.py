import pytest

from app.services.salary_bands import BandPlan, nice_step, plan_bands


@pytest.mark.parametrize(
    ("span_minor", "expected_step"),
    [
        (0, 100),
        (600, 100),
        (900, 200),
        (12_000_000, 2_000_000),
        (15_000_000, 2_500_000),
        (27_000_000, 5_000_000),
        (400_000_000, 100_000_000),
    ],
)
def test_nice_step_rounds_up_to_a_readable_width(span_minor: int, expected_step: int) -> None:
    assert nice_step(span_minor) == expected_step


def test_plan_covers_minimum_and_maximum_with_aligned_boundaries() -> None:
    plan = plan_bands(4_550_000, 17_320_000)

    assert plan == BandPlan(start_minor=2_500_000, step_minor=2_500_000, band_count=6)
    assert plan.bounds(0)[0] <= 4_550_000
    assert plan.bounds(plan.band_count - 1)[1] > 17_320_000


def test_single_salary_produces_one_band() -> None:
    plan = plan_bands(5_000_000, 5_000_000)

    assert plan.band_count == 1
    assert plan.bounds(0) == (5_000_000, 5_000_100)


def test_rejects_inverted_range() -> None:
    with pytest.raises(ValueError):
        plan_bands(10, 5)
