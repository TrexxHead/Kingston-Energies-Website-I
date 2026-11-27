'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { priceAt, priceSummary, jamaicaTimeText, type OperatorPrice } from '@/lib/refdata/chargingPrice'

const money = (n: number) => `J$${n.toLocaleString('en-JM', { maximumFractionDigits: 2 })}`

/**
 * The operator's published charging price at this moment (Jamaica time),
 * when it changes next, and the full price list with its source and date.
 * Renders the static list until mounted so server and browser agree.
 */
export function ChargePrice({ price, compact = false }: { price: OperatorPrice; compact?: boolean }) {
  const [now, setNow] = useState<Date | null>(null)
  useEffect(() => {
    setNow(new Date())
    const t = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(t)
  }, [])
  const p = now ? priceAt(price.data, now) : null
  const summary = priceSummary(price.data)
  const seen = new Date(`${price.source.retrievedAt}T12:00:00Z`).toLocaleDateString('en-JM', { day: 'numeric', month: 'short', year: 'numeric' })
  const bands = !!price.data.periods?.length

  return (
    <div className="ke-price" data-testid="charge-price">
      {p && (bands || p.pricePerKwh != null) ? (
        <p className="ke-price__now">
          <strong>{p.pricePerKwh != null ? `${money(p.pricePerKwh)}/kWh now` : 'No per-kWh price at this time'}</strong>
          {p.label && <span className="ke-price__band"> · {p.label} rate</span>}
          {p.next && (
            <span className="ke-price__next">
              {' '}
              · {p.next.pricePerKwh != null ? money(p.next.pricePerKwh) : 'changes'} from {jamaicaTimeText(p.next.at)}
            </span>
          )}
        </p>
      ) : null}
      {(!compact || !p || !!price.data.sessionFee || !!price.data.idleFeePerMin) && summary && <p className="ke-price__list">{summary}</p>}
      {!compact && price.data.notes && <p className="ke-price__list">{price.data.notes}</p>}
      <p className="ke-price__src">
        {price.live ? (
          <>Live from {price.data.operator}’s system · updated {new Date(price.live.retrievedAt).toLocaleTimeString('en-JM', { timeZone: 'America/Jamaica', hour: 'numeric', minute: '2-digit' })}.</>
        ) : (
          <>
            {price.data.operator}’s published price · {price.source.url ? <a href={price.source.url} target="_blank" rel="noopener noreferrer">{price.source.title}</a> : price.source.title} · checked {seen}.
          </>
        )}{' '}
        Confirm in the operator’s app before you charge.
      </p>
      {bands && !compact && <EveningWhy />}
      <style>{PRICE_CSS}</style>
    </div>
  )
}

/** Why some operators charge more in the evening — general reasons, not a claim about any one operator. */
export function EveningWhy({ calculatorLink = true }: { calculatorLink?: boolean }) {
  return (
    <details className="ke-price__why">
      <summary>Why can evening charging cost more?</summary>
      <ul>
        <li><strong>The grid’s busiest hours.</strong> Demand in Jamaica peaks in the evening, when homes light up and cook while businesses are still open. Meeting that peak means running the most expensive power plants, so electricity costs more to supply then.</li>
        <li><strong>Commercial power bills.</strong> Charging sites usually pay a commercial rate. Larger sites can be on time-of-use rates that cost more at peak, plus a demand charge set by their highest burst of use in the month — a few fast chargers running at once in the evening can raise the whole month’s bill.</li>
        <li><strong>Spreading cars across the day.</strong> A higher evening price nudges drivers who can wait to charge overnight or in the daytime, so the chargers are free for people who need them at peak.</li>
        <li><strong>Night running costs.</strong> Security, lighting and staff after dark add to what a site costs to keep open.</li>
      </ul>
      <p>
        If you can, charge at home overnight or at a cheaper time of day.
        {calculatorLink && (
          <>
            {' '}
            The <Link href="/ev-costs">EV cost calculator</Link> lets you pick when you charge.
          </>
        )}
      </p>
      <style>{PRICE_CSS}</style>
    </details>
  )
}

const PRICE_CSS = `
.ke-price{display:grid;gap:4px;font-size:13px;line-height:1.45}
.ke-price p{margin:0}
.ke-price__now strong{color:inherit;font-weight:700}
.ke-price__band,.ke-price__next{opacity:.85}
.ke-price__list{opacity:.85}
.ke-price__src{font-size:11.5px;opacity:.7}
.ke-price__src a{color:inherit;text-decoration:underline}
.ke-price__why{margin-top:4px}
.ke-price__why a{color:var(--ke-green-400,#3ecf8e)}
.ke-price__why summary{cursor:pointer;font-weight:600;color:var(--ke-green-400,#3ecf8e)}
.ke-price__why ul{margin:6px 0;padding-left:18px;display:grid;gap:6px}
`
