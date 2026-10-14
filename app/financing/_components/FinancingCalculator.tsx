'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { card, label, input, muted, h2, fmt } from '@/app/my-energy/_components/ui'
import { loanCost } from '@/lib/energy/engine/finance'
import type { PublicRecord } from '@/lib/refdata/types'

/**
 * Financing calculator (roadmap W2). Lender terms are ADVERTISED rates
 * entered by staff from each lender's own page (reference data) — shown
 * with source and date, never as an offer or a partnership.
 */

const num = (v: string) => (v.trim() === '' ? undefined : Number(v.replace(/,/g, '')))
const money = (v: number) => `J$${fmt(Math.round(v), 0)}`
const digits = (v: string) => v.replace(/[^\d.,]/g, '')

export default function FinancingCalculator() {
  const [offers, setOffers] = useState<PublicRecord<'lender_offer'>[] | null>(null)
  useEffect(() => {
    fetch('/api/refdata?kind=lender_offer&all=1')
      .then((r) => (r.ok ? r.json() : { records: [] }))
      .then((d) => setOffers(d.records ?? []))
      .catch(() => setOffers([]))
    // Pre-fill from a link, e.g. /financing?price=1250000&saving=18000 from the solar estimator.
    const q = new URLSearchParams(window.location.search)
    if (q.get('price')) setPrice(digits(q.get('price') ?? ''))
    if (q.get('saving')) setSaving(digits(q.get('saving') ?? ''))
  }, [])

  const [price, setPrice] = useState('')
  const [deposit, setDeposit] = useState('')
  const [offerId, setOfferId] = useState('')
  const [rate, setRate] = useState('')
  const [years, setYears] = useState('5')
  const [fees, setFees] = useState('')
  const [saving, setSaving] = useState('')

  const offer = offers?.find((o) => o.id === offerId)
  useEffect(() => {
    if (!offer) return
    setRate(String(offer.data.annualRatePct))
    if (offer.data.maxTermMonths && (num(years) ?? 0) * 12 > offer.data.maxTermMonths) setYears(String(Math.floor(offer.data.maxTermMonths / 12) || 1))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [offerId])

  const termMonths = Math.round((num(years) ?? 0) * 12)
  const result = useMemo(
    () => loanCost({ price: num(price) ?? 0, deposit: num(deposit) ?? 0, annualRatePct: num(rate) ?? Number.NaN, termMonths, financedFees: num(fees), monthlySaving: num(saving) }),
    [price, deposit, rate, termMonths, fees, saving],
  )
  const depositShort = offer?.data.minDepositPct != null && num(price) ? (num(deposit) ?? 0) < (offer.data.minDepositPct / 100) * (num(price) ?? 0) : false
  const termLong = offer?.data.maxTermMonths ? termMonths > offer.data.maxTermMonths : false

  const field = (id: string, text: string, value: string, set: (v: string) => void, hint?: string) => (
    <div>
      <label htmlFor={id} style={label}>{text}</label>
      <input id={id} style={input} inputMode="decimal" placeholder={hint} value={value} onChange={(e) => set(digits(e.target.value))} />
    </div>
  )

  return (
    <div style={{ display: 'grid', gap: 20 }}>
      <style>{CSS}</style>
      <div className="ke-fin-grid">
        <section style={{ ...card, display: 'grid', gap: 12, alignContent: 'start' }} aria-labelledby="fin-buy">
          <h2 id="fin-buy" style={h2}>What you’re buying</h2>
          {field('fin-price', 'Price (J$)', price, setPrice, 'From your quote')}
          {field('fin-dep', 'Deposit you’ll pay (J$)', deposit, setDeposit, '0 if none')}
          {field('fin-save', 'Optional: monthly bill saving (J$)', saving, setSaving, 'From the solar estimator or your own figure')}
          <p style={{ ...muted, margin: 0, fontSize: 12.5 }}>
            Don’t know your saving? The <Link href="/solar" className="ke-fin-link">rooftop solar estimator</Link> works it out from your roof and bill.
          </p>
        </section>
        <section style={{ ...card, display: 'grid', gap: 12, alignContent: 'start' }} aria-labelledby="fin-loan">
          <h2 id="fin-loan" style={h2}>The loan</h2>
          {offers && offers.length > 0 && (
            <div>
              <label htmlFor="fin-offer" style={label}>Lenders’ advertised rates</label>
              <select id="fin-offer" style={input} value={offerId} onChange={(e) => setOfferId(e.target.value)}>
                <option value="">Type my own rate</option>
                {offers.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.data.lender} — {o.data.product}: {o.data.rateIsFrom ? 'from ' : ''}{o.data.annualRatePct}% {o.data.rateType}
                  </option>
                ))}
              </select>
              {offer && (
                <small style={{ ...muted, fontSize: 12, display: 'block', marginTop: 6 }}>
                  As advertised on {offer.source.url ? <a href={offer.source.url} target="_blank" rel="noopener noreferrer" className="ke-fin-link">{offer.source.title}</a> : offer.source.title}, read {offer.source.retrievedAt}.
                  {offer.data.rateIsFrom && ' “From” is the lowest advertised rate — yours may be higher.'}
                  {offer.data.notes && ` ${offer.data.notes}`}
                </small>
              )}
            </div>
          )}
          {field('fin-rate', 'Annual interest rate (%)', rate, setRate, 'e.g. from your bank')}
          {field('fin-years', 'Term (years)', years, setYears)}
          {field('fin-fees', 'Optional: fees added to the loan (J$)', fees, setFees)}
          {depositShort && <p className="ke-fin-note">This lender advertises a minimum deposit of {offer?.data.minDepositPct}%.</p>}
          {termLong && <p className="ke-fin-note">This lender advertises terms up to {offer?.data.maxTermMonths} months.</p>}
        </section>
      </div>

      <section style={{ ...card, display: 'grid', gap: 14 }} aria-labelledby="fin-res" aria-live="polite">
        <h2 id="fin-res" style={h2}>Your repayments</h2>
        {!result.ok ? (
          <p style={{ ...muted, margin: 0 }}>{result.message}</p>
        ) : (
          <>
            <div className="ke-fin-tiles">
              <div><span>Monthly payment</span><strong>{money(result.value.monthlyPayment)}</strong></div>
              <div><span>Borrowed</span><strong>{money(result.value.borrowed)}</strong></div>
              <div><span>Total interest</span><strong>{money(result.value.totalInterest)}</strong></div>
              <div><span>Total repaid</span><strong>{money(result.value.totalRepaid)}</strong></div>
            </div>
            {result.value.netMonthly != null && (
              <p style={{ margin: 0, fontSize: 17, color: '#fff' }}>
                {result.value.netMonthly > 0 ? (
                  <>While you repay, it costs about <strong>{money(result.value.netMonthly)} a month more</strong> than it saves on your bill.</>
                ) : (
                  <>Your bill saving covers the payment — about <strong>{money(-result.value.netMonthly)} a month to spare</strong> while you repay.</>
                )}{' '}
                {result.value.breakEvenMonth != null ? (
                  <>Savings catch up with everything you’ve paid (deposit included) after about <strong>{fmt(result.value.breakEvenMonth / 12, 1)} years</strong>.</>
                ) : (
                  <>At this saving it doesn’t pay for itself within 25 years.</>
                )}
              </p>
            )}
            <ul style={{ ...muted, fontSize: 12.5, margin: 0, paddingLeft: 18 }}>
              {result.assumptions.map((a) => <li key={a.id}>{a.description}</li>)}
              {result.warnings.map((w) => <li key={w}>{w}</li>)}
              <li>Kingston Energies isn’t a lender and doesn’t arrange loans; lenders listed here are for comparison only.</li>
            </ul>
          </>
        )}
      </section>
    </div>
  )
}

const CSS = `
.ke-fin-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,360px),1fr));gap:16px}
.ke-fin-tiles{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:10px}
.ke-fin-tiles div{padding:14px 16px;border-radius:14px;border:1px solid var(--ke-dark-hairline);display:grid;gap:4px}
.ke-fin-tiles span{font-size:12.5px;color:var(--ke-dark-text-muted)}
.ke-fin-tiles strong{font-family:var(--font-display);font-size:22px;color:#fff;font-variant-numeric:tabular-nums}
.ke-fin-link{color:var(--ke-green-400);font-weight:600;text-decoration:none}
.ke-fin-note{margin:0;padding:10px 12px;border-radius:10px;background:rgba(255,200,87,.08);border:1px solid rgba(255,200,87,.28);font-size:13px}
`
