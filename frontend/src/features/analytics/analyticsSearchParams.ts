import type { AnalyticsQuery, EmploymentStatus } from '../../api/types'

const STATUSES: (EmploymentStatus | 'all')[] = ['active', 'inactive', 'terminated', 'all']

export function readAnalyticsQuery(params: URLSearchParams): AnalyticsQuery {
  const status = params.get('status') as AnalyticsQuery['employmentStatus'] | null
  return {
    countryCode: params.get('country') ?? undefined,
    department: params.get('department') ?? undefined,
    employmentStatus: status && STATUSES.includes(status) ? status : 'active',
  }
}

export function writeAnalyticsQuery(query: AnalyticsQuery): URLSearchParams {
  const params = new URLSearchParams()
  if (query.countryCode) params.set('country', query.countryCode)
  if (query.department) params.set('department', query.department)
  if (query.employmentStatus !== 'active') params.set('status', query.employmentStatus)
  return params
}
