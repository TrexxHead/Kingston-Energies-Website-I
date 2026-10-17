'use client'

import { useEffect, useMemo, useState } from 'react'
import { ArrowDown, ArrowUp, Info } from 'lucide-react'
import { card, label, input, muted, h2, Btn, fmt } from '@/app/my-energy/_components/ui'
import { summariseBill, compareBills, type BillInput, type ReadingType } from '@/lib/energy/engine/bills'
import { periodCost, marginalSaving } from '@/lib/energy/engine/tariff'
import { tariffFromPublic, type PublicRecord } from '@/lib/refdata/types'

/**
 * Bill Explainer (roadmap P2). Explains a JPS bill from the numbers printed
 * on it: daily use, what each kWh really costs, and — with a previous bill —
 * how much of the change came from more days, more use, a higher price or
 * fixed charges. It never concludes that a bill or meter is wrong.
 */

interface BillForm {
  periodStart: string
  periodEnd: string
  kwh: string
  readingType: ReadingType
  currentCharges: string
  fixedCharges: string
  arrears: string
  credits: string
}

const EMPTY: BillForm = { periodStart: '', periodEnd: '', kwh: '', readingType: 'actual', currentCharges: '', fixedCharges: '', arrears: '', credits: '' }
const STORE = 'ke-bill-explainer-v1'
const n = (v: string) => (v.trim() === '' ? undefined : Number(v.replace(/,/g, '')))
const money = (v: number) => `J$${fmt(Math.abs(v), 0)}`
const signed = (v: number) => `${v >= 0 ? '+' : '−'}${money(v)}`

function toInput(f: BillForm): BillInput {
  return {
    periodStart: f.periodStart,
    periodEnd: f.periodEnd,
    kwh: n(f.kwh) ?? NaN,
    readingType: f.readingType,
    currentCharges: n(f.currentCharges) ?? NaN,
    fixedCharges: n(f.fixedCharges),
    arrears: n(f.arrears),
    credits: n(f.credits),
  }
}
const filled = (f: BillForm) => !!(f.periodStart && f.periodEnd && f.kwh && f.currentCharges)

function BillFields({ id, f, set }: { id: string; f: BillForm; set: (f: BillForm) => void }) {
  const field = (k: keyof BillForm, text: string, opts: { type?: string; hint?: string } = {}) => (
    <div>
      <label htmlFor={`${id}-${k}`} style={label}>{text}</label>
      <input
        id={`${id}-${k}`}
        style={input}
        type={opts.type ?? 'text'}
        inputMode={opts.type ? undefined : 'decimal'}
        placeholder={opts.hint}
        value={f[k]}
        onChange={(e) => set({ ...f, [k]: opts.type ? e.target.value : e.target.value.replace(/[^\d.,]/g, '') })}
      />
    </div>
  )
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 10 }}>
      {field('periodStart', 'Period from', { type: 'date' })}
      {field('periodEnd', 'Period to', { type: 'date' })}
      {field('kwh', 'kWh used', { hint: 'e.g. 312' })}
      <div>
        <label htmlFor={`${id}-reading`} style={label}>Meter reading</label>
        <select id={`${id}-reading`} style={input} value={f.readingType} onChange={(e) => set({ ...f, readingType: e.target.value as ReadingType })}>
          <option value="actual">Actual (A)</option>
          <option value="estimated">Estimated (E)</option>
          <option value="unknown">Not sure</option>
        </select>
      </div>
      {field('currentCharges', 'Current charges J$', { hint: 'this period only' })}
      {field('fixedCharges', 'Customer charge J$', { hint: 'optional' })}
      {field('arrears', 'Balance brought forward J$', { hint: 'optional' })}
      {field('credits', 'Payments / credits J$', { hint: 'optional' })}
    </div>
  )
}

