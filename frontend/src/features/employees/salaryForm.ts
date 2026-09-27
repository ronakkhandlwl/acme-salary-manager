import type { ChangeReason, PayFrequency, SalaryRecordCreate } from '../../api/types'
import { parseMoneyInput } from '../../lib/money'

export interface SalaryFormValues {
  amount: string
  currency: string
  payFrequency: PayFrequency
  effectiveFrom: string
  changeReason: ChangeReason
}

export type SalaryFormErrors = Partial<Record<keyof SalaryFormValues, string>>

const MAX_FUTURE_DAYS = 366 // mirrors the API rule

function addDays(isoDate: string, days: number): string {
  const date = new Date(`${isoDate}T00:00:00Z`)
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

/** Validate in the browser for fast feedback; the API re-validates every rule. */
export function validateSalaryForm(
  values: SalaryFormValues,
  context: { hireDate?: string; today: string },
): { errors: SalaryFormErrors; payload?: SalaryRecordCreate } {
  const errors: SalaryFormErrors = {}
  const amountMinor = parseMoneyInput(values.amount, values.currency)
  if (amountMinor === null) errors.amount = 'Enter a positive amount with at most 2 decimal places'
  if (!/^[A-Z]{3}$/.test(values.currency)) errors.currency = 'Choose a currency'
  if (!values.effectiveFrom) {
    errors.effectiveFrom = 'Choose the date this salary takes effect'
  } else if (context.hireDate && values.effectiveFrom < context.hireDate) {
    errors.effectiveFrom = 'Cannot be before the hire date'
  } else if (values.effectiveFrom > addDays(context.today, MAX_FUTURE_DAYS)) {
    errors.effectiveFrom = 'Cannot be more than a year in the future'
  }
  if (Object.keys(errors).length > 0 || amountMinor === null) return { errors }
  return {
    errors,
    payload: {
      amount_minor: amountMinor,
      currency: values.currency,
      pay_frequency: values.payFrequency,
      effective_from: values.effectiveFrom,
      change_reason: values.changeReason,
    },
  }
}
