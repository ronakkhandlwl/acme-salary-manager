import { buildQuery, request } from './client'
import type { AnalyticsQuery, AnalyticsSummary, FilterOptions } from './types'

export function getAnalyticsSummary(query: AnalyticsQuery): Promise<AnalyticsSummary> {
  return request<AnalyticsSummary>(
    `/api/v1/analytics/summary${buildQuery({
      country_code: query.countryCode,
      department: query.department,
      employment_status: query.employmentStatus,
    })}`,
  )
}

export function getFilterOptions(): Promise<FilterOptions> {
  return request<FilterOptions>('/api/v1/analytics/filters')
}
