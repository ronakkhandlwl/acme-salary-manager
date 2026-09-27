import type { PayFrequency } from '../api/types'

export const SUPPORTED_CURRENCIES = ['INR', 'USD', 'GBP', 'EUR', 'SGD'] as const

export function minorDigits(currency: string): number {
  return new Intl.NumberFormat('en', { style: 'currency', currency }).resolvedOptions()
    .maximumFractionDigits ?? 2
}

/** Format integer minor units without ever dividing into a float for storage. */
export function formatMoney(
  amountMinor: number,
  currency: string,
  options: { compact?: boolean; wholeUnits?: boolean } = {},
): string {
  const digits = minorDigits(currency)
  const major = amountMinor / 10 ** digits // display-only conversion
  const fractionDigits = options.compact ? 1 : options.wholeUnits ? 0 : digits
  return new Intl.NumberFormat('en', {
    style: 'currency',
    currency,
    notation: options.compact ? 'compact' : 'standard',
    maximumFractionDigits: fractionDigits,
    minimumFractionDigits: options.compact || options.wholeUnits || Number.isInteger(major) ? 0 : digits,
  }).format(major)
}

/**
 * Parse a user-typed major-unit amount ("95,000.50") into integer minor units using
 * string arithmetic, so 0.1 + 0.2 style float errors can never reach the API.
 * Returns null for anything that is not a positive amount with valid precision.
 */
export function parseMoneyInput(input: string, currency: string): number | null {
  const digits = minorDigits(currency)
  const cleaned = input.replace(/[,\s]/g, '')
  const pattern = digits > 0 ? new RegExp(`^(\\d+)(?:\\.(\\d{1,${digits}}))?$`) : /^(\d+)$/
  const match = pattern.exec(cleaned)
  if (!match) return null
  const [, whole, fraction = ''] = match
  const minor = Number(whole) * 10 ** digits + Number(fraction.padEnd(digits, '0') || 0)
  return Number.isSafeInteger(minor) && minor > 0 ? minor : null
}

export function annualize(amountMinor: number, payFrequency: PayFrequency): number {
  return payFrequency === 'monthly' ? amountMinor * 12 : amountMinor
}

/** Percentage change between two amounts, or null when not comparable. */
export function percentChange(previousMinor: number, nextMinor: number): number | null {
  if (previousMinor <= 0) return null
  return ((nextMinor - previousMinor) / previousMinor) * 100
}
