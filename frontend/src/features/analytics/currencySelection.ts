import type { MoneyGroup } from '../../api/types'

/**
 * Pick the currency to chart. Cross-currency comparisons need an FX policy, so charts
 * show one currency at a time, defaulting to the one covering the most employees.
 */
export function chooseCurrency(groups: MoneyGroup[], requested: string | null): string | null {
  if (requested && groups.some((group) => group.currency === requested)) return requested
  const largest = [...groups].sort((a, b) => b.employee_count - a.employee_count)[0]
  return largest?.currency ?? null
}
