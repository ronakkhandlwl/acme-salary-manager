"""Currency-aware salary band planning.

Fixed thresholds such as "under 60,000" are meaningless when the same report covers
INR and USD salaries, so each currency gets its own evenly sized bands with rounded
("nice") boundaries derived from that currency's observed salary range.
"""

from __future__ import annotations

from dataclasses import dataclass

TARGET_BAND_COUNT = 6
# Band widths are one of these multiples of a power of ten (e.g. 20,000 or 250,000).
NICE_STEP_MULTIPLIERS = (10, 20, 25, 50, 100)
# Boundaries are rounded to at least whole major units (100 minor units).
MIN_STEP_MINOR = 100


@dataclass(frozen=True)
class BandPlan:
    start_minor: int
    step_minor: int
    band_count: int

    def bounds(self, index: int) -> tuple[int, int]:
        lower = self.start_minor + index * self.step_minor
        return lower, lower + self.step_minor


def nice_step(span_minor: int, target_band_count: int = TARGET_BAND_COUNT) -> int:
    """Return the smallest rounded band width that covers the span in ~target bands."""
    raw_step = max(span_minor // target_band_count, MIN_STEP_MINOR)
    magnitude = MIN_STEP_MINOR
    while magnitude * 10 <= raw_step:
        magnitude *= 10
    # magnitude <= raw_step < 10 * magnitude, so the largest multiplier always qualifies.
    return next(
        magnitude * multiplier // 10
        for multiplier in NICE_STEP_MULTIPLIERS
        if magnitude * multiplier // 10 >= raw_step
    )


def plan_bands(minimum_minor: int, maximum_minor: int) -> BandPlan:
    """Plan contiguous bands that include both the minimum and maximum salary."""
    if minimum_minor > maximum_minor:
        raise ValueError("minimum salary cannot exceed maximum salary")
    step = nice_step(maximum_minor - minimum_minor)
    start = (minimum_minor // step) * step
    band_count = (maximum_minor - start) // step + 1
    return BandPlan(start_minor=start, step_minor=step, band_count=band_count)
