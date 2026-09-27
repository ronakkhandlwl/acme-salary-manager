import type { ChangeReason, EmploymentStatus, PayFrequency } from '../api/types'

export const CHANGE_REASON_LABELS: Record<ChangeReason, string> = {
  initial_offer: 'Initial offer',
  annual_review: 'Annual review',
  promotion: 'Promotion',
  market_adjustment: 'Market adjustment',
  role_change: 'Role change',
  correction: 'Correction',
}

export const STATUS_LABELS: Record<EmploymentStatus, string> = {
  active: 'Active',
  inactive: 'Inactive',
  terminated: 'Terminated',
}

export const PAY_FREQUENCY_LABELS: Record<PayFrequency, string> = {
  annual: 'Annual',
  monthly: 'Monthly',
}

const regionNames = new Intl.DisplayNames(['en'], { type: 'region' })

export function countryName(code: string): string {
  try {
    return regionNames.of(code) ?? code
  } catch {
    return code
  }
}

export function formatDate(isoDate: string): string {
  const [year, month, day] = isoDate.slice(0, 10).split('-').map(Number)
  return new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeZone: 'UTC' }).format(
    new Date(Date.UTC(year, month - 1, day)),
  )
}

export function todayIso(): string {
  const now = new Date()
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000)
  return local.toISOString().slice(0, 10)
}
