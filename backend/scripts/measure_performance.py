"""Measure core API latencies against a freshly migrated, fully seeded database.

Usage: python -m scripts.measure_performance [--database-url URL]
Defaults to a temporary SQLite file that is removed afterwards.
"""

from __future__ import annotations

import argparse
import statistics
import time
from collections.abc import Callable
from pathlib import Path

from alembic.config import Config
from fastapi.testclient import TestClient

from alembic import command
from app.main import create_app
from scripts.seed import seed_database

BACKEND_ROOT = Path(__file__).resolve().parent.parent
REPETITIONS = 7
SCENARIOS: tuple[tuple[str, str, dict[str, str]], ...] = (
    ("Directory, first page (25)", "/api/v1/employees", {"page_size": "25"}),
    (
        "Directory, search + filters",
        "/api/v1/employees",
        {"search": "priya", "country_code": "IN", "department": "Engineering"},
    ),
    (
        "Directory, deep page sorted by hire date",
        "/api/v1/employees",
        {"page": "300", "sort_by": "hire_date"},
    ),
    ("Employee profile with history", "/api/v1/employees/{employee_id}", {}),
    ("Analytics, whole active workforce", "/api/v1/analytics/summary", {}),
    (
        "Analytics, US Engineering",
        "/api/v1/analytics/summary",
        {"country_code": "US", "department": "Engineering"},
    ),
)


def migrate(database_url: str) -> None:
    config = Config(str(BACKEND_ROOT / "alembic.ini"))
    config.set_main_option("script_location", str(BACKEND_ROOT / "alembic"))
    config.set_main_option("sqlalchemy.url", database_url)
    command.upgrade(config, "head")


def median_ms(operation: Callable[[], object]) -> float:
    operation()  # warm-up: exclude first-query planning and connection setup
    samples = []
    for _ in range(REPETITIONS):
        started = time.perf_counter()
        operation()
        samples.append((time.perf_counter() - started) * 1000)
    return statistics.median(samples)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--database-url", default=None)
    arguments = parser.parse_args()
    temporary_path = Path("acme_salary_manager.perf.db")
    database_url = arguments.database_url or f"sqlite:///{temporary_path}"

    migrate(database_url)
    summary = seed_database(database_url, employee_count=10_000, reset=True)
    print(f"Seeded {summary.employee_count} employees / {summary.salary_record_count} records")
    application = create_app(database_url=database_url)
    with TestClient(application) as client:
        employee_id = client.get("/api/v1/employees").json()["items"][0]["id"]
        print(f"| Operation | Median of {REPETITIONS} (ms) |\n|---|---:|")
        for label, path, params in SCENARIOS:
            url = path.format(employee_id=employee_id)

            def request(url: str = url, params: dict[str, str] = params) -> None:
                response = client.get(url, params=params)
                response.raise_for_status()

            print(f"| {label} | {median_ms(request):.1f} |")
    if arguments.database_url is None:
        temporary_path.unlink(missing_ok=True)


if __name__ == "__main__":
    main()
