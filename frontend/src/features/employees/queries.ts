import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getFilterOptions } from '../../api/analytics'
import { addSalaryRecord, createEmployee, getEmployee, listEmployees } from '../../api/employees'
import type { EmployeeCreate, EmployeeQuery, SalaryRecordCreate } from '../../api/types'

export const queryKeys = {
  employees: ['employees'] as const,
  employeeList: (query: EmployeeQuery) => ['employees', 'list', query] as const,
  employee: (id: string) => ['employees', 'detail', id] as const,
  analytics: ['analytics'] as const,
  filterOptions: ['analytics', 'filters'] as const,
}

export function useEmployeeList(query: EmployeeQuery) {
  return useQuery({
    queryKey: queryKeys.employeeList(query),
    queryFn: () => listEmployees(query),
    placeholderData: keepPreviousData, // keep the table stable while paging
  })
}

export function useEmployee(employeeId: string) {
  return useQuery({ queryKey: queryKeys.employee(employeeId), queryFn: () => getEmployee(employeeId) })
}

export function useFilterOptions() {
  return useQuery({ queryKey: queryKeys.filterOptions, queryFn: getFilterOptions, staleTime: 5 * 60_000 })
}

/** Salary writes change the directory, the profile and every analytic. */
function useInvalidateCompensation() {
  const queryClient = useQueryClient()
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.employees }),
      queryClient.invalidateQueries({ queryKey: queryKeys.analytics }),
    ])
}

export function useAddSalaryRecord(employeeId: string) {
  const invalidate = useInvalidateCompensation()
  return useMutation({
    mutationFn: (payload: SalaryRecordCreate) => addSalaryRecord(employeeId, payload),
    onSuccess: invalidate,
  })
}

export function useCreateEmployee() {
  const invalidate = useInvalidateCompensation()
  return useMutation({
    // The API stores the employee and starting salary atomically.
    mutationFn: (payload: EmployeeCreate) => createEmployee(payload),
    onSuccess: invalidate,
  })
}
