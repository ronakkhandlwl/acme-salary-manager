import type { AnalyticsSummary, EmployeeDetail, EmployeePage } from '../api/types'

export const adaDetail: EmployeeDetail = {
  id: 'emp-1',
  employee_number: 'EMP-00001',
  first_name: 'Ada',
  last_name: 'Lovelace',
  email: 'ada@acme.example.com',
  country_code: 'GB',
  department: 'Engineering',
  title: 'Manager',
  employment_status: 'active',
  hire_date: '2020-01-15',
  current_salary: {
    id: 'sal-2',
    amount_minor: 90_000_00,
    currency: 'GBP',
    pay_frequency: 'annual',
    effective_from: '2024-01-15',
    change_reason: 'annual_review',
    created_at: '2024-01-15T09:00:00Z',
  },
  salary_history: [],
}

export const employeePage: EmployeePage = {
  items: [adaDetail],
  total: 1,
  page: 1,
  page_size: 25,
}

export const summary: AnalyticsSummary = {
  as_of: '2026-09-27',
  headcount: 3,
  annualization_note: 'Amounts are annualized and never summed across currencies.',
  payroll_by_currency: [
    { currency: 'GBP', employee_count: 1, payroll_minor: 90_000_00, average_minor: 90_000_00, median_minor: 90_000_00 },
    { currency: 'INR', employee_count: 2, payroll_minor: 3_000_000_00, average_minor: 1_500_000_00, median_minor: 1_500_000_00 },
  ],
  by_country: [
    { country_code: 'GB', currency: 'GBP', employee_count: 1, payroll_minor: 90_000_00, average_minor: 90_000_00, median_minor: 90_000_00 },
    { country_code: 'IN', currency: 'INR', employee_count: 2, payroll_minor: 3_000_000_00, average_minor: 1_500_000_00, median_minor: 1_500_000_00 },
  ],
  by_department: [
    { department: 'Engineering', currency: 'INR', employee_count: 2, payroll_minor: 3_000_000_00, average_minor: 1_500_000_00, median_minor: 1_500_000_00 },
    { department: 'Engineering', currency: 'GBP', employee_count: 1, payroll_minor: 90_000_00, average_minor: 90_000_00, median_minor: 90_000_00 },
  ],
  salary_bands: [
    { currency: 'INR', lower_minor: 1_000_000_00, upper_minor: 2_000_000_00, employee_count: 2 },
    { currency: 'GBP', lower_minor: 80_000_00, upper_minor: 100_000_00, employee_count: 1 },
  ],
  extremes: [
    {
      currency: 'INR',
      highest: [{ id: 'emp-2', employee_number: 'EMP-00002', first_name: 'Priya', last_name: 'Iyer', department: 'Engineering', country_code: 'IN', currency: 'INR', annual_minor: 2_000_000_00 }],
      lowest: [{ id: 'emp-3', employee_number: 'EMP-00003', first_name: 'Arjun', last_name: 'Shah', department: 'Engineering', country_code: 'IN', currency: 'INR', annual_minor: 1_000_000_00 }],
    },
  ],
  recent_changes: [
    {
      employee_id: 'emp-1', employee_number: 'EMP-00001', first_name: 'Ada', last_name: 'Lovelace',
      amount_minor: 90_000_00, currency: 'GBP', pay_frequency: 'annual', effective_from: '2024-01-15',
      change_reason: 'annual_review', created_at: '2024-01-15T09:00:00Z',
    },
  ],
}
