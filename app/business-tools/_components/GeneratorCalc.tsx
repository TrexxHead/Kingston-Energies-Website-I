'use client'

import { useMemo, useState } from 'react'
import { card, label, input, muted, h2, fmt } from '@/app/my-energy/_components/ui'
import { generatorFuel } from '@/lib/energy/engine/farm'
import { useActiveRecord } from '@/lib/refdata/useRefData'

const num = (v: string) => (v.trim() === '' ? undefined : Number(v.replace(/,/g, '')))
const digits = (v: string) => v.replace(/[^\d.,]/g, '')

/** Generator fuel use, runtime per tank and cost per hour / per kWh, from the manual's own figures. */
export default function GeneratorCalc() {
  const { record: fuel } = useActiveRecord('fuel_price', 'pump_average')
  const grades = fuel && fuel.data.basis === 'pump_average' ? fuel.data.grades : []
  const [rated, setRated] = useState('')
  const [load, setLoad] = useState('')
  const [half, setHalf] = useState('')
  const [full, setFull] = useState('')
  const [tank, setTank] = useState('')
  const [grade, setGrade] = useState('')
  const [ownPrice, setOwnPrice] = useState('')
  const gradePrice = grades.find((g) => g.grade === grade)?.pricePerLitre
  const price = num(ownPrice) ?? gradePrice

  const r = useMemo(
    () =>
      generatorFuel({
        ratedKw: num(rated) ?? 0,
        averageLoadKw: num(load) ?? 0,
        points: [
          ...(num(half) ? [{ loadFraction: 0.5, litresPerHour: num(half)! }] : []),
          ...(num(full) ? [{ loadFraction: 1, litresPerHour: num(full)! }] : []),
        ],
        tankLitres: num(tank),
        fuelPricePerL: price,
      }),
    [rated, load, half, full, tank, price],
  )
  const f = (id: string, t: string, v: string, set: (s: string) => void, hint?: string) => (
    <div>
      <label htmlFor={id} style={label}>{t}</label>
      <input id={id} style={input} inputMode="decimal" placeholder={hint} value={v} onChange={(e) => set(digits(e.target.value))} />
    </div>
  )

  return (
    <section style={{ ...card, display: 'grid', gap: 14 }} aria-labelledby="gen-title">
      <div>
        <h2 id="gen-title" style={h2}>Generator: fuel, runtime and cost</h2>
        <p style={{ ...muted, margin: '6px 0 0' }}>Use the fuel figures from your generator’s manual or spec sheet — usually litres per hour at ½ load and full load.</p>
      </div>
      <div className="ke-bt-fields">
        {f('gen-rated', 'Rated output (kW)', rated, setRated, 'e.g. 5.5')}
        {f('gen-load', 'Average load you’ll run (kW)', load, setLoad, 'e.g. 3')}
        {f('gen-half', 'Fuel at ½ load (L/h)', half, setHalf, 'From the manual')}
        {f('gen-full', 'Fuel at full load (L/h)', full, setFull, 'From the manual')}
        {f('gen-tank', 'Tank size (L)', tank, setTank, 'Optional')}
        <div>
          <label htmlFor="gen-fuel" style={label}>Fuel price (J$ per litre)</label>
          {grades.length > 0 && (
            <select id="gen-fuel" style={{ ...input, marginBottom: 6 }} value={grade} onChange={(e) => setGrade(e.target.value)}>
              <option value="">Choose a fuel…</option>
              {grades.map((g) => (
                <option key={g.grade} value={g.grade}>
                  {g.grade} — J${fmt(g.pricePerLitre, 2)} (average pump price)
                </option>
              ))}
            </select>
          )}
          <input aria-label="Your own fuel price, J$ per litre" style={input} inputMode="decimal" placeholder={grades.length ? 'Or type your price' : 'Price you pay (optional)'} value={ownPrice} onChange={(e) => setOwnPrice(digits(e.target.value))} />
        </div>
      </div>
      <div className="ke-bt-result" aria-live="polite">
        {!r.ok ? (
          <p style={{ ...muted, margin: 0 }}>{r.message}</p>
        ) : (
          <>
            <div className="ke-bt-tiles">
              <div><span>Fuel use</span><strong>{r.value.atLeast ? 'up to ' : ''}{fmt(r.value.litresPerHour, 2)} L/h</strong><small>at {Math.round(r.value.loadFraction * 100)}% of rated output</small></div>
              {r.value.hoursPerTank != null && <div><span>Runtime per tank</span><strong>{r.value.atLeast ? 'at least ' : ''}{fmt(r.value.hoursPerTank, 1)} h</strong></div>}
              {r.value.costPerHour != null && <div><span>Fuel cost</span><strong>J${fmt(r.value.costPerHour, 0)}/h</strong><small>J${fmt(r.value.costPerHour * 24, 0)} a day if run non-stop</small></div>}
              {r.value.costPerKwh != null && <div><span>Cost per kWh</span><strong>J${fmt(r.value.costPerKwh, 2)}</strong><small>fuel only — compare with your JPS bill</small></div>}
            </div>
            <ul style={{ ...muted, fontSize: 12.5, margin: 0, paddingLeft: 18 }}>
              {r.assumptions.map((a) => <li key={a.id}>{a.description}</li>)}
              {r.warnings.map((w) => <li key={w}>{w}</li>)}
              <li>Fuel only: oil, servicing and wear are not included.</li>
            </ul>
          </>
        )}
      </div>
    </section>
  )
}
