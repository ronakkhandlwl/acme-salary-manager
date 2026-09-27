import type { SalaryRecord } from '../../api/types'
import { annualize, percentChange } from '../../lib/money'

export interface SalaryHistoryRow {
  record: SalaryRecord
  annualMinor: number
  /** Change vs the previous record in the same currency; null for the first or a currency switch. */
  changePercent: number | null
  status: 'scheduled' | 'current' | 'past'
}

/** Annotate newest-first history with annualized pay, change %, and current/scheduled status. */
export function buildSalaryHistory(
  history: SalaryRecord[],
  currentId: string | undefined,
): SalaryHistoryRow[] {
  return history.map((record, index) => {
    const previous = history[index + 1]
    const annualMinor = annualize(record.amount_minor, record.pay_frequency)
    const comparable = previous && previous.currency === record.currency
    return {
      record,
      annualMinor,
      changePercent: comparable
        ? percentChange(annualize(previous.amount_minor, previous.pay_frequency), annualMinor)
        : null,
      status:
        record.id === currentId
          ? 'current'
          : currentId === undefined || history.findIndex((item) => item.id === currentId) > index
            ? 'scheduled'
            : 'past',
    }
  })
}
