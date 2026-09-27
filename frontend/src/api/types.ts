// Mirrors backend/app/schemas. Money is always integer minor units + ISO currency.

export type EmploymentStatus = 'active' | 'inactive' | 'terminated'
export type PayFrequency = 'monthly' | 'annual'
export type ChangeReason =
  | 'initial_offer'
  | 'annual_review'
  | 'promotion'
  | 'market_adjustment'
  | 'role_change'
  | 'correction'

export interface SalaryRecord {
  id: string
  amount_minor: number
  currency: string
  pay_frequency: PayFrequency
  effective_from: string
  change_reason: ChangeReason
  created_at: string | null
}

export interface Employee {
  id: string
  employee_number: string
  first_name: string
  last_name: string
  email: string
  country_code: string
  department: string
  title: string
  employment_status: EmploymentStatus
  hire_date: string
  current_salary: SalaryRecord | null
}

export interface EmployeeDetail extends Employee {
  salary_history: SalaryRecord[]
}

export interface EmployeePage {
  items: Employee[]
  total: number
  page: number
  page_size: number
}

export type SortField =
  | 'employee_number'
  | 'first_name'
  | 'last_name'
  | 'department'
  | 'country_code'
  | 'hire_date'

export interface EmployeeQuery {
  page: number
  pageSize: number
  search?: string
  countryCode?: string
  department?: string
  employmentStatus?: EmploymentStatus
  sortBy: SortField
  sortDirection: 'asc' | 'desc'
}

export interface EmployeeCreate {
  employee_number: string
  first_name: string
  last_name: string
  email: string
  country_code: string
  department: string
  title: string
  employment_status: EmploymentStatus
  hire_date: string
  initial_salary?: SalaryRecordCreate
}

export interface SalaryRecordCreate {
  amount_minor: number
  currency: string
  pay_frequency: PayFrequency
  effective_from: string
  change_reason: ChangeReason
}

export interface MoneyGroup {
  currency: string
  employee_count: number
  payroll_minor: number
  average_minor: number
  median_minor: number
}

export interface CountryPayroll extends MoneyGroup {
  country_code: string
}

export interface DepartmentPayroll extends MoneyGroup {
  department: string
}

export interface SalaryBand {
  currency: string
  lower_minor: number
  upper_minor: number
  employee_count: number
}

export interface EmployeeCompensation {
  id: string
  employee_number: string
  first_name: string
  last_name: string
  department: string
  country_code: string
  currency: string
  annual_minor: number
}

export interface CurrencyExtremes {
  currency: string
  highest: EmployeeCompensation[]
  lowest: EmployeeCompensation[]
}

export interface RecentSalaryChange {
  employee_id: string
  employee_number: string
  first_name: string
  last_name: string
  amount_minor: number
  currency: string
  pay_frequency: PayFrequency
  effective_from: string
  change_reason: ChangeReason
  created_at: string | null
}

export interface AnalyticsSummary {
  as_of: string
  headcount: number
  annualization_note: string
  payroll_by_currency: MoneyGroup[]
  by_country: CountryPayroll[]
  by_department: DepartmentPayroll[]
  salary_bands: SalaryBand[]
  extremes: CurrencyExtremes[]
  recent_changes: RecentSalaryChange[]
}

export interface AnalyticsQuery {
  countryCode?: string
  department?: string
  employmentStatus: EmploymentStatus | 'all'
}

export interface FilterOptions {
  countries: string[]
  departments: string[]
}
