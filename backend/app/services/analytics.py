from datetime import date
from typing import Any

from sqlalchemy import Select, Subquery, and_, case, cast, func, or_, select
from sqlalchemy.orm import Session, aliased
from sqlalchemy.types import BigInteger

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
from app.services.salary_bands import plan_bands

ANNUALIZATION_NOTE = "Amounts are annualized (monthly pay × 12) and never summed across currencies."
EXTREMES_PER_CURRENCY = 5
RECENT_CHANGES_LIMIT = 15


def annualized_amount(amount_minor, pay_frequency):
    return case((pay_frequency == "monthly", amount_minor * 12), else_=amount_minor)


def current_compensation_subquery(
    as_of: date,
    *,
    country_code: str | None,
    department: str | None,
    employment_status: str | None,
) -> Subquery:
    """One row per employee holding their salary in effect on ``as_of``.

    A record is current when no later-effective record exists for the same employee
    (ties broken by insertion time, then id). This anti-join is served by the
    (employee_id, effective_from, created_at) index and outperformed a ROW_NUMBER()
    window by ~2.5x on the seeded SQLite dataset.
    """
    later = aliased(SalaryRecord)
    superseded = (
        select(later.id)
        .where(
            later.employee_id == SalaryRecord.employee_id,
            later.effective_from <= as_of,
            or_(
                later.effective_from > SalaryRecord.effective_from,
                and_(
                    later.effective_from == SalaryRecord.effective_from,
                    or_(
                        later.created_at > SalaryRecord.created_at,
                        and_(
                            later.created_at == SalaryRecord.created_at, later.id > SalaryRecord.id
                        ),
                    ),
                ),
            ),
        )
        .exists()
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
            SalaryRecord.currency,
            SalaryRecord.effective_from,
            SalaryRecord.change_reason,
            annualized_amount(SalaryRecord.amount_minor, SalaryRecord.pay_frequency).label(
                "annual_minor"
            ),
        )
        .join(SalaryRecord, SalaryRecord.employee_id == Employee.id)
        .where(SalaryRecord.effective_from <= as_of, ~superseded)
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
    lower = (numbered.c.cnt + 1) // 2
    upper = (numbered.c.cnt + 2) // 2
    return (
        select(
            *grouped,
            cast(func.avg(numbered.c.annual_minor), BigInteger).label("median_minor"),
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
            cast(func.avg(source.c.annual_minor), BigInteger).label("average_minor"),
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


def _salary_bands(session: Session, source: Subquery) -> list[SalaryBand]:
    """Count employees per currency-specific band, including empty bands."""
    ranges = session.execute(
        select(
            source.c.currency,
            func.min(source.c.annual_minor).label("minimum"),
            func.max(source.c.annual_minor).label("maximum"),
        ).group_by(source.c.currency)
    ).all()
    if not ranges:
        return []
    plans = {row.currency: plan_bands(int(row.minimum), int(row.maximum)) for row in ranges}
    band_index = case(
        *(
            (
                source.c.currency == currency,
                (source.c.annual_minor - plan.start_minor) // plan.step_minor,
            )
            for currency, plan in plans.items()
        )
    )
    # Group on a plain column of a derived table: PostgreSQL rejects GROUP BY on a
    # re-rendered parameterised expression.
    indexed = select(source.c.currency, band_index.label("band_index")).subquery()
    counts = {
        (row.currency, int(row.band_index)): row.employee_count
        for row in session.execute(
            select(
                indexed.c.currency,
                indexed.c.band_index,
                func.count().label("employee_count"),
            ).group_by(indexed.c.currency, indexed.c.band_index)
        )
    }
    bands: list[SalaryBand] = []
    for currency in sorted(plans):
        plan = plans[currency]
        for index in range(plan.band_count):
            lower, upper = plan.bounds(index)
            bands.append(
                SalaryBand(
                    currency=currency,
                    lower_minor=lower,
                    upper_minor=upper,
                    employee_count=counts.get((currency, index), 0),
                )
            )
    return bands


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
    salary_bands = _salary_bands(session, current)
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
        ).where(
            or_(ranked.c.high_rn <= EXTREMES_PER_CURRENCY, ranked.c.low_rn <= EXTREMES_PER_CURRENCY)
        )
    ).all()
    extremes_by_currency: dict[str, CurrencyExtremes] = {}
    for row in extreme_rows:
        group = extremes_by_currency.setdefault(
            row.currency, CurrencyExtremes(currency=row.currency, highest=[], lowest=[])
        )
        person = _to_employee(row)
        if row.high_rn <= EXTREMES_PER_CURRENCY:
            group.highest.append(person)
        if row.low_rn <= EXTREMES_PER_CURRENCY:
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
        .limit(RECENT_CHANGES_LIMIT)
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
        salary_bands=salary_bands,
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
