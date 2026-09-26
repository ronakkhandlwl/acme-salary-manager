from datetime import date
from typing import Any

from sqlalchemy import Select, Subquery, and_, case, cast, func, or_, select
from sqlalchemy.orm import Session
from sqlalchemy.types import Integer

from app.models.employee import Employee
from app.models.salary_record import SalaryRecord
from app.schemas.analytics import (
    AnalyticsSummary,
    CountryPayroll,
    CurrencyExtremes,
    DepartmentPayroll,
    EmployeeCompensation,
    FilterOptions,
    MoneyGroup,
    RecentSalaryChange,
    SalaryBand,
)
from app.services.query_filters import employee_filter_clauses

ANNUALIZATION_NOTE = (
    "Amounts are annualized (monthly pay × 12) and never summed across currencies."
)

def annualized_amount(amount_minor, pay_frequency):
    return case((pay_frequency == "monthly", amount_minor * 12), else_=amount_minor)


def current_compensation_subquery(
    as_of: date,
    *,
    country_code: str | None,
    department: str | None,
    employment_status: str | None,
) -> Subquery:
    ranked = (
        select(
            SalaryRecord.employee_id,
            SalaryRecord.amount_minor,
            SalaryRecord.currency,
            SalaryRecord.pay_frequency,
            SalaryRecord.effective_from,
            SalaryRecord.change_reason,
            func.row_number()
            .over(
                partition_by=SalaryRecord.employee_id,
                order_by=(SalaryRecord.effective_from.desc(), SalaryRecord.created_at.desc()),
            )
            .label("rn"),
        )
        .where(SalaryRecord.effective_from <= as_of)
        .subquery()
    )
    statement: Select[Any] = (
        select(
            Employee.id.label("employee_id"),
            Employee.employee_number,
            Employee.first_name,
            Employee.last_name,
            Employee.country_code,
            Employee.department,
            Employee.employment_status,
            ranked.c.currency,
            ranked.c.effective_from,
            ranked.c.change_reason,
            annualized_amount(ranked.c.amount_minor, ranked.c.pay_frequency).label("annual_minor"),
        )
        .join(ranked, ranked.c.employee_id == Employee.id)
        .where(ranked.c.rn == 1)
    )
    filters = employee_filter_clauses(
        country_code=country_code,
        department=department,
        employment_status=employment_status,
    )
    if filters:
        statement = statement.where(*filters)
    return statement.subquery()


def _median_select(source: Subquery, *group_columns):
    numbered = (
        select(
            *group_columns,
            source.c.annual_minor,
            func.row_number()
            .over(partition_by=list(group_columns), order_by=source.c.annual_minor.asc())
            .label("rn"),
            func.count().over(partition_by=list(group_columns)).label("cnt"),
        )
    ).subquery()
    grouped = [numbered.c[str(column.name)] for column in group_columns]
    lower = cast((numbered.c.cnt + 1) / 2, Integer)
    upper = cast((numbered.c.cnt + 2) / 2, Integer)
    return (
        select(
            *grouped,
            cast(func.avg(numbered.c.annual_minor), Integer).label("median_minor"),
        )
        .where(or_(numbered.c.rn == lower, numbered.c.rn == upper))
        .group_by(*grouped)
    )


def _group_key(row, group_columns) -> tuple:
    mapping = row._mapping
    return tuple(mapping[str(column.name)] for column in group_columns)


def _group_dict(row, group_columns) -> dict[str, object]:
    mapping = row._mapping
    return {str(column.name): mapping[str(column.name)] for column in group_columns}


def _money_aggregates(session: Session, source: Subquery, *group_columns) -> list[dict]:
    median_rows = {
        _group_key(row, group_columns): row.median_minor
        for row in session.execute(_median_select(source, *group_columns))
    }
    stats = session.execute(
        select(
            *group_columns,
            func.count().label("employee_count"),
            func.sum(source.c.annual_minor).label("payroll_minor"),
            cast(func.avg(source.c.annual_minor), Integer).label("average_minor"),
        ).group_by(*group_columns)
    )
    results = []
    for row in stats:
        results.append(
            {
                **_group_dict(row, group_columns),
                "employee_count": row.employee_count,
                "payroll_minor": int(row.payroll_minor or 0),
                "average_minor": int(row.average_minor or 0),
                "median_minor": int(median_rows.get(_group_key(row, group_columns)) or 0),
            }
        )
    return results


def _band_label(annual_minor):
    return case(
        (annual_minor < 60_000_00, "Under 60,000"),
        (annual_minor < 90_000_00, "60,000–89,999"),
        (annual_minor < 120_000_00, "90,000–119,999"),
        (annual_minor < 150_000_00, "120,000–149,999"),
        else_="150,000+",
    )


def _to_employee(row) -> EmployeeCompensation:
    return EmployeeCompensation(
        id=row.employee_id,
        employee_number=row.employee_number,
        first_name=row.first_name,
        last_name=row.last_name,
        department=row.department,
        country_code=row.country_code,
        currency=row.currency,
        annual_minor=int(row.annual_minor),
    )


