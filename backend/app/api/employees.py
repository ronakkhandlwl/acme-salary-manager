from typing import Annotated, Literal

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import request_session
from app.schemas.employees import (
    EmployeeCreate,
    EmployeeDetail,
    EmployeePage,
    EmployeeRead,
    SalaryRecordCreate,
    SalaryRecordRead,
)
from app.services.employees import (
    DuplicateEmployeeError,
    InvalidSalaryRecordError,
    add_salary_record,
    create_employee,
    current_salary,
    get_employee,
    list_employees,
)

router = APIRouter(prefix="/api/v1/employees", tags=["employees"])
SessionDependency = Annotated[Session, Depends(request_session)]


def to_employee_read(employee) -> EmployeeRead:
    return EmployeeRead(
        id=employee.id,
        employee_number=employee.employee_number,
        first_name=employee.first_name,
        last_name=employee.last_name,
        email=employee.email,
        country_code=employee.country_code,
        department=employee.department,
        title=employee.title,
        employment_status=employee.employment_status,
        hire_date=employee.hire_date,
        current_salary=current_salary(employee),
    )


@router.post("", response_model=EmployeeRead, status_code=status.HTTP_201_CREATED)
def create_employee_endpoint(payload: EmployeeCreate, session: SessionDependency) -> EmployeeRead:
    try:
        employee = create_employee(session, payload)
    except DuplicateEmployeeError as error:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(error)) from error
    except InvalidSalaryRecordError as error:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail=str(error)
        ) from error
    return to_employee_read(employee)


@router.get("", response_model=EmployeePage)
def list_employees_endpoint(
    session: SessionDependency,
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=100)] = 25,
    search: str | None = None,
    country_code: str | None = None,
    department: str | None = None,
    employment_status: Literal["active", "inactive", "terminated"] | None = None,
    sort_by: Literal[
        "employee_number", "first_name", "last_name", "department", "country_code", "hire_date"
    ] = "last_name",
    sort_direction: Literal["asc", "desc"] = "asc",
) -> EmployeePage:
    employees, total = list_employees(
        session,
        page=page,
        page_size=page_size,
        search=search,
        country_code=country_code,
        department=department,
        employment_status=employment_status,
        sort_by=sort_by,
        sort_direction=sort_direction,
    )
    return EmployeePage(
        items=[to_employee_read(employee) for employee in employees],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/{employee_id}", response_model=EmployeeDetail)
def get_employee_endpoint(employee_id: str, session: SessionDependency) -> EmployeeDetail:
    employee = get_employee(session, employee_id)
    if employee is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="employee not found")
    response = to_employee_read(employee)
    return EmployeeDetail(
        **response.model_dump(),
        salary_history=sorted(
            employee.salary_records, key=lambda record: record.effective_from, reverse=True
        ),
    )


@router.post(
    "/{employee_id}/salary-records",
    response_model=SalaryRecordRead,
    status_code=status.HTTP_201_CREATED,
)
def add_salary_record_endpoint(
    employee_id: str, payload: SalaryRecordCreate, session: SessionDependency
) -> SalaryRecordRead:
    employee = get_employee(session, employee_id)
    if employee is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="employee not found")
    try:
        return add_salary_record(session, employee, payload)
    except InvalidSalaryRecordError as error:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail=str(error)
        ) from error
