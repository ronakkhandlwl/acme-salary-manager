from collections.abc import Generator

import pytest
from fastapi.testclient import TestClient

from app.main import create_app


@pytest.fixture
def client(tmp_path) -> Generator[TestClient, None, None]:
    database_url = f"sqlite:///{tmp_path / 'test.db'}"
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
