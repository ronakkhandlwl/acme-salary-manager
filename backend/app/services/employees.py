from datetime import date

from sqlalchemy import Select, func, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, selectinload

from app.models.employee import Employee
from app.models.salary_record import SalaryRecord
from app.schemas.employees import EmployeeCreate, SalaryRecordCreate


class DuplicateEmployeeError(Exception):
    """Raised when a unique employee identifier already exists."""


def create_employee(session: Session, payload: EmployeeCreate) -> Employee:
    employee = Employee(**payload.model_dump())
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
    filters = []
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
    if country_code:
        filters.append(Employee.country_code == country_code.upper())
    if department:
        filters.append(Employee.department == department)
    if employment_status:
        filters.append(Employee.employment_status == employment_status)
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
    session: Session, employee: Employee, payload: SalaryRecordCreate
) -> SalaryRecord:
    if payload.effective_from < employee.hire_date:
        raise ValueError("salary effective date cannot be before the employee hire date")
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
    return max(
        eligible,
        key=lambda record: (record.effective_from, record.created_at or datetime_min()),
        default=None,
    )


def datetime_min():
    from datetime import datetime

    return datetime.min
