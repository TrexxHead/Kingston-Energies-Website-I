'use client'

import { useEffect, useMemo, useState } from 'react'
import { card, label, input, muted, h2, fmt } from '@/app/my-energy/_components/ui'
import { evCostComparison } from '@/lib/energy/engine/ev'
import { useActiveRecord } from '@/lib/refdata/useRefData'
import { tariffFromPublic, type PublicRecord } from '@/lib/refdata/types'
import { EveningWhy } from '@/components/energy/ChargePrice'
import { periodText } from '@/lib/refdata/chargingPrice'

/**
 * EV vs petrol energy-cost calculator (roadmap P3). Prices come from
 * approved reference data (Petrojam-based pump prices, JPS tariff, operator
 * charging prices) when staff have entered them; otherwise the visitor
 * types their own, and the result says whose figure it used.
 */

const num = (v: string) => (v.trim() === '' ? undefined : Number(v.replace(/,/g, '')))
const money = (v: number) => `J$${fmt(Math.round(v), 0)}`

export default function EvCostCalculator() {
  // Only pump prices are what drivers pay — a newer ex-refinery notice must not displace them.
  const { record: fuel } = useActiveRecord('fuel_price', 'pump_average')
  const { record: tariffRec } = useActiveRecord('tariff', 'residential')
  const [chargingPrices, setChargingPrices] = useState<PublicRecord<'charging_price'>[]>([])
  useEffect(() => {
    fetch('/api/refdata?kind=charging_price&all=1')
      .then((r) => (r.ok ? r.json() : { records: [] }))
      .then((d) => setChargingPrices(d.records ?? []))
      .catch(() => setChargingPrices([]))
  }, [])

  const pumpGrades = fuel && fuel.data.basis === 'pump_average' ? fuel.data.grades : []
  const [kmPerWeek, setKmPerWeek] = useState('300')
  const [lPer100, setLPer100] = useState('')
  const [grade, setGrade] = useState('')
  const [ownPetrol, setOwnPetrol] = useState('')
  const [kwhPer100, setKwhPer100] = useState('')
  const [homePct, setHomePct] = useState('80')
  const [household, setHousehold] = useState('')
  const [homePrice, setHomePrice] = useState('')
  const [publicOp, setPublicOp] = useState('')
  const [ownPublic, setOwnPublic] = useState('')
  const [premium, setPremium] = useState('')
  const [when, setWhen] = useState('std')

  const selectedGrade = pumpGrades.find((g) => g.grade === grade) ?? pumpGrades[0]
  const petrolPrice = num(ownPetrol) ?? selectedGrade?.pricePerLitre
  const op = chargingPrices.find((c) => c.id === publicOp)
  // Operators with time-of-day prices: the visitor picks when they usually charge.
  const times = op
    ? [
        ...(op.data.pricePerKwh != null ? [{ key: 'std', label: op.data.periods?.length ? 'Standard hours' : 'Any time', price: op.data.pricePerKwh }] : []),
        ...(op.data.periods ?? []).map((b, i) => ({ key: `b${i}`, label: periodText(b), price: b.pricePerKwh })),
      ]
    : []
  const timeChoice = times.find((t) => t.key === when) ?? times[0]
  const publicPrice = num(ownPublic) ?? timeChoice?.price ?? undefined
  const tariff = tariffRec ? tariffFromPublic(tariffRec) : undefined

  const result = useMemo(
    () =>
      evCostComparison({
        kmPerYear: (num(kmPerWeek) ?? 0) * 52,
        petrolLPer100km: num(lPer100) ?? 0,
        petrolPricePerL: petrolPrice ?? 0,
        evKwhPer100km: num(kwhPer100) ?? 0,
        homeShare: Math.min(100, Math.max(0, num(homePct) ?? 0)) / 100,
        householdMonthlyKwh: tariff && household.trim() ? num(household) : undefined,
        tariff: household.trim() ? tariff : undefined,
        homePricePerKwh: num(homePrice),
        publicPricePerKwh: publicPrice,
        purchasePremium: num(premium),
        onDate: new Date().toISOString().slice(0, 10),
      }),
    [kmPerWeek, lPer100, petrolPrice, kwhPer100, homePct, household, tariff, homePrice, publicPrice, premium],
  )
  const homeShare = num(homePct) ?? 0

  const field = (id: string, text: string, value: string, set: (v: string) => void, hint?: string) => (
    <div>
      <label htmlFor={id} style={label}>{text}</label>
      <input id={id} style={input} inputMode="decimal" placeholder={hint} value={value} onChange={(e) => set(e.target.value.replace(/[^\d.,]/g, ''))} />
    </div>
  )
  const max = result.ok ? Math.max(result.value.petrolPerYear, result.value.evPerYear, 1) : 1

  return (
    <div style={{ display: 'grid', gap: 20 }}>
      <style>{CSS}</style>
      <div className="ke-ev-grid">
        <section style={{ ...card, display: 'grid', gap: 12, alignContent: 'start' }} aria-labelledby="drive-title">
          <h2 id="drive-title" style={h2}>Your driving</h2>
          {field('ev-km', 'Kilometres a week', kmPerWeek, setKmPerWeek, 'e.g. 300')}
          {field('ev-l', 'Petrol car: litres per 100 km', lPer100, setLPer100, 'e.g. 7–10 for a car, 10–14 for an SUV')}
          <div>
            <label htmlFor="ev-grade" style={label}>Petrol price (J$ per litre)</label>
            {pumpGrades.length > 0 && (
              <select id="ev-grade" style={{ ...input, marginBottom: 8 }} value={selectedGrade?.grade ?? ''} onChange={(e) => setGrade(e.target.value)}>
                {pumpGrades.map((g) => (
                  <option key={g.grade} value={g.grade}>
                    {g.grade} — J${fmt(g.pricePerLitre, 2)} (average pump price)
                  </option>
                ))}
              </select>
            )}
            <input aria-label="Your own pump price, J$ per litre" style={input} inputMode="decimal" placeholder={pumpGrades.length ? 'Or type the price you pay' : 'Price you pay at the pump'} value={ownPetrol} onChange={(e) => setOwnPetrol(e.target.value.replace(/[^\d.,]/g, ''))} />
            {fuel && pumpGrades.length > 0 && <small style={{ ...muted, fontSize: 12 }}>{fuel.name} — {fuel.source.title}, read {fuel.source.retrievedAt}.</small>}
          </div>
        </section>

        <section style={{ ...card, display: 'grid', gap: 12, alignContent: 'start' }} aria-labelledby="evc-title">
          <h2 id="evc-title" style={h2}>The EV</h2>
          {field('ev-kwh', 'EV energy use: kWh per 100 km', kwhPer100, setKwhPer100, 'e.g. 14–18 small car, 18–24 SUV')}
          {field('ev-home', 'Charged at home (%)', homePct, setHomePct)}
          {homeShare > 0 && (
            <>
              {tariff ? (
                field('ev-house', 'Your home’s use without the EV (kWh / month)', household, setHousehold, 'From your JPS bill')
              ) : null}
              {(!tariff || !household.trim()) && field('ev-hprice', 'Or your home price (J$ per kWh)', homePrice, setHomePrice, tariff ? 'Optional if you entered your kWh' : 'Your bill total ÷ kWh')}
            </>
          )}
          {homeShare < 100 && (
            <div>
              <label htmlFor="ev-op" style={label}>Public charging price (J$ per kWh)</label>
              {chargingPrices.filter(hasKwhPrice).length > 0 && (
                <select id="ev-op" style={{ ...input, marginBottom: 8 }} value={publicOp} onChange={(e) => { setPublicOp(e.target.value); setWhen('std') }}>
                  <option value="">Choose an operator…</option>
                  {chargingPrices.filter(hasKwhPrice).map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.data.operator} — {c.data.pricePerKwh != null ? `J$${fmt(c.data.pricePerKwh, 2)}/kWh` : 'time-of-day prices'}
                      {c.data.periods?.length ? ' (varies by time)' : ''}
                    </option>
                  ))}
                </select>
              )}
              {op && times.length > 1 && !ownPublic.trim() && (
                <>
                  <label htmlFor="ev-when" style={label}>When do you usually charge in public?</label>
                  <select id="ev-when" style={{ ...input, marginBottom: 8 }} value={timeChoice?.key} onChange={(e) => setWhen(e.target.value)}>
                    {times.map((t) => (
                      <option key={t.key} value={t.key}>
                        {t.label} — J${fmt(t.price, 2)}/kWh
                      </option>
                    ))}
                  </select>
                </>
              )}
              {op && !ownPublic.trim() && (op.data.sessionFee || op.data.idleFeePerMin) ? (
                <p style={{ ...muted, fontSize: 12.5, margin: '0 0 8px' }}>
                  {op.data.operator} also charges {[op.data.sessionFee ? `J$${fmt(op.data.sessionFee, 0)} per session` : null, op.data.idleFeePerMin ? `J$${fmt(op.data.idleFeePerMin, 2)} a minute if you stay plugged in after charging${op.data.idleGraceMin ? ` (after ${op.data.idleGraceMin} free minutes)` : ''}` : null].filter(Boolean).join(' and ')} — not included in the yearly figure below.
                </p>
              ) : null}
              {op?.data.periods?.length ? <EveningWhy calculatorLink={false} /> : null}
              <input aria-label="Your own public charging price, J$ per kWh" style={input} inputMode="decimal" placeholder="Or type a price" value={ownPublic} onChange={(e) => setOwnPublic(e.target.value.replace(/[^\d.,]/g, ''))} />
            </div>
          )}
          {field('ev-prem', 'Optional: how much more the EV costs to buy (J$)', premium, setPremium)}
        </section>
      </div>

      <section style={{ ...card, display: 'grid', gap: 14 }} aria-labelledby="evr-title" aria-live="polite">
        <h2 id="evr-title" style={h2}>A year of driving</h2>
        {!result.ok ? (
          <p style={{ ...muted, margin: 0 }}>{result.message}</p>
        ) : (
          <>
            <div className="ke-ev-bars" role="img" aria-label={`Petrol ${money(result.value.petrolPerYear)} a year; EV ${money(result.value.evPerYear)} a year`}>
              {[
                { k: 'Petrol', v: result.value.petrolPerYear, per: result.value.petrolPerKm, cls: 'is-petrol' },
                { k: 'Electric', v: result.value.evPerYear, per: result.value.evPerKm, cls: 'is-ev' },
              ].map((b) => (
                <div key={b.k} className="ke-ev-bar">
                  <span className="ke-ev-bar__label">{b.k}</span>
                  <span className="ke-ev-bar__track">
                    <i className={b.cls} style={{ width: `${(b.v / max) * 100}%` }} />
                  </span>
                  <span className="ke-ev-bar__value">
                    {money(b.v)} <small>· J${fmt(b.per, 2)}/km</small>
                  </span>
                </div>
              ))}
            </div>
            <p style={{ margin: 0, fontSize: 17, color: '#fff' }}>
              {result.value.savingPerYear >= 0 ? (
                <>
                  An EV would cost about <strong>{money(result.value.savingPerYear)} less a year</strong> in energy
                  {result.value.paybackYears != null && <> — a {money(num(premium) ?? 0)} higher price is earned back in about <strong>{fmt(result.value.paybackYears, 1)} years</strong> of energy savings</>}.
                </>
              ) : (
                <>With these figures, the EV would cost about <strong>{money(-result.value.savingPerYear)} more a year</strong> in energy.</>
              )}
            </p>
            <ul style={{ ...muted, fontSize: 12.5, margin: 0, paddingLeft: 18 }}>
              <li>
                {fmt(result.value.homeKwhPerYear + result.value.publicKwhPerYear, 0)} kWh a year from the grid
                {result.value.homeKwhPerYear > 0 && <> — home charging works out at J${fmt(result.value.homePricePerKwh, 2)} per kWh</>}.
              </li>
              {result.assumptions.map((a) => (
                <li key={a.id}>{a.description}</li>
              ))}
              {result.warnings.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          </>
        )}
      </section>
    </div>
  )
}

const CSS = `
.ke-ev-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,360px),1fr));gap:16px}
.ke-ev-bars{display:grid;gap:12px}
.ke-ev-bar{display:grid;grid-template-columns:80px 1fr auto;gap:12px;align-items:center}
.ke-ev-bar__label{font-weight:600;color:var(--ke-dark-text);font-size:14px}
.ke-ev-bar__track{height:22px;border-radius:6px;background:rgba(255,255,255,.04);overflow:hidden}
.ke-ev-bar__track i{display:block;height:100%;border-radius:0 4px 4px 0}
.ke-ev-bar__track i.is-petrol{background:var(--ke-sun-300)}
.ke-ev-bar__track i.is-ev{background:var(--ke-green-400)}
.ke-ev-bar__value{font-variant-numeric:tabular-nums;color:#fff;font-weight:700;font-size:15px;white-space:nowrap}
.ke-ev-bar__value small{font-weight:500;color:var(--ke-dark-text-muted);font-size:12.5px}
@media (max-width:600px){.ke-ev-bar{grid-template-columns:64px 1fr}.ke-ev-bar__value{grid-column:2}}
`

const hasKwhPrice = (c: PublicRecord<'charging_price'>) => c.data.pricePerKwh != null || !!c.data.periods?.length
