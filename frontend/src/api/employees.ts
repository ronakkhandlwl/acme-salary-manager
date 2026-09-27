import { buildQuery, request } from './client'
import type {
  Employee,
  EmployeeCreate,
  EmployeeDetail,
  EmployeePage,
  EmployeeQuery,
  SalaryRecord,
  SalaryRecordCreate,
} from './types'

export function listEmployees(query: EmployeeQuery): Promise<EmployeePage> {
  return request<EmployeePage>(
    `/api/v1/employees${buildQuery({
      page: query.page,
      page_size: query.pageSize,
      search: query.search?.trim(),
      country_code: query.countryCode,
      department: query.department,
      employment_status: query.employmentStatus,
      sort_by: query.sortBy,
      sort_direction: query.sortDirection,
    })}`,
  )
}

export function getEmployee(employeeId: string): Promise<EmployeeDetail> {
  return request<EmployeeDetail>(`/api/v1/employees/${encodeURIComponent(employeeId)}`)
}

export function createEmployee(payload: EmployeeCreate): Promise<Employee> {
  return request<Employee>('/api/v1/employees', { method: 'POST', body: JSON.stringify(payload) })
}

export function addSalaryRecord(
  employeeId: string,
  payload: SalaryRecordCreate,
): Promise<SalaryRecord> {
  return request<SalaryRecord>(
    `/api/v1/employees/${encodeURIComponent(employeeId)}/salary-records`,
    { method: 'POST', body: JSON.stringify(payload) },
  )
}
