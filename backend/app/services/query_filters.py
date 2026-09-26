from sqlalchemy import ColumnElement

from app.models.employee import Employee


def employee_filter_clauses(
    *,
    country_code: str | None,
    department: str | None,
    employment_status: str | None,
) -> list[ColumnElement[bool]]:
    filters: list[ColumnElement[bool]] = []
    if country_code:
        filters.append(Employee.country_code == country_code.upper())
    if department:
        filters.append(Employee.department == department)
    if employment_status:
        filters.append(Employee.employment_status == employment_status)
    return filters
