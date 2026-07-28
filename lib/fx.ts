import { prisma } from '@/lib/prisma'

/**
 * Foreign currency.
 *
 * JMD is the functional currency: every journal line is in JMD, without
 * exception. That is what keeps a trial balance addable.
 *
 * A foreign-currency transaction is converted once, at a rate a person entered,
 * and the entry records both. Nothing here fetches a rate from the internet or
 * carries one forward silently — "which rate did you use, and where did it come
 * from" is the first question anyone asks about a foreign purchase, and the
 * answer has to be in the record.
 */

export const FUNCTIONAL_CURRENCY = 'JMD'

/** Currencies a Jamaican SME realistically transacts in. Rates are still per-entry. */
export const SUPPORTED_CURRENCIES = ['JMD', 'USD', 'GBP', 'CAD', 'EUR'] as const
export type SupportedCurrency = (typeof SUPPORTED_CURRENCIES)[number]

export class MissingRateError extends Error {
  constructor(
    public currency: string,
    public asOf: Date,
  ) {
    super(`No exchange rate on record for ${currency} on or before ${asOf.toISOString().slice(0, 10)}.`)
    this.name = 'MissingRateError'
  }
}

/**
 * How stale a rate may be before it stops being usable.
 *
 * A rate from three months ago is not a rate, it's a guess with a date on it.
 * Rather than converting at it and producing a plausible-looking wrong number,
 * lookups past this window fail and ask for a current rate.
 */
export const MAX_RATE_AGE_DAYS = 31

export interface RateQuote {
  currency: string
  /** How many JMD one unit of `currency` buys. */
  rate: number
  asOf: Date
  source: string | null
  ageDays: number
}

/**
 * The most recent rate on or before a date.
 *
 * Deliberately never falls forward to a later rate: converting a January
 * purchase at March's rate restates history.
 */
export async function rateFor(currency: string, asOf: Date = new Date()): Promise<RateQuote | null> {
  if (currency === FUNCTIONAL_CURRENCY) {
    return { currency, rate: 1, asOf, source: 'functional currency', ageDays: 0 }
  }

  const row = await prisma.exchangeRate.findFirst({
    where: { currency, asOf: { lte: asOf } },
    orderBy: { asOf: 'desc' },
  })
  if (!row) return null

  const ageDays = Math.floor((asOf.getTime() - row.asOf.getTime()) / 86_400_000)
  return { currency: row.currency, rate: row.rate, asOf: row.asOf, source: row.source, ageDays }
}

/**
 * Convert into JMD, or refuse.
 *
 * Throws rather than returning a fallback, because every fallback here is a
 * number that looks like an answer and isn't.
 */
export async function toFunctional(amount: number, currency: string, asOf: Date = new Date()): Promise<{ amount: number; quote: RateQuote }> {
  const quote = await rateFor(currency, asOf)
  if (!quote) throw new MissingRateError(currency, asOf)
  if (quote.ageDays > MAX_RATE_AGE_DAYS) {
    throw new MissingRateError(currency, asOf)
  }
  return { amount: Math.round(amount * quote.rate * 100) / 100, quote }
}

/**
 * Realised gain or loss when a foreign balance settles at a different rate to
 * the one it was booked at.
 *
 * Positive is a gain: the JMD received exceeded the JMD the receivable was
 * carried at.
 */
export function realisedFxDifference(originalAmount: number, bookedRate: number, settledRate: number): number {
  return Math.round(originalAmount * (settledRate - bookedRate) * 100) / 100
}

/** Which currencies have a usable rate right now, for the UI to offer. */
export async function usableCurrencies(asOf: Date = new Date()): Promise<{ currency: string; rate: number; asOf: string; stale: boolean }[]> {
  const out: { currency: string; rate: number; asOf: string; stale: boolean }[] = []
  for (const currency of SUPPORTED_CURRENCIES) {
    const quote = await rateFor(currency, asOf)
    if (!quote) continue
    out.push({
      currency,
      rate: quote.rate,
      asOf: quote.asOf.toISOString(),
      stale: quote.ageDays > MAX_RATE_AGE_DAYS,
    })
  }
  return out
}
