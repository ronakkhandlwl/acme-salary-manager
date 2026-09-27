import type { MoneyGroup } from '../../api/types'
import { chooseCurrency } from './currencySelection'

const group = (currency: string, employee_count: number): MoneyGroup => ({
  currency,
  employee_count,
  payroll_minor: 0,
  average_minor: 0,
  median_minor: 0,
})

describe('chooseCurrency', () => {
  const groups = [group('USD', 10), group('INR', 30)]

  it('defaults to the currency covering the most employees', () => {
    expect(chooseCurrency(groups, null)).toBe('INR')
  })

  it('honours a requested currency only when it is present', () => {
    expect(chooseCurrency(groups, 'USD')).toBe('USD')
    expect(chooseCurrency(groups, 'EUR')).toBe('INR')
    expect(chooseCurrency([], 'USD')).toBeNull()
  })
})
