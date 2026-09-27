"""Deterministic generator for fictional ACME employee and salary data.

The same arguments always produce byte-for-byte identical data: every random choice,
identifier and date derives from the seeded generator and a fixed reference date,
never from the wall clock.
"""

from __future__ import annotations

import argparse
import random
import sys
from dataclasses import dataclass
from datetime import UTC, date, datetime, time, timedelta
from uuid import UUID

from sqlalchemy import delete, func, insert, select
from sqlalchemy.orm import Session

from app.db.session import build_engine
from app.models.employee import Employee
from app.models.salary_record import SalaryRecord

REFERENCE_DATE = date(2026, 9, 1)
EARLIEST_HIRE_DATE = date(2014, 1, 1)
DEFAULT_RANDOM_SEED = 2026
INSERT_BATCH_SIZE = 2_000


@dataclass(frozen=True)
class CountryProfile:
    code: str
    currency: str
    weight: int
    entry_salary: int  # Today's annual entry-level salary in major units.


COUNTRIES = (
    CountryProfile("IN", "INR", 35, 900_000),
    CountryProfile("US", "USD", 30, 72_000),
    CountryProfile("GB", "GBP", 15, 42_000),
    CountryProfile("DE", "EUR", 12, 52_000),
    CountryProfile("SG", "SGD", 8, 60_000),
)
# (title, pay multiplier over entry level, relative frequency)
LEVELS = (
    ("Associate", 1.0, 30),
    ("Specialist", 1.3, 28),
    ("Senior Specialist", 1.7, 20),
    ("Manager", 2.2, 13),
    ("Senior Manager", 2.9, 6),
    ("Director", 4.0, 3),
)
DEPARTMENTS = (
    ("Engineering", 1.15, 30),
    ("Sales", 1.0, 18),
    ("Operations", 0.9, 16),
    ("Product", 1.1, 10),
    ("Finance", 1.05, 9),
    ("Customer Support", 0.85, 12),
    ("People", 0.95, 5),
)
FIRST_NAMES = (
    "Aarav", "Ada", "Aisha", "Amara", "Ananya", "Arjun", "Ben", "Carlos", "Chloe", "Daniel",
    "Diya", "Elena", "Emma", "Farah", "Felix", "Grace", "Hana", "Hugo", "Ines", "Isaac",
    "Ishaan", "Jonas", "Kai", "Kavya", "Lena", "Liam", "Lin", "Maya", "Mei", "Mohammed",
    "Noah", "Nora", "Olivia", "Omar", "Priya", "Rohan", "Sam", "Sofia", "Wei", "Zara",
)  # fmt: skip
LAST_NAMES = (
    "Agarwal", "Bauer", "Brown", "Chen", "Clarke", "Das", "Evans", "Fischer", "Garcia", "Gupta",
    "Hoffmann", "Hopper", "Ibrahim", "Iyer", "Johnson", "Khan", "Koch", "Kumar", "Lee", "Lim",
    "Lovelace", "Martin", "Mehta", "Meyer", "Miller", "Nair", "Ng", "Patel", "Reddy", "Rossi",
    "Schmidt", "Shah", "Singh", "Smith", "Tan", "Taylor", "Wagner", "Walker", "Wong", "Yadav",
)  # fmt: skip
EMPLOYMENT_STATUSES = (("active", 92), ("inactive", 5), ("terminated", 3))
ANNUAL_RAISE_RANGE = (0.02, 0.06)
PROMOTION_RAISE_RANGE = (0.10, 0.15)
PROMOTION_PROBABILITY = 0.08


@dataclass(frozen=True)
class SeedSummary:
    employee_count: int
    salary_record_count: int


class SeedRefusedError(RuntimeError):
    """Raised instead of silently overwriting an existing dataset."""


def _weighted(generator: random.Random, options: tuple[tuple, ...]) -> tuple:
    """Pick a (value, ..., weight) option, using its last element as the weight."""
    return generator.choices(options, weights=[option[-1] for option in options])[0]


def _uuid(generator: random.Random) -> str:
    return str(UUID(int=generator.getrandbits(128), version=4))


def _round_to_hundred(amount: float) -> int:
    return int(round(amount / 100) * 100)


def _review_dates(generator: random.Random, hire_date: date) -> list[date]:
    """Hire date, then hire anniversaries every one or two years up to the reference date."""
    dates = [hire_date]
    while True:
        following = dates[-1].replace(year=dates[-1].year + generator.choice((1, 1, 1, 2)))
        if following > REFERENCE_DATE:
            return dates
        dates.append(following)


