from datetime import date, timedelta

from sqlalchemy import Select, func, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, selectinload

from app.models.employee import Employee
from app.models.salary_record import SalaryRecord
from app.schemas.employees import EmployeeCreate, SalaryRecordCreate
from app.services.query_filters import employee_filter_clauses

# Salary changes may be scheduled ahead of time, but not arbitrarily far into the future.
MAX_FUTURE_EFFECTIVE_DAYS = 366


class DuplicateEmployeeError(Exception):
    """Raised when a unique employee identifier already exists."""


class InvalidSalaryRecordError(Exception):
    """Raised when a salary record violates a compensation business rule."""


def _check_effective_date(effective_from: date, hire_date: date, today: date | None) -> None:
    reference_date = today or date.today()
    if effective_from < hire_date:
        raise InvalidSalaryRecordError(
            "salary effective date cannot be before the employee hire date"
        )
    if effective_from > reference_date + timedelta(days=MAX_FUTURE_EFFECTIVE_DAYS):
        raise InvalidSalaryRecordError(
            "salary effective date cannot be more than one year in the future"
        )


def create_employee(
    session: Session, payload: EmployeeCreate, *, today: date | None = None
) -> Employee:
    """Create an employee and, atomically, their optional starting salary."""
    employee = Employee(**payload.model_dump(exclude={"initial_salary"}))
    if payload.initial_salary is not None:
        _check_effective_date(payload.initial_salary.effective_from, payload.hire_date, today)
        employee.salary_records.append(SalaryRecord(**payload.initial_salary.model_dump()))
    session.add(employee)
    try:
        session.commit()
    except IntegrityError as error:
        session.rollback()
        raise DuplicateEmployeeError("employee number or email already exists") from error
    session.refresh(employee)
    return employee


def get_employee(session: Session, employee_id: str) -> Employee | None:
    statement = (
        select(Employee)
        .options(selectinload(Employee.salary_records))
        .where(Employee.id == employee_id)
    )
    return session.scalar(statement)


def list_employees(
    session: Session,
    *,
    page: int,
    page_size: int,
    search: str | None,
    country_code: str | None,
    department: str | None,
    employment_status: str | None,
    sort_by: str,
    sort_direction: str,
) -> tuple[list[Employee], int]:
    statement: Select[tuple[Employee]] = select(Employee).options(
        selectinload(Employee.salary_records)
    )
    filters = employee_filter_clauses(
        country_code=country_code,
        department=department,
        employment_status=employment_status,
    )
    if search:
        pattern = f"%{search.strip().lower()}%"
        filters.append(
            or_(
                func.lower(Employee.first_name).like(pattern),
                func.lower(Employee.last_name).like(pattern),
                func.lower(Employee.email).like(pattern),
                func.lower(Employee.employee_number).like(pattern),
            )
        )
    if filters:
        statement = statement.where(*filters)

    sort_column = {
        "employee_number": Employee.employee_number,
        "first_name": Employee.first_name,
        "last_name": Employee.last_name,
        "department": Employee.department,
        "country_code": Employee.country_code,
        "hire_date": Employee.hire_date,
    }[sort_by]
    ordered = sort_column.desc() if sort_direction == "desc" else sort_column.asc()
    rows = session.scalars(
        statement.order_by(ordered, Employee.id).offset((page - 1) * page_size).limit(page_size)
    )
    total_statement = select(func.count()).select_from(Employee)
    if filters:
        total_statement = total_statement.where(*filters)
    return list(rows), session.scalar(total_statement) or 0


def add_salary_record(
    session: Session,
    employee: Employee,
    payload: SalaryRecordCreate,
    *,
    today: date | None = None,
) -> SalaryRecord:
    """Append a salary record; existing records are never modified."""
    _check_effective_date(payload.effective_from, employee.hire_date, today)
    record = SalaryRecord(employee_id=employee.id, **payload.model_dump())
    session.add(record)
    session.commit()
    session.refresh(record)
    return record


def current_salary(employee: Employee, as_of: date | None = None) -> SalaryRecord | None:
    effective_date = as_of or date.today()
    eligible = (
        record for record in employee.salary_records if record.effective_from <= effective_date
    )
    # Mirrors the SQL rule in analytics: latest effective date, then insertion time, then id.
    return max(
        eligible,
        key=lambda record: (
            record.effective_from,
            record.created_at.timestamp() if record.created_at else 0.0,
            record.id,
        ),
        default=None,
    )
