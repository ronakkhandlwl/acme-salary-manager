from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator


class EmployeeCreate(BaseModel):
    employee_number: str = Field(min_length=1, max_length=32)
    first_name: str = Field(min_length=1, max_length=100)
    last_name: str = Field(min_length=1, max_length=100)
    email: EmailStr
    country_code: str = Field(min_length=2, max_length=2)
    department: str = Field(min_length=1, max_length=100)
    title: str = Field(min_length=1, max_length=150)
    employment_status: Literal["active", "inactive", "terminated"] = "active"
    hire_date: date

    @field_validator("country_code")
    @classmethod
    def normalize_country_code(cls, value: str) -> str:
        return value.upper()


class SalaryRecordCreate(BaseModel):
    amount_minor: int = Field(gt=0)
    currency: str = Field(min_length=3, max_length=3)
    pay_frequency: Literal["monthly", "annual"]
    effective_from: date
    change_reason: str = Field(min_length=1, max_length=100)

    @field_validator("currency")
    @classmethod
    def normalize_currency(cls, value: str) -> str:
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
