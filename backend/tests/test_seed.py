import pytest
from sqlalchemy import create_engine, func, select
from sqlalchemy.orm import Session

from app.db.base import Base
from app.models.employee import Employee
from app.models.salary_record import SalaryRecord
from scripts.seed import (
    REFERENCE_DATE,
    SeedRefusedError,
    generate_dataset,
    main,
    seed_database,
)


@pytest.fixture
def seed_url(database_url: str) -> str:
    engine = create_engine(database_url)
    Base.metadata.create_all(engine)
    engine.dispose()
    return database_url


def _counts(database_url: str) -> tuple[int, int]:
    engine = create_engine(database_url)
    with Session(engine) as session:
        employees = session.scalar(select(func.count()).select_from(Employee))
        salaries = session.scalar(select(func.count()).select_from(SalaryRecord))
    engine.dispose()
    return employees, salaries


def test_generation_is_deterministic_for_a_given_seed() -> None:
    assert generate_dataset(50, random_seed=7) == generate_dataset(50, random_seed=7)
    assert generate_dataset(50, random_seed=7) != generate_dataset(50, random_seed=8)


def test_generated_employees_are_unique_and_histories_are_consistent() -> None:
    employees, records = generate_dataset(300, random_seed=11)
    hire_dates = {employee["id"]: employee["hire_date"] for employee in employees}

    assert len({employee["employee_number"] for employee in employees}) == 300
    assert len({employee["email"] for employee in employees}) == 300
    assert set(hire_dates) == {record["employee_id"] for record in records}
    for record in records:
        assert hire_dates[record["employee_id"]] <= record["effective_from"] <= REFERENCE_DATE
        assert record["amount_minor"] > 0


def test_salaries_scale_with_local_currency() -> None:
    employees, records = generate_dataset(500, random_seed=3)
    average = {
        currency: sum(r["amount_minor"] for r in records if r["currency"] == currency)
        / sum(1 for r in records if r["currency"] == currency)
        for currency in ("INR", "USD")
    }

    assert average["INR"] > 5 * average["USD"]


def test_seed_database_loads_requested_employees(seed_url: str) -> None:
    summary = seed_database(seed_url, employee_count=40, random_seed=7)

    assert summary.employee_count == 40
    assert _counts(seed_url) == (40, summary.salary_record_count)
    assert summary.salary_record_count >= 40


def test_seed_refuses_to_overwrite_existing_data_without_reset(seed_url: str) -> None:
    seed_database(seed_url, employee_count=10, random_seed=1)

    with pytest.raises(SeedRefusedError):
        seed_database(seed_url, employee_count=20, random_seed=1)
    assert _counts(seed_url)[0] == 10

    seed_database(seed_url, employee_count=20, random_seed=1, reset=True)
    assert _counts(seed_url)[0] == 20


def test_salary_history_grows_to_a_level_appropriate_current_salary() -> None:
    employees, records = generate_dataset(400, random_seed=5)
    by_employee: dict[str, list[dict]] = {}
    for record in records:
        by_employee.setdefault(record["employee_id"], []).append(record)
    usd_current = []
    for employee in employees:
        history = sorted(by_employee[employee["id"]], key=lambda r: r["effective_from"])
        amounts = [record["amount_minor"] for record in history]
        assert amounts == sorted(amounts), "seeded pay never decreases"
        assert history[0]["change_reason"] == "initial_offer"
        if history[-1]["currency"] == "USD":
            usd_current.append(history[-1]["amount_minor"] // 100)

    # Entry level $72k up to Director (4x) with department and personal variation.
    assert 50_000 < min(usd_current) and max(usd_current) < 400_000


def test_cli_if_empty_seeds_once_then_skips(seed_url: str, capsys) -> None:
    assert main(["--database-url", seed_url, "--employee-count", "5", "--if-empty"]) == 0
    assert main(["--database-url", seed_url, "--employee-count", "9", "--if-empty"]) == 0
    assert "Seed skipped" in capsys.readouterr().out
    assert _counts(seed_url)[0] == 5
    assert main(["--database-url", seed_url, "--employee-count", "9"]) == 1
