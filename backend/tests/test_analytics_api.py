from datetime import date, timedelta

from fastapi.testclient import TestClient

from tests.conftest import create_employee


def _add_salary(
    client: TestClient,
    employee_id: str,
    *,
    amount_minor: int,
    currency: str,
    effective_from: str,
    pay_frequency: str = "annual",
) -> None:
    response = client.post(
        f"/api/v1/employees/{employee_id}/salary-records",
        json={
            "amount_minor": amount_minor,
            "currency": currency,
            "pay_frequency": pay_frequency,
            "effective_from": effective_from,
            "change_reason": "annual_review",
        },
    )
    assert response.status_code == 201, response.text


def _hire(client: TestClient, **overrides: str) -> dict[str, object]:
    payload = {
        "employee_number": "EMP-10001",
        "first_name": "Ada",
        "last_name": "Lovelace",
        "email": "ada@example.com",
        "country_code": "IN",
        "department": "Engineering",
        "employment_status": "active",
        "title": "Engineer",
        "hire_date": "2020-01-01",
        **overrides,
    }
    return create_employee(client, payload)


def test_analytics_keeps_payroll_separated_by_currency(client: TestClient) -> None:
    inr = _hire(client)
    usd = _hire(
        client,
        employee_number="EMP-10002",
        first_name="Grace",
        last_name="Hopper",
        email="grace@example.com",
        country_code="US",
        department="Product",
    )
    _add_salary(
        client, inr["id"], amount_minor=100_000_00, currency="INR", effective_from="2024-01-01"
    )
    _add_salary(
        client, usd["id"], amount_minor=90_000_00, currency="USD", effective_from="2024-01-01"
    )

    response = client.get("/api/v1/analytics/summary", params={"employment_status": "active"})

    assert response.status_code == 200
    body = response.json()
    payroll = {row["currency"]: row for row in body["payroll_by_currency"]}
    assert payroll["INR"]["payroll_minor"] == 100_000_00
    assert payroll["USD"]["payroll_minor"] == 90_000_00
    assert body["headcount"] == 2
    note = body["annualization_note"].lower()
    assert "currency" in note or "annual" in note


def test_analytics_uses_latest_salary_and_annualizes_monthly_pay(client: TestClient) -> None:
    employee = _hire(client)
    _add_salary(
        client, employee["id"], amount_minor=80_000_00, currency="INR", effective_from="2023-01-01"
    )
    _add_salary(
        client,
        employee["id"],
        amount_minor=10_000_00,
        currency="INR",
        effective_from="2024-06-01",
        pay_frequency="monthly",
    )
    future = (date.today() + timedelta(days=30)).isoformat()
    _add_salary(
        client, employee["id"], amount_minor=500_000_00, currency="INR", effective_from=future
    )

    body = client.get("/api/v1/analytics/summary").json()
    payroll = {row["currency"]: row for row in body["payroll_by_currency"]}

    assert payroll["INR"]["payroll_minor"] == 120_000_00
    assert payroll["INR"]["employee_count"] == 1


def test_median_is_computed_separately_for_odd_and_even_groups(client: TestClient) -> None:
    amounts = (70_000_00, 80_000_00, 90_000_00, 100_000_00)
    for index, amount in enumerate(amounts, start=1):
        employee = _hire(
            client,
            employee_number=f"EMP-20{index:03d}",
            email=f"eng{index}@example.com",
            first_name=f"Person{index}",
        )
        _add_salary(
            client, employee["id"], amount_minor=amount, currency="INR", effective_from="2024-01-01"
        )

    usd_employee = _hire(
        client,
        employee_number="EMP-20999",
        email="usd@example.com",
        country_code="US",
        department="Sales",
        first_name="Usd",
    )
    _add_salary(
        client,
        usd_employee["id"],
        amount_minor=50_000_00,
        currency="USD",
        effective_from="2024-01-01",
    )

    body = client.get("/api/v1/analytics/summary", params={"department": "Engineering"}).json()
    inr = next(row for row in body["payroll_by_currency"] if row["currency"] == "INR")

    assert inr["employee_count"] == 4
    assert inr["median_minor"] == 85_000_00
    assert inr["average_minor"] == 85_000_00


def test_analytics_excludes_inactive_employees_from_default_active_view(
    client: TestClient,
) -> None:
    active = _hire(client)
    inactive = _hire(
        client,
        employee_number="EMP-30002",
        email="inactive@example.com",
        employment_status="inactive",
        first_name="Inactive",
    )
    _add_salary(
        client, active["id"], amount_minor=80_000_00, currency="INR", effective_from="2024-01-01"
    )
    _add_salary(
        client, inactive["id"], amount_minor=200_000_00, currency="INR", effective_from="2024-01-01"
    )

    default_body = client.get("/api/v1/analytics/summary").json()
    all_body = client.get(
        "/api/v1/analytics/summary", params={"employment_status": "inactive"}
    ).json()

    assert default_body["headcount"] == 1
    assert default_body["payroll_by_currency"][0]["payroll_minor"] == 80_000_00
    assert all_body["headcount"] == 1
    assert all_body["payroll_by_currency"][0]["payroll_minor"] == 200_000_00


def test_salary_bands_and_extremes_stay_within_currency(client: TestClient) -> None:
    low = _hire(client, employee_number="EMP-40001", email="low@example.com", first_name="Low")
    high = _hire(client, employee_number="EMP-40002", email="high@example.com", first_name="High")
    usd = _hire(
        client,
        employee_number="EMP-40003",
        email="usdhigh@example.com",
        country_code="US",
        first_name="UsdHigh",
    )
    _add_salary(
        client, low["id"], amount_minor=50_000_00, currency="INR", effective_from="2024-01-01"
    )
    _add_salary(
        client, high["id"], amount_minor=160_000_00, currency="INR", effective_from="2024-01-01"
    )
    _add_salary(
        client, usd["id"], amount_minor=200_000_00, currency="USD", effective_from="2024-01-01"
    )

    body = client.get("/api/v1/analytics/summary").json()
    inr_bands = {
        row["band_label"]: row["employee_count"]
        for row in body["salary_bands"]
        if row["currency"] == "INR"
    }
    inr_extremes = next(row for row in body["extremes"] if row["currency"] == "INR")
    inr_people = inr_extremes["highest"] + inr_extremes["lowest"]

    assert inr_bands["Under 60,000"] == 1
    assert inr_bands["150,000+"] == 1
    assert inr_extremes["highest"][0]["first_name"] == "High"
    assert inr_extremes["lowest"][0]["first_name"] == "Low"
    assert all(item["currency"] == "INR" for item in inr_people)


def test_recent_changes_and_filter_options(client: TestClient) -> None:
    employee = _hire(client, department="Finance")
    _add_salary(
        client, employee["id"], amount_minor=70_000_00, currency="INR", effective_from="2024-01-01"
    )

    changes = client.get("/api/v1/analytics/summary").json()["recent_changes"]
    options = client.get("/api/v1/analytics/filters").json()

    assert changes[0]["employee_number"] == "EMP-10001"
    assert "IN" in options["countries"]
    assert "Finance" in options["departments"]
