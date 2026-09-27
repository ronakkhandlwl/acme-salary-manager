import type { EmployeeCreate } from '../../api/types'
import { todayIso } from '../../lib/labels'

export type EmployeeFields = Omit<EmployeeCreate, 'employment_status' | 'initial_salary'>
export type EmployeeErrors = Partial<Record<keyof EmployeeFields, string>>

export const EMPTY_EMPLOYEE: EmployeeFields = {
  employee_number: '',
  first_name: '',
  last_name: '',
  email: '',
  country_code: '',
  department: '',
  title: '',
  hire_date: todayIso(),
}

export const EMPLOYEE_FIELDS: { key: keyof EmployeeFields; label: string; type?: string; sm: number }[] = [
  { key: 'first_name', label: 'First name', sm: 6 },
  { key: 'last_name', label: 'Last name', sm: 6 },
  { key: 'email', label: 'Work email', type: 'email', sm: 6 },
  { key: 'employee_number', label: 'Employee number', sm: 6 },
  { key: 'title', label: 'Job title', sm: 6 },
  { key: 'department', label: 'Department', sm: 6 },
  { key: 'country_code', label: 'Country code (ISO, e.g. IN)', sm: 6 },
  { key: 'hire_date', label: 'Hire date', type: 'date', sm: 6 },
]

export function validateEmployee(fields: EmployeeFields): EmployeeErrors {
  const errors: EmployeeErrors = {}
  for (const { key, label } of EMPLOYEE_FIELDS) {
    if (!fields[key].trim()) errors[key] = `${label.replace(/ \(.*\)/, '')} is required`
  }
  if (fields.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email)) errors.email = 'Enter a valid email'
  if (fields.country_code && !/^[A-Za-z]{2}$/.test(fields.country_code)) {
    errors.country_code = 'Use a two-letter ISO code'
  }
  return errors
}
