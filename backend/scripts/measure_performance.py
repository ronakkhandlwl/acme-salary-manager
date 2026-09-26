from __future__ import annotations

import time
from pathlib import Path

from fastapi.testclient import TestClient

from app.main import create_app
from scripts.seed import seed_database


def _timed(label: str, operation) -> float:
    started = time.perf_counter()
    result = operation()
    elapsed_ms = (time.perf_counter() - started) * 1000
    print(f"{label}: {elapsed_ms:.1f} ms")
    return elapsed_ms, result


def main() -> None:
    database_path = Path("acme_salary_manager.perf.db")
    database_url = f"sqlite:///{database_path}"
    seed_database(database_url, employee_count=10_000)
    application = create_app(database_url=database_url, create_schema=False)
    with TestClient(application) as client:
        _timed(
            "directory page 1",
            lambda: client.get("/api/v1/employees", params={"page_size": 25}),
        )
        _timed(
            "directory filtered search",
            lambda: client.get(
                "/api/v1/employees",
                params={"search": "ada", "country_code": "IN", "department": "Engineering"},
            ),
        )
        _timed("analytics summary", lambda: client.get("/api/v1/analytics/summary"))
        _timed(
            "analytics filtered to US Engineering",
            lambda: client.get(
                "/api/v1/analytics/summary",
                params={"country_code": "US", "department": "Engineering"},
            ),
        )
    database_path.unlink(missing_ok=True)


if __name__ == "__main__":
    main()
