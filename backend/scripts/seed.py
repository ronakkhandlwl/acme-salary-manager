from __future__ import annotations

import argparse
import random
from dataclasses import dataclass
from datetime import date, timedelta

from sqlalchemy import delete
from sqlalchemy.orm import Session

from app.db.base import Base
from app.db.session import build_engine
from app.models.employee import Employee
from app.models.salary_record import SalaryRecord

COUNTRIES = (("IN", "INR"), ("US", "USD"), ("GB", "GBP"), ("DE", "EUR"), ("SG", "SGD"))
DEPARTMENTS = ("Engineering", "Product", "Sales", "People", "Finance", "Operations")
TITLES = ("Analyst", "Manager", "Senior Manager", "Director", "Specialist")
FIRST_NAMES = ("Aarav", "Ada", "Amara", "Grace", "Inez", "Kai", "Lin", "Noah", "Priya", "Sam")
LAST_NAMES = (
    "Brown",
    "Chen",
    "Das",
    "Garcia",
    "Hopper",
    "Ibrahim",
    "Khan",
    "Lovelace",
    "Meyer",
    "Singh",
)


@dataclass(frozen=True)
class SeedSummary:
    employee_count: int
    salary_record_count: int


def seed_database(
    database_url: str, employee_count: int = 10_000, random_seed: int = 2026
) -> SeedSummary:
    """Replace development data with deterministic, entirely fictional employees."""
    engine = build_engine(database_url)
    Base.metadata.create_all(engine)
    generator = random.Random(random_seed)
    employees: list[Employee] = []
    records: list[SalaryRecord] = []
    start_date = date(2015, 1, 1)

    for index in range(1, employee_count + 1):
        country_code, currency = generator.choice(COUNTRIES)
        hire_date = start_date + timedelta(days=generator.randint(0, 4_000))
        employee = Employee(
            employee_number=f"EMP-{index:05d}",
            first_name=generator.choice(FIRST_NAMES),
            last_name=generator.choice(LAST_NAMES),
            email=f"employee{index:05d}@acme.example.com",
            country_code=country_code,
            department=generator.choice(DEPARTMENTS),
            title=generator.choice(TITLES),
            employment_status="active" if generator.random() < 0.92 else "inactive",
            hire_date=hire_date,
        )
        employees.append(employee)
        base_amount = generator.randint(45_000, 180_000) * 100
        history_count = generator.randint(1, 3)
        for sequence in range(history_count):
            effective_from = min(hire_date + timedelta(days=365 * sequence), date.today())
            records.append(
                SalaryRecord(
                    employee=employee,
                    amount_minor=base_amount + (sequence * generator.randint(2_000, 12_000) * 100),
                    currency=currency,
                    pay_frequency="annual",
                    effective_from=effective_from,
                    change_reason="initial_offer" if sequence == 0 else "annual_review",
                )
            )

    with Session(engine) as session:
        session.execute(delete(SalaryRecord))
        session.execute(delete(Employee))
        session.add_all(employees)
        session.add_all(records)
        session.commit()
    engine.dispose()
    return SeedSummary(employee_count=len(employees), salary_record_count=len(records))


def main() -> None:
    parser = argparse.ArgumentParser(description="Seed fictional ACME salary data.")
    parser.add_argument("--database-url", default="sqlite:///./acme_salary_manager.db")
    parser.add_argument("--employee-count", type=int, default=10_000)
    arguments = parser.parse_args()
    summary = seed_database(arguments.database_url, employee_count=arguments.employee_count)
    print(
        "Seeded "
        f"{summary.employee_count} employees and {summary.salary_record_count} salary records."
    )


if __name__ == "__main__":
    main()
