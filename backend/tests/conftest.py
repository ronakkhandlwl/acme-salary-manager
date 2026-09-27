import os
from collections.abc import Generator

import pytest
from fastapi.testclient import TestClient

from app.db.base import Base
from app.db.session import build_engine
from app.main import create_app

# CI also runs the suite against PostgreSQL by setting TEST_DATABASE_URL; locally each
# test gets an isolated throwaway SQLite file.
EXTERNAL_TEST_DATABASE_URL = os.getenv("TEST_DATABASE_URL")


@pytest.fixture
def database_url(tmp_path) -> Generator[str, None, None]:
    if not EXTERNAL_TEST_DATABASE_URL:
        yield f"sqlite:///{tmp_path / 'test.db'}"
        return
    engine = build_engine(EXTERNAL_TEST_DATABASE_URL)
    Base.metadata.drop_all(engine)
    engine.dispose()
    yield EXTERNAL_TEST_DATABASE_URL
    engine = build_engine(EXTERNAL_TEST_DATABASE_URL)
    Base.metadata.drop_all(engine)
    engine.dispose()


@pytest.fixture
def client(database_url: str) -> Generator[TestClient, None, None]:
    application = create_app(database_url=database_url, create_schema=True)
    with TestClient(application) as test_client:
        yield test_client


@pytest.fixture
def employee_payload() -> dict[str, str]:
    return {
        "employee_number": "EMP-00001",
        "first_name": "Ada",
        "last_name": "Lovelace",
        "email": "ada.lovelace@example.com",
        "country_code": "IN",
        "department": "Engineering",
        "title": "Staff Engineer",
        "employment_status": "active",
        "hire_date": "2020-01-15",
    }


def create_employee(client: TestClient, payload: dict[str, str]) -> dict[str, object]:
    response = client.post("/api/v1/employees", json=payload)
    assert response.status_code == 201, response.text
    return response.json()
