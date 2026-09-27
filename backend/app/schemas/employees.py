from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

EmploymentStatus = Literal["active", "inactive", "terminated"]
PayFrequency = Literal["monthly", "annual"]
ChangeReason = Literal[
    "initial_offer",
    "annual_review",
    "promotion",
    "market_adjustment",
    "role_change",
    "correction",
]


class SalaryRecordCreate(BaseModel):
    amount_minor: int = Field(gt=0)
    currency: str = Field(pattern=r"^[A-Za-z]{3}$")
    pay_frequency: PayFrequency
    effective_from: date
    change_reason: ChangeReason

    @field_validator("currency")
    @classmethod
    def normalize_currency(cls, value: str) -> str:
        return value.upper()


class EmployeeCreate(BaseModel):
    employee_number: str = Field(min_length=1, max_length=32)
    first_name: str = Field(min_length=1, max_length=100)
    last_name: str = Field(min_length=1, max_length=100)
    email: EmailStr
    country_code: str = Field(pattern=r"^[A-Za-z]{2}$")
    department: str = Field(min_length=1, max_length=100)
    title: str = Field(min_length=1, max_length=150)
    employment_status: EmploymentStatus = "active"
    hire_date: date
    # Optional starting salary, stored in the same transaction as the employee.
    initial_salary: SalaryRecordCreate | None = None

    @field_validator("country_code")
    @classmethod
    def normalize_country_code(cls, value: str) -> str:
        return value.upper()


class SalaryRecordRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    amount_minor: int
    currency: str
    pay_frequency: str
    effective_from: date
    change_reason: str
    created_at: datetime | None


class EmployeeRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    employee_number: str
    first_name: str
    last_name: str
    email: EmailStr
    country_code: str
    department: str
    title: str
    employment_status: str
    hire_date: date
    current_salary: SalaryRecordRead | None


class EmployeeDetail(EmployeeRead):
    salary_history: list[SalaryRecordRead]


class EmployeePage(BaseModel):
    items: list[EmployeeRead]
    total: int
    page: int
    page_size: int
