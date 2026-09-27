from datetime import date, datetime

from pydantic import BaseModel


class MoneyGroup(BaseModel):
    currency: str
    employee_count: int
    payroll_minor: int
    average_minor: int
    median_minor: int


class CountryPayroll(MoneyGroup):
    country_code: str


class DepartmentPayroll(MoneyGroup):
    department: str


class SalaryBand(BaseModel):
    """Employees whose annual salary is >= lower_minor and < upper_minor."""

    currency: str
    lower_minor: int
    upper_minor: int
    employee_count: int


class EmployeeCompensation(BaseModel):
    id: str
    employee_number: str
    first_name: str
    last_name: str
    department: str
    country_code: str
    currency: str
    annual_minor: int


class CurrencyExtremes(BaseModel):
    currency: str
    highest: list[EmployeeCompensation]
    lowest: list[EmployeeCompensation]


class RecentSalaryChange(BaseModel):
    employee_id: str
    employee_number: str
    first_name: str
    last_name: str
    amount_minor: int
    currency: str
    pay_frequency: str
    effective_from: date
    change_reason: str
    created_at: datetime | None


class FilterOptions(BaseModel):
    countries: list[str]
    departments: list[str]


class AnalyticsSummary(BaseModel):
    as_of: date
    headcount: int
    annualization_note: str
    payroll_by_currency: list[MoneyGroup]
    by_country: list[CountryPayroll]
    by_department: list[DepartmentPayroll]
    salary_bands: list[SalaryBand]
    extremes: list[CurrencyExtremes]
    recent_changes: list[RecentSalaryChange]
