import type { EmploymentStatus, EmployeeQuery, SortField } from '../../api/types'

export const PAGE_SIZES = [25, 50, 100] as const
const SORT_FIELDS: SortField[] = [
  'employee_number',
  'first_name',
  'last_name',
  'department',
  'country_code',
  'hire_date',
]
const STATUSES: EmploymentStatus[] = ['active', 'inactive', 'terminated']

function positiveInt(value: string | null, fallback: number): number {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback
}

/** Read directory state from the URL so views are shareable and survive refresh. */
export function readDirectoryQuery(params: URLSearchParams): EmployeeQuery {
  const sortBy = params.get('sort') as SortField | null
  const status = params.get('status') as EmploymentStatus | null
  const pageSize = positiveInt(params.get('size'), 25)
  return {
    page: positiveInt(params.get('page'), 1),
    pageSize: (PAGE_SIZES as readonly number[]).includes(pageSize) ? pageSize : 25,
    search: params.get('q') ?? undefined,
    countryCode: params.get('country') ?? undefined,
    department: params.get('department') ?? undefined,
    employmentStatus: status && STATUSES.includes(status) ? status : undefined,
    sortBy: sortBy && SORT_FIELDS.includes(sortBy) ? sortBy : 'last_name',
    sortDirection: params.get('dir') === 'desc' ? 'desc' : 'asc',
  }
}

export function writeDirectoryQuery(query: EmployeeQuery): URLSearchParams {
  const params = new URLSearchParams()
  const entries: [string, string | number | undefined][] = [
    ['q', query.search],
    ['country', query.countryCode],
    ['department', query.department],
    ['status', query.employmentStatus],
    ['sort', query.sortBy === 'last_name' ? undefined : query.sortBy],
    ['dir', query.sortDirection === 'asc' ? undefined : query.sortDirection],
    ['page', query.page === 1 ? undefined : query.page],
    ['size', query.pageSize === 25 ? undefined : query.pageSize],
  ]
  for (const [key, value] of entries) {
    if (value !== undefined && value !== '') params.set(key, String(value))
  }
  return params
}
