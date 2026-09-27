import type { SalaryRecord } from '../../api/types'
import { buildSalaryHistory } from './salaryHistory'

function record(id: string, effective: string, amount: number, extra: Partial<SalaryRecord> = {}): SalaryRecord {
  return {
    id,
    amount_minor: amount,
    currency: 'GBP',
    pay_frequency: 'annual',
    effective_from: effective,
    change_reason: 'annual_review',
    created_at: null,
    ...extra,
  }
}

describe('buildSalaryHistory', () => {
  const history = [
    record('future', '2027-01-01', 110_00),
    record('current', '2025-01-01', 100_00),
    record('old', '2024-01-01', 80_00, { pay_frequency: 'monthly' }),
  ]

  it('labels scheduled, current and past records', () => {
    expect(buildSalaryHistory(history, 'current').map((row) => row.status)).toEqual(['scheduled', 'current', 'past'])
  })

  it('computes change against the previous annualized salary', () => {
    const rows = buildSalaryHistory(history, 'current')
    expect(rows[0].changePercent).toBeCloseTo(10)
    expect(rows[1].changePercent).toBeCloseTo(((100_00 - 960_00) / 960_00) * 100)
    expect(rows[2].changePercent).toBeNull()
  })

  it('does not compare across currencies', () => {
    const rows = buildSalaryHistory([record('a', '2025-01-01', 100_00, { currency: 'EUR' }), record('b', '2024-01-01', 90_00)], 'a')
    expect(rows[0].changePercent).toBeNull()
  })

  it('treats every record as scheduled when none is in effect yet', () => {
    expect(buildSalaryHistory([record('x', '2027-01-01', 1)], undefined)[0].status).toBe('scheduled')
  })
})
