import { annualize, formatMoney, parseMoneyInput, percentChange } from './money'

describe('parseMoneyInput', () => {
  it.each([
    ['95000', 9_500_000],
    ['95,000.5', 9_500_050],
    [' 1 234.56 ', 123_456],
    ['0.10', 10],
  ])('converts %j to integer minor units', (input, expected) => {
    expect(parseMoneyInput(input, 'USD')).toBe(expected)
  })

  it('never introduces floating point error', () => {
    // 0.29 * 100 === 28.999999999999996 in IEEE-754.
    expect(parseMoneyInput('0.29', 'USD')).toBe(29)
    expect(parseMoneyInput('1000000.07', 'INR')).toBe(100_000_007)
  })

  it.each(['', 'abc', '-5', '0', '1.234', '1e5', '12.3.4'])('rejects %j', (input) => {
    expect(parseMoneyInput(input, 'USD')).toBeNull()
  })

  it('respects currencies without minor units', () => {
    expect(parseMoneyInput('5000', 'JPY')).toBe(5000)
    expect(parseMoneyInput('5000.5', 'JPY')).toBeNull()
  })
})

describe('formatMoney', () => {
  it('formats minor units with the currency symbol', () => {
    expect(formatMoney(9_500_050, 'USD')).toBe('$95,000.50')
    expect(formatMoney(9_500_000, 'GBP')).toBe('£95,000')
  })

  it('supports compact and whole-unit display', () => {
    expect(formatMoney(150_000_000_00, 'INR', { compact: true })).toBe('₹150M')
    expect(formatMoney(10_085_423, 'EUR', { wholeUnits: true })).toBe('€100,854')
  })
})

describe('annualize and percentChange', () => {
  it('annualizes monthly pay only', () => {
    expect(annualize(1_000_00, 'monthly')).toBe(12_000_00)
    expect(annualize(1_000_00, 'annual')).toBe(1_000_00)
  })

  it('computes percentage change and guards zero baselines', () => {
    expect(percentChange(100, 108)).toBeCloseTo(8)
    expect(percentChange(0, 10)).toBeNull()
  })
})