def compensation_summary(
    session: Session,
    *,
    as_of: date | None = None,
    country_code: str | None = None,
    department: str | None = None,
    employment_status: str | None = "active",
) -> AnalyticsSummary:
    effective_date = as_of or date.today()
    current = current_compensation_subquery(
        effective_date,
        country_code=country_code,
        department=department,
        employment_status=employment_status,
    )
    headcount = session.scalar(select(func.count()).select_from(current)) or 0
    payroll_by_currency = [
        MoneyGroup(**row) for row in _money_aggregates(session, current, current.c.currency)
    ]
    by_country = [
        CountryPayroll(**row)
        for row in _money_aggregates(session, current, current.c.country_code, current.c.currency)
    ]
    by_department = [
        DepartmentPayroll(**row)
        for row in _money_aggregates(session, current, current.c.department, current.c.currency)
    ]
    band_rows = session.execute(
        select(
            current.c.currency,
            _band_label(current.c.annual_minor).label("band_label"),
            func.count().label("employee_count"),
        ).group_by(current.c.currency, _band_label(current.c.annual_minor))
    )
    salary_bands = [
        SalaryBand(
            currency=row.currency,
            band_label=row.band_label,
            employee_count=row.employee_count,
        )
        for row in band_rows
    ]
    ranked = (
        select(
            current.c.employee_id,
            current.c.employee_number,
            current.c.first_name,
            current.c.last_name,
            current.c.country_code,
            current.c.department,
            current.c.currency,
            current.c.annual_minor,
            func.row_number()
            .over(
                partition_by=current.c.currency,
                order_by=current.c.annual_minor.desc(),
            )
            .label("high_rn"),
            func.row_number()
            .over(
                partition_by=current.c.currency,
                order_by=current.c.annual_minor.asc(),
            )
            .label("low_rn"),
        )
    ).subquery()
    extreme_rows = session.execute(
        select(
            ranked.c.employee_id,
            ranked.c.employee_number,
            ranked.c.first_name,
            ranked.c.last_name,
            ranked.c.country_code,
            ranked.c.department,
            ranked.c.currency,
            ranked.c.annual_minor,
            ranked.c.high_rn,
            ranked.c.low_rn,
        ).where(or_(ranked.c.high_rn <= 5, ranked.c.low_rn <= 5))
    ).all()
    extremes_by_currency: dict[str, CurrencyExtremes] = {}
    for row in extreme_rows:
        group = extremes_by_currency.setdefault(
            row.currency, CurrencyExtremes(currency=row.currency, highest=[], lowest=[])
        )
        person = _to_employee(row)
        if row.high_rn <= 5:
            group.highest.append(person)
        if row.low_rn <= 5:
            group.lowest.append(person)
    for group in extremes_by_currency.values():
        group.highest.sort(key=lambda item: item.annual_minor, reverse=True)
        group.lowest.sort(key=lambda item: item.annual_minor)

    employee_filters = employee_filter_clauses(
        country_code=country_code,
        department=department,
        employment_status=employment_status,
    )
    recent_statement = (
        select(SalaryRecord, Employee)
        .join(Employee, Employee.id == SalaryRecord.employee_id)
        .order_by(SalaryRecord.created_at.desc(), SalaryRecord.id.desc())
        .limit(15)
    )
    if employee_filters:
        recent_statement = recent_statement.where(and_(*employee_filters))
    recent_changes = [
        RecentSalaryChange(
            employee_id=employee.id,
            employee_number=employee.employee_number,
            first_name=employee.first_name,
            last_name=employee.last_name,
            amount_minor=record.amount_minor,
            currency=record.currency,
            pay_frequency=record.pay_frequency,
            effective_from=record.effective_from,
            change_reason=record.change_reason,
            created_at=record.created_at,
        )
        for record, employee in session.execute(recent_statement)
    ]
    return AnalyticsSummary(
        as_of=effective_date,
        headcount=headcount,
        annualization_note=ANNUALIZATION_NOTE,
        payroll_by_currency=sorted(payroll_by_currency, key=lambda row: row.currency),
        by_country=sorted(by_country, key=lambda row: (row.country_code, row.currency)),
        by_department=sorted(by_department, key=lambda row: (row.department, row.currency)),
        salary_bands=sorted(salary_bands, key=lambda row: (row.currency, row.band_label)),
        extremes=sorted(extremes_by_currency.values(), key=lambda row: row.currency),
        recent_changes=recent_changes,
    )


def list_filter_options(session: Session) -> FilterOptions:
    countries = list(
        session.scalars(select(Employee.country_code).distinct().order_by(Employee.country_code))
    )
    departments = list(
        session.scalars(select(Employee.department).distinct().order_by(Employee.department))
    )
    return FilterOptions(countries=countries, departments=departments)
