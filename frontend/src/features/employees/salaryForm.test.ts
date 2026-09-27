import { validateSalaryForm, type SalaryFormValues } from './salaryForm'

const valid: SalaryFormValues = {
  amount: '95,000',
  currency: 'USD',
  payFrequency: 'annual',
  effectiveFrom: '2026-10-01',
  changeReason: 'promotion',
}
const context = { hireDate: '2020-01-15', today: '2026-09-27' }

describe('validateSalaryForm', () => {
  it('builds an API payload in minor units', () => {
    expect(validateSalaryForm(valid, context)).toEqual({
      errors: {},
      payload: {
        amount_minor: 9_500_000,
        currency: 'USD',
        pay_frequency: 'annual',
        effective_from: '2026-10-01',
        change_reason: 'promotion',
      },
    })
  })

  it('rejects an invalid amount', () => {
    const result = validateSalaryForm({ ...valid, amount: '12.345' }, context)
    expect(result.payload).toBeUndefined()
    expect(result.errors.amount).toMatch(/positive amount/)
  })

  it('rejects dates before hire or more than a year ahead', () => {
    expect(validateSalaryForm({ ...valid, effectiveFrom: '2019-12-31' }, context).errors.effectiveFrom).toMatch(/hire date/)
    expect(validateSalaryForm({ ...valid, effectiveFrom: '2027-10-01' }, context).errors.effectiveFrom).toMatch(/year/)
    expect(validateSalaryForm({ ...valid, effectiveFrom: '' }, context).errors.effectiveFrom).toBeDefined()
  })
})
