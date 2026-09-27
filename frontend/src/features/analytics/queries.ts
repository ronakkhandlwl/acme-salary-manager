import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { getAnalyticsSummary } from '../../api/analytics'
import type { AnalyticsQuery } from '../../api/types'

export function useAnalyticsSummary(query: AnalyticsQuery) {
  return useQuery({
    queryKey: ['analytics', 'summary', query],
    queryFn: () => getAnalyticsSummary(query),
    placeholderData: keepPreviousData,
  })
}
