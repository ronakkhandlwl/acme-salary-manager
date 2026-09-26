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
