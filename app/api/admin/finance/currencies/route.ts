import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma, isMissingSchemaError } from '@/lib/prisma'
import { guardAdmin, requireAdmin } from '@/lib/requireAdmin'
import { FUNCTIONAL_CURRENCY, MAX_RATE_AGE_DAYS, SUPPORTED_CURRENCIES, rateFor } from '@/lib/fx'
import { migrationPendingResponse } from '@/lib/apiErrors'

/** Current rates, their age, and the recent history behind them. */
export async function GET() {
  const denied = await guardAdmin()
  if (denied) return denied

  try {
    return await getCurrencies()
  } catch (err) {
    if (isMissingSchemaError(err)) return migrationPendingResponse()
    throw err
  }
}

async function getCurrencies() {
  const now = new Date()
  const current = await Promise.all(
    SUPPORTED_CURRENCIES.filter((c) => c !== FUNCTIONAL_CURRENCY).map(async (currency) => {
      const quote = await rateFor(currency, now)
      return {
        currency,
        rate: quote?.rate ?? null,
        asOf: quote?.asOf.toISOString() ?? null,
        source: quote?.source ?? null,
        ageDays: quote?.ageDays ?? null,
        // Stale is not "slightly old" — past this, conversion is refused
        // outright rather than producing a plausible wrong number.
        stale: quote ? quote.ageDays > MAX_RATE_AGE_DAYS : false,
        usable: Boolean(quote && quote.ageDays <= MAX_RATE_AGE_DAYS),
      }
    }),
  )

  const history = await prisma.exchangeRate.findMany({ orderBy: { asOf: 'desc' }, take: 40 })

  return NextResponse.json({
    functionalCurrency: FUNCTIONAL_CURRENCY,
    maxRateAgeDays: MAX_RATE_AGE_DAYS,
    currencies: current,
    history: history.map((h) => ({
      id: h.id,
      currency: h.currency,
      rate: h.rate,
      asOf: h.asOf.toISOString(),
      source: h.source,
      enteredBy: h.enteredBy,
    })),
  })
}

const schema = z.object({
  currency: z.enum(SUPPORTED_CURRENCIES),
  /** How many JMD one unit of the currency buys. */
  rate: z.number().positive(),
  asOf: z.string().min(1),
  source: z.string().max(120).optional(),
})

/** Record a rate. Rates are entered by a person, with a stated source. */
export async function POST(request: Request) {
  const denied = await guardAdmin()
  if (denied) return denied
  const session = await requireAdmin()

  const parsed = schema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Enter a currency, a positive rate and a date.' }, { status: 400 })
  const d = parsed.data

  if (d.currency === FUNCTIONAL_CURRENCY) {
    return NextResponse.json({ error: `${FUNCTIONAL_CURRENCY} is the functional currency — its rate is always 1.` }, { status: 400 })
  }

  const asOf = new Date(d.asOf)
  if (Number.isNaN(asOf.getTime())) return NextResponse.json({ error: 'Invalid date' }, { status: 400 })
  // Normalise to the day: two rates for the same currency and day are one rate.
  asOf.setUTCHours(0, 0, 0, 0)

  await prisma.exchangeRate.upsert({
    where: { currency_asOf: { currency: d.currency, asOf } },
    create: { currency: d.currency, rate: d.rate, asOf, source: d.source || null, enteredBy: session.user?.email ?? null },
    update: { rate: d.rate, source: d.source || null, enteredBy: session.user?.email ?? null },
  })

  return NextResponse.json({ ok: true }, { status: 201 })
}
