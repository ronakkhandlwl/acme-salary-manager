from datetime import date, timedelta

import pytest
from fastapi.testclient import TestClient

from tests.conftest import create_employee


def test_creates_employee_and_returns_current_salary_as_none(
    client: TestClient, employee_payload: dict[str, str]
) -> None:
    employee = create_employee(client, employee_payload)

    assert employee["employee_number"] == "EMP-00001"
    assert employee["current_salary"] is None


def test_lists_employees_with_search_filter_and_pagination(
    client: TestClient, employee_payload: dict[str, str]
) -> None:
    create_employee(client, employee_payload)
    create_employee(
        client,
        {
            **employee_payload,
            "employee_number": "EMP-00002",
            "first_name": "Grace",
            "last_name": "Hopper",
            "email": "grace.hopper@example.com",
            "country_code": "US",
            "department": "Product",
        },
    )

    response = client.get(
        "/api/v1/employees",
        params={"search": "ada", "country_code": "IN", "page": 1, "page_size": 25},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["total"] == 1
    assert [item["first_name"] for item in body["items"]] == ["Ada"]


def test_rejects_unknown_sort_fields(client: TestClient) -> None:
    response = client.get("/api/v1/employees", params={"sort_by": "salary"})

    assert response.status_code == 422


def test_gets_employee_with_salary_history_in_descending_effective_date_order(
    client: TestClient, employee_payload: dict[str, str]
) -> None:
    employee = create_employee(client, employee_payload)
    employee_id = employee["id"]
    for effective_from, amount_minor in (("2023-01-01", 9_000_00), ("2024-01-01", 10_000_00)):
        response = client.post(
            f"/api/v1/employees/{employee_id}/salary-records",
            json={
                "amount_minor": amount_minor,
                "currency": "INR",
                "pay_frequency": "monthly",
                "effective_from": effective_from,
                "change_reason": "annual_review",
            },
        )
        assert response.status_code == 201, response.text

    response = client.get(f"/api/v1/employees/{employee_id}")

    assert response.status_code == 200
    assert [record["effective_from"] for record in response.json()["salary_history"]] == [
        "2024-01-01",
        "2023-01-01",
    ]


def test_rejects_salary_before_hire_date(
    client: TestClient, employee_payload: dict[str, str]
) -> None:
    employee = create_employee(client, employee_payload)

    response = client.post(
        f"/api/v1/employees/{employee['id']}/salary-records",
        json={
            "amount_minor": 1,
            "currency": "INR",
            "pay_frequency": "monthly",
            "effective_from": "2019-12-31",
            "change_reason": "correction",
        },
    )

    assert response.status_code == 422
    assert "hire date" in response.json()["detail"]


def test_rejects_non_positive_salary_amount(
    client: TestClient, employee_payload: dict[str, str]
) -> None:
    employee = create_employee(client, employee_payload)

    response = client.post(
        f"/api/v1/employees/{employee['id']}/salary-records",
        json={
            "amount_minor": 0,
            "currency": "INR",
            "pay_frequency": "monthly",
            "effective_from": "2024-01-01",
            "change_reason": "correction",
        },
    )

    assert response.status_code == 422


def _salary_payload(**overrides: object) -> dict[str, object]:
    return {
        "amount_minor": 95_000_00,
        "currency": "INR",
        "pay_frequency": "annual",
        "effective_from": "2024-04-01",
        "change_reason": "annual_review",
        **overrides,
    }


def test_rejects_duplicate_employee_number(
    client: TestClient, employee_payload: dict[str, str]
) -> None:
    create_employee(client, employee_payload)

    response = client.post(
        "/api/v1/employees", json={**employee_payload, "email": "another@example.com"}
    )

    assert response.status_code == 409


def test_returns_404_for_unknown_employee(client: TestClient) -> None:
    assert client.get("/api/v1/employees/does-not-exist").status_code == 404
    response = client.post(
        "/api/v1/employees/does-not-exist/salary-records", json=_salary_payload()
    )
    assert response.status_code == 404


def test_salary_change_is_appended_and_becomes_current(
    client: TestClient, employee_payload: dict[str, str]
) -> None:
    employee = create_employee(client, employee_payload)
    url = f"/api/v1/employees/{employee['id']}/salary-records"
    client.post(url, json=_salary_payload(amount_minor=80_000_00, effective_from="2023-04-01"))
    client.post(url, json=_salary_payload(amount_minor=95_000_00, change_reason="promotion"))

    detail = client.get(f"/api/v1/employees/{employee['id']}").json()

    assert detail["current_salary"]["amount_minor"] == 95_000_00
    assert [record["amount_minor"] for record in detail["salary_history"]] == [
        95_000_00,
        80_000_00,
    ]


def test_future_dated_salary_is_recorded_but_not_yet_current(
    client: TestClient, employee_payload: dict[str, str]
) -> None:
    employee = create_employee(client, employee_payload)
    url = f"/api/v1/employees/{employee['id']}/salary-records"
    client.post(url, json=_salary_payload(amount_minor=80_000_00))
    future = (date.today() + timedelta(days=60)).isoformat()
    response = client.post(url, json=_salary_payload(amount_minor=99_000_00, effective_from=future))

    detail = client.get(f"/api/v1/employees/{employee['id']}").json()

    assert response.status_code == 201
    assert detail["current_salary"]["amount_minor"] == 80_000_00
    assert len(detail["salary_history"]) == 2


def test_rejects_salary_effective_more_than_a_year_ahead(
    client: TestClient, employee_payload: dict[str, str]
) -> None:
    employee = create_employee(client, employee_payload)
    far_future = (date.today() + timedelta(days=400)).isoformat()

    response = client.post(
        f"/api/v1/employees/{employee['id']}/salary-records",
        json=_salary_payload(effective_from=far_future),
    )

    assert response.status_code == 422
    assert "future" in response.json()["detail"]


@pytest.mark.parametrize(
    "overrides",
    [
        {"currency": "US"},
        {"currency": "12$"},
        {"change_reason": "because"},
        {"pay_frequency": "weekly"},
        {"amount_minor": 12.5},
    ],
)
def test_rejects_malformed_salary_input(
    client: TestClient, employee_payload: dict[str, str], overrides: dict[str, object]
) -> None:
    employee = create_employee(client, employee_payload)

    response = client.post(
        f"/api/v1/employees/{employee['id']}/salary-records", json=_salary_payload(**overrides)
    )

    assert response.status_code == 422


def test_normalizes_currency_and_country_codes(
    client: TestClient, employee_payload: dict[str, str]
) -> None:
    employee = create_employee(client, {**employee_payload, "country_code": "in"})
    record = client.post(
        f"/api/v1/employees/{employee['id']}/salary-records", json=_salary_payload(currency="inr")
    ).json()

    assert employee["country_code"] == "IN"
    assert record["currency"] == "INR"


def test_sorts_directory_descending(client: TestClient, employee_payload: dict[str, str]) -> None:
    create_employee(client, employee_payload)
    create_employee(
        client,
        {**employee_payload, "employee_number": "EMP-00002", "email": "b@example.com"},
    )

    body = client.get(
        "/api/v1/employees", params={"sort_by": "employee_number", "sort_direction": "desc"}
    ).json()

    assert [item["employee_number"] for item in body["items"]] == ["EMP-00002", "EMP-00001"]


def test_creates_employee_with_initial_salary_atomically(
    client: TestClient, employee_payload: dict[str, str]
) -> None:
    salary = _salary_payload(change_reason="initial_offer", effective_from="2020-01-15")

    employee = create_employee(client, {**employee_payload, "initial_salary": salary})

    assert employee["current_salary"]["amount_minor"] == salary["amount_minor"]


def test_invalid_initial_salary_creates_nothing(
    client: TestClient, employee_payload: dict[str, str]
) -> None:
    salary = _salary_payload(effective_from="2019-01-01")  # before hire date

    response = client.post("/api/v1/employees", json={**employee_payload, "initial_salary": salary})

    assert response.status_code == 422
    assert client.get("/api/v1/employees").json()["total"] == 0