def _salary_history(
    generator: random.Random,
    employee_id: str,
    currency: str,
    hire_date: date,
    current_salary: int,
) -> list[dict]:
    """Work backwards from today's level-appropriate salary to an initial offer.

    Deriving history from the current salary keeps today's pay realistic for each
    level no matter how long someone has been employed.
    """
    dates = _review_dates(generator, hire_date)
    reasons = ["initial_offer"]
    multipliers = [1.0]
    for _ in dates[1:]:
        promoted = generator.random() < PROMOTION_PROBABILITY
        reasons.append("promotion" if promoted else "annual_review")
        raise_range = PROMOTION_RAISE_RANGE if promoted else ANNUAL_RAISE_RANGE
        multipliers.append(1 + generator.uniform(*raise_range))
    growth = 1.0
    for multiplier in multipliers:
        growth *= multiplier
    amount = current_salary / growth
    records = []
    for effective, reason, multiplier in zip(dates, reasons, multipliers, strict=True):
        amount *= multiplier
        records.append(
            {
                "id": _uuid(generator),
                "employee_id": employee_id,
                "amount_minor": _round_to_hundred(amount) * 100,
                "currency": currency,
                "pay_frequency": "annual",
                "effective_from": effective,
                "change_reason": reason,
                "created_at": datetime.combine(effective, time(9, 0), tzinfo=UTC),
            }
        )
    return records


def generate_dataset(
    employee_count: int, random_seed: int = DEFAULT_RANDOM_SEED
) -> tuple[list[dict], list[dict]]:
    """Build employee and salary-record rows without touching the database."""
    generator = random.Random(random_seed)
    hire_window_days = (REFERENCE_DATE - EARLIEST_HIRE_DATE).days
    employees: list[dict] = []
    salary_records: list[dict] = []

    for index in range(1, employee_count + 1):
        country = generator.choices(COUNTRIES, weights=[c.weight for c in COUNTRIES])[0]
        title, level_multiplier, _ = _weighted(generator, LEVELS)
        department, department_multiplier, _ = _weighted(generator, DEPARTMENTS)
        status = _weighted(generator, EMPLOYMENT_STATUSES)[0]
        first_name = generator.choice(FIRST_NAMES)
        last_name = generator.choice(LAST_NAMES)
        hire_date = EARLIEST_HIRE_DATE + timedelta(days=generator.randint(0, hire_window_days))
        # Non-leap anniversary arithmetic: avoid Feb 29 hire dates entirely.
        if hire_date.month == 2 and hire_date.day == 29:
            hire_date = hire_date - timedelta(days=1)
        employee_id = _uuid(generator)
        employees.append(
            {
                "id": employee_id,
                "employee_number": f"EMP-{index:05d}",
                "first_name": first_name,
                "last_name": last_name,
                "email": f"{first_name}.{last_name}.{index:05d}@acme.example.com".lower(),
                "country_code": country.code,
                "department": department,
                "title": title,
                "employment_status": status,
                "hire_date": hire_date,
            }
        )
        current_salary = _round_to_hundred(
            country.entry_salary
            * level_multiplier
            * department_multiplier
            * generator.uniform(0.88, 1.12)
        )
        salary_records.extend(
            _salary_history(generator, employee_id, country.currency, hire_date, current_salary)
        )
    return employees, salary_records


def seed_database(
    database_url: str,
    employee_count: int = 10_000,
    random_seed: int = DEFAULT_RANDOM_SEED,
    *,
    reset: bool = False,
) -> SeedSummary:
    """Load fictional employees into a migrated database.

    Refuses to touch a database that already holds employees unless ``reset`` is set,
    so a mistyped connection string cannot wipe real data.
    """
    if employee_count < 1:
        raise ValueError("employee_count must be positive")
    employees, salary_records = generate_dataset(employee_count, random_seed)
    engine = build_engine(database_url)
    try:
        with Session(engine) as session:
            existing = session.scalar(select(func.count()).select_from(Employee)) or 0
            if existing and not reset:
                raise SeedRefusedError(
                    f"database already contains {existing} employees; pass --reset to replace them"
                )
            session.execute(delete(SalaryRecord))
            session.execute(delete(Employee))
            for rows, model in ((employees, Employee), (salary_records, SalaryRecord)):
                for start in range(0, len(rows), INSERT_BATCH_SIZE):
                    session.execute(insert(model), rows[start : start + INSERT_BATCH_SIZE])
            session.commit()
    finally:
        engine.dispose()
    return SeedSummary(employee_count=len(employees), salary_record_count=len(salary_records))


def main() -> None:
    parser = argparse.ArgumentParser(description="Seed fictional ACME salary data.")
    parser.add_argument("--database-url", default=None, help="defaults to DATABASE_URL setting")
    parser.add_argument("--employee-count", type=int, default=10_000)
    parser.add_argument("--random-seed", type=int, default=DEFAULT_RANDOM_SEED)
    parser.add_argument("--reset", action="store_true", help="replace existing employees")
    arguments = parser.parse_args()

    from app.core.config import settings

    try:
        summary = seed_database(
            arguments.database_url or settings.sqlalchemy_database_url,
            employee_count=arguments.employee_count,
            random_seed=arguments.random_seed,
            reset=arguments.reset,
        )
    except SeedRefusedError as error:
        print(f"Seed refused: {error}", file=sys.stderr)
        raise SystemExit(1) from error
    print(
        "Seeded "
        f"{summary.employee_count} employees and {summary.salary_record_count} salary records."
    )


if __name__ == "__main__":
    main()