export default function BillExplainer() {
  const [current, setCurrent] = useState<BillForm>(EMPTY)
  const [previous, setPrevious] = useState<BillForm>(EMPTY)
  const [showPrev, setShowPrev] = useState(false)
  // Every approved tariff in effect (residential, commercial…) — residential first by default.
  const [tariffs, setTariffs] = useState<PublicRecord<'tariff'>[] | undefined>(undefined)
  const [tariffId, setTariffId] = useState('')
  useEffect(() => {
    fetch('/api/refdata?kind=tariff&all=1')
      .then((r) => (r.ok ? r.json() : { records: [] }))
      .then((d) => {
        const list: PublicRecord<'tariff'>[] = d.records ?? []
        setTariffs(list)
        const res = list.find((t) => /residential/i.test(`${t.name} ${t.data.customerClass}`)) ?? list[0]
        if (res) setTariffId(res.id)
      })
      .catch(() => setTariffs([]))
  }, [])
  const tariffRecord = tariffs === undefined ? undefined : (tariffs.find((t) => t.id === tariffId) ?? null)
  const tariff = tariffRecord ? tariffFromPublic(tariffRecord) : null

  // Remember the last bills on this device only (nothing is sent to us).
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORE) ?? 'null')
      if (saved?.current) setCurrent({ ...EMPTY, ...saved.current })
      if (saved?.previous) {
        setPrevious({ ...EMPTY, ...saved.previous })
        if (filled({ ...EMPTY, ...saved.previous })) setShowPrev(true)
      }
    } catch {
      /* storage unavailable */
    }
  }, [])
  useEffect(() => {
    try {
      localStorage.setItem(STORE, JSON.stringify({ current, previous }))
    } catch {
      /* storage unavailable */
    }
  }, [current, previous])

  const summary = useMemo(() => (filled(current) ? summariseBill(toInput(current)) : null), [current])
  const comparison = useMemo(() => (showPrev && filled(current) && filled(previous) ? compareBills(toInput(previous), toInput(current)) : null), [showPrev, current, previous])
  const onDate = current.periodEnd || new Date().toISOString().slice(0, 10)
  const priced = useMemo(() => (tariff && summary?.ok ? periodCost(tariff, summary.value.kwh, onDate) : null), [tariff, summary, onDate])
  const lastKwh = useMemo(() => (tariff && summary?.ok && summary.value.kwh > 0 ? marginalSaving(tariff, summary.value.kwh, Math.min(50, summary.value.kwh), onDate) : null), [tariff, summary, onDate])

  const effects = comparison?.ok
    ? [
        { key: 'period', label: 'Billing period length', value: comparison.value.effects.period, explain: `${comparison.value.current.days} days this bill vs ${comparison.value.previous.days} last time` },
        { key: 'consumption', label: 'How much you used', value: comparison.value.effects.consumption, explain: `${fmt(comparison.value.current.kwhPerDay, 1)} kWh a day vs ${fmt(comparison.value.previous.kwhPerDay, 1)}` },
        { key: 'price', label: 'Price per kWh', value: comparison.value.effects.price, explain: comparison.value.current.averageVariablePrice != null && comparison.value.previous.averageVariablePrice != null ? `J$${fmt(comparison.value.current.averageVariablePrice, 2)} vs J$${fmt(comparison.value.previous.averageVariablePrice, 2)} per kWh (energy, fuel and other per-kWh charges)` : '' },
        { key: 'fixed', label: 'Fixed charges', value: comparison.value.effects.fixed, explain: 'Customer charge' },
      ]
    : []
  const maxEffect = Math.max(1, ...effects.map((e) => Math.abs(e.value)))

  return (
    <div style={{ display: 'grid', gap: 20 }}>
      <style>{CSS}</style>
      <section style={{ ...card, display: 'grid', gap: 14 }} aria-labelledby="cur-title">
        <div>
          <h2 id="cur-title" style={h2}>Your latest bill</h2>
          <p style={{ ...muted, margin: '4px 0 0' }}>Copy the numbers from your JPS bill. “Current charges” means this period’s charges only — not any balance carried over.</p>
        </div>
        <BillFields id="cur" f={current} set={setCurrent} />
        {!showPrev ? (
          <div>
            <Btn variant="ghost" onClick={() => setShowPrev(true)}>Compare with my previous bill</Btn>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 10, borderTop: '1px solid var(--ke-dark-hairline)', paddingTop: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              <h3 style={{ ...h2, fontSize: 17 }}>Previous bill</h3>
              <Btn variant="ghost" onClick={() => (setShowPrev(false), setPrevious(EMPTY))}>Remove</Btn>
            </div>
            <BillFields id="prev" f={previous} set={setPrevious} />
          </div>
        )}
        <p style={{ ...muted, fontSize: 12.5, margin: 0 }}>Your bill numbers stay on this device — nothing is sent to Kingston Energies.</p>
      </section>

      {summary && !summary.ok && <p role="alert" style={{ ...card, ...muted, margin: 0 }}>{summary.message}</p>}

      {summary?.ok && (
        <section style={{ ...card, display: 'grid', gap: 14 }} aria-labelledby="sum-title" aria-live="polite">
          <h2 id="sum-title" style={h2}>What this bill says</h2>
          <div className="ke-tiles">
            <div>
              <span>{fmt(summary.value.kwhPerDay, 1)}<em> kWh</em></span>
              <small>a day, over {summary.value.days} days</small>
            </div>
            <div>
              <span>{summary.value.averageVariablePrice != null ? <>J${fmt(summary.value.averageVariablePrice, 2)}</> : '—'}</span>
              <small>average per kWh{summary.value.fixedKnown ? ' (excluding customer charge)' : ''}</small>
            </div>
            <div>
              <span>{money(summary.value.amountDue)}</span>
              <small>amount due{(n(current.arrears) ?? 0) > 0 ? ' — includes an earlier balance' : ''}</small>
            </div>
          </div>
          {current.readingType !== 'actual' && (
            <p className="ke-note">
              <Info size={15} aria-hidden /> This bill uses an <strong>estimated</strong> reading. The next actual reading may correct it up or down — a big swing after an estimate is usually a catch-up, not new usage.
            </p>
          )}
          {(n(current.arrears) ?? 0) > 0 && (
            <p className="ke-note">
              <Info size={15} aria-hidden /> J${fmt(n(current.arrears) ?? 0, 0)} of the amount due is a balance from before this period. It raises what you owe but isn’t electricity you used this month.
            </p>
          )}

          {tariffRecord === undefined ? null : !tariff ? (
            <p style={{ ...muted, margin: 0 }}>Once the current JPS tariff is entered and approved by our team, this page will also show what each extra kWh really costs you and how this bill lines up with the published rates.</p>
          ) : (
            <div style={{ display: 'grid', gap: 10 }}>
              {(tariffs?.length ?? 0) > 1 && (
                <div style={{ maxWidth: 360 }}>
                  <label htmlFor="be-tariff" style={label}>Your rate (on your bill)</label>
                  <select id="be-tariff" style={input} value={tariffId} onChange={(e) => setTariffId(e.target.value)}>
                    {tariffs!.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.data.customerClass}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              {lastKwh?.ok && (
                <p style={{ ...muted, margin: 0 }}>
                  <strong style={{ color: '#fff' }}>Each kWh you cut saves about J${fmt(lastKwh.value.perKwh, 2)}</strong> at this level of use — {summary.value.averageVariablePrice != null && lastKwh.value.perKwh > summary.value.averageVariablePrice ? 'more than' : 'different from'} the J${fmt(summary.value.averageVariablePrice ?? 0, 2)} average, because the last kWh on a bill is charged at the highest block and fixed charges don’t fall.
                </p>
              )}
              {priced?.ok && (
                <details>
                  <summary style={{ cursor: 'pointer', color: 'var(--ke-green-400)', fontWeight: 600, fontSize: 14 }}>Compare with the published tariff</summary>
                  <table className="ke-table">
                    <tbody>
                      {priced.value.lines.map((l) => (
                        <tr key={l.label}>
                          <td>{l.label}</td>
                          <td>{money(l.amount)}</td>
                        </tr>
                      ))}
                      <tr className="is-total">
                        <td>Published-tariff total for {fmt(summary.value.kwh, 0)} kWh</td>
                        <td>{money(priced.value.total)}</td>
                      </tr>
                      <tr>
                        <td>Current charges on your bill</td>
                        <td>{money(n(current.currentCharges) ?? 0)}</td>
                      </tr>
                    </tbody>
                  </table>
                  <p style={{ ...muted, fontSize: 12.5, margin: '8px 0 0' }}>
                    Priced with {priced.assumptions[0]?.description.replace(/^Priced with /, '')} A difference is normal — fuel and IPP charges change monthly, and foreign-exchange adjustments, GCT thresholds or part-month rate changes may apply. This comparison doesn’t mean your bill is wrong; contact JPS if something looks off.
                  </p>
                </details>
              )}
            </div>
          )}
        </section>
      )}

      {comparison && !comparison.ok && <p role="alert" style={{ ...card, ...muted, margin: 0 }}>{comparison.message}</p>}

      {comparison?.ok && (
        <section style={{ ...card, display: 'grid', gap: 14 }} aria-labelledby="chg-title" aria-live="polite">
          <div>
            <h2 id="chg-title" style={h2}>
              Why it {comparison.value.currentChargesChange >= 0 ? 'went up' : 'went down'} by {money(comparison.value.currentChargesChange)}
            </h2>
            <p style={{ ...muted, margin: '4px 0 0' }}>
              Current charges, previous bill → this bill. The four parts below add up exactly to the change.
              {comparison.value.kwhPerDayChangePct != null && ` Your daily use ${comparison.value.kwhPerDayChangePct >= 0 ? 'rose' : 'fell'} ${fmt(Math.abs(comparison.value.kwhPerDayChangePct), 0)}%.`}
            </p>
          </div>
          <ul className="ke-effects" aria-label="What changed">
            {effects.map((e) => (
              <li key={e.key}>
                <div className="ke-effects__head">
                  <span>{e.label}</span>
                  <strong className={e.value >= 0 ? 'is-up' : 'is-down'}>
                    {e.value >= 0 ? <ArrowUp size={14} aria-hidden /> : <ArrowDown size={14} aria-hidden />} {signed(e.value)}
                  </strong>
                </div>
                <div className="ke-effects__track" aria-hidden>
                  <i className={e.value >= 0 ? 'is-up' : 'is-down'} style={{ width: `${(Math.abs(e.value) / maxEffect) * 50}%`, [e.value >= 0 ? 'left' : 'right']: '50%' } as React.CSSProperties} />
                </div>
                {e.explain && <small>{e.explain}</small>}
              </li>
            ))}
          </ul>
          {comparison.value.flags.map((f) => (
            <p key={f} className="ke-note">
              <Info size={15} aria-hidden /> {f}
            </p>
          ))}
        </section>
      )}
    </div>
  )
}

const CSS = `
.ke-tiles{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:10px}
.ke-tiles div{display:grid;gap:3px;padding:14px;border-radius:14px;background:rgba(255,255,255,.04);border:1px solid var(--ke-dark-hairline)}
.ke-tiles span{font-family:var(--font-display);font-weight:800;font-size:24px;color:#fff;letter-spacing:-.02em;white-space:nowrap}
.ke-tiles em{font-style:normal;font-size:13px;font-weight:600;color:var(--ke-dark-text-muted)}
.ke-tiles small{color:var(--ke-dark-text-muted);font-size:12.5px}
.ke-note{display:flex;gap:8px;align-items:flex-start;margin:0;padding:10px 12px;border-radius:12px;background:rgba(107,184,219,.08);border:1px solid rgba(107,184,219,.25);color:var(--ke-dark-text);font-size:13.5px;line-height:1.5}
.ke-note svg{flex:none;margin-top:2px;color:var(--ke-blue-300)}
.ke-table{width:100%;border-collapse:collapse;margin-top:10px;font-size:13.5px}
.ke-table td{padding:7px 0;border-bottom:1px solid var(--ke-dark-hairline);color:var(--ke-dark-text)}
.ke-table td:last-child{text-align:right;font-variant-numeric:tabular-nums}
.ke-table tr.is-total td{font-weight:700;color:#fff}
.ke-effects{list-style:none;margin:0;padding:0;display:grid;gap:14px}
.ke-effects li{display:grid;gap:6px}
.ke-effects__head{display:flex;justify-content:space-between;gap:10px;font-size:14px;color:var(--ke-dark-text)}
.ke-effects__head strong{display:inline-flex;align-items:center;gap:4px;font-variant-numeric:tabular-nums;color:#fff}
.ke-effects__head strong.is-up svg{color:var(--ke-sun-300)}
.ke-effects__head strong.is-down svg{color:var(--ke-green-400)}
.ke-effects__track{position:relative;height:10px;border-radius:999px;background:rgba(255,255,255,.05)}
.ke-effects__track::after{content:"";position:absolute;left:50%;top:-3px;bottom:-3px;width:1px;background:rgba(255,255,255,.3)}
.ke-effects__track i{position:absolute;top:0;bottom:0;border-radius:4px}
.ke-effects__track i.is-up{background:var(--ke-sun-300)}
.ke-effects__track i.is-down{background:var(--ke-green-400)}
.ke-effects small{color:var(--ke-dark-text-muted);font-size:12.5px}
`
