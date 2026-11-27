'use client'

import { useEffect, useMemo, useState } from 'react'
import { card, label, input, muted, h2, fmt } from '@/app/my-energy/_components/ui'
import { solarPumpSize } from '@/lib/energy/engine/farm'
import { PARISHES } from '@/lib/map/parishes'

const num = (v: string) => (v.trim() === '' ? undefined : Number(v.replace(/,/g, '')))
const digits = (v: string) => v.replace(/[^\d.,]/g, '')
const MONTH = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

/** Solar water-pump sizing with PVGIS sunshine for the farm's parish (worst month). */
export default function PumpCalc() {
  const [parish, setParish] = useState('st-catherine')
  const [water, setWater] = useState('')
  const [head, setHead] = useState('')
  const [eff, setEff] = useState('')
  const [solar, setSolar] = useState<{ monthly: number[]; attribution: string } | { error: string } | null>(null)

  useEffect(() => {
    const c = PARISHES.find((p) => p.id === parish)?.center
    if (!c) return
    setSolar(null)
    // 1 kWp facing south at 15° — a typical ground or roof mount for a pump array.
    fetch(`/api/solar/yield?lat=${c.lat}&lng=${c.lng}&tilt=15&aspect=0`)
      .then(async (r) => {
        const d = await r.json().catch(() => ({}))
        if (!r.ok) throw new Error(d.error ?? 'Solar data is unavailable right now.')
        setSolar({ monthly: d.yield.monthly, attribution: d.attribution })
      })
      .catch((e: Error) => setSolar({ error: e.message }))
  }, [parish])

  const r = useMemo(() => {
    if (!solar || 'error' in solar) return null
    return solarPumpSize({ dailyWaterM3: (num(water) ?? 0) / 1000, totalHeadM: num(head) ?? 0, pumpEfficiency: num(eff) != null ? num(eff)! / 100 : undefined, monthlyKwhPerKwp: solar.monthly })
  }, [solar, water, head, eff])

  return (
    <section style={{ ...card, display: 'grid', gap: 14 }} aria-labelledby="pump-title">
      <div>
        <h2 id="pump-title" style={h2}>Solar water pump: how many panels?</h2>
        <p style={{ ...muted, margin: '6px 0 0' }}>For irrigation, livestock or a tank. Sized for the least sunny month in your parish, using EU PVGIS solar data.</p>
      </div>
      <div className="ke-bt-fields">
        <div>
          <label htmlFor="pump-parish" style={label}>Parish</label>
          <select id="pump-parish" style={input} value={parish} onChange={(e) => setParish(e.target.value)}>
            {PARISHES.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="pump-water" style={label}>Water needed a day (litres)</label>
          <input id="pump-water" style={input} inputMode="decimal" placeholder="e.g. 5,000" value={water} onChange={(e) => setWater(digits(e.target.value))} />
        </div>
        <div>
          <label htmlFor="pump-head" style={label}>Total head (m)</label>
          <input id="pump-head" style={input} inputMode="decimal" placeholder="Lift + pipe friction" value={head} onChange={(e) => setHead(digits(e.target.value))} />
        </div>
        <div>
          <label htmlFor="pump-eff" style={label}>Pump efficiency (%)</label>
          <input id="pump-eff" style={input} inputMode="decimal" placeholder="From the datasheet (optional)" value={eff} onChange={(e) => setEff(digits(e.target.value))} />
        </div>
      </div>
      <div className="ke-bt-result" aria-live="polite">
        {!solar ? (
          <p style={{ ...muted, margin: 0 }}>Getting solar data for the parish…</p>
        ) : 'error' in solar ? (
          <p style={{ ...muted, margin: 0 }}>{solar.error} We can’t size the array without it.</p>
        ) : r && !r.ok ? (
          <p style={{ ...muted, margin: 0 }}>{r.message}</p>
        ) : r?.ok ? (
          <>
            <div className="ke-bt-tiles">
              <div><span>Solar array</span><strong>{fmt(r.value.pvKwp.low, 2)}–{fmt(r.value.pvKwp.high, 2)} kW</strong><small>{Math.round(r.value.pvKwp.base * 1000)} W most likely</small></div>
              <div><span>Pump energy</span><strong>{fmt(r.value.electricalKwhPerDay.base, 2)} kWh/day</strong><small>{fmt(r.value.hydraulicKwhPerDay, 2)} kWh lifting the water</small></div>
              <div><span>Least sunny month</span><strong>{MONTH[r.value.worstMonth]}</strong><small>{fmt(r.value.worstDailyKwhPerKwp, 2)} kWh per kW of panels a day</small></div>
            </div>
            <ul style={{ ...muted, fontSize: 12.5, margin: 0, paddingLeft: 18 }}>
              {r.assumptions.map((a) => <li key={a.id}>{a.description}{a.value != null && <> ({a.value})</>}</li>)}
              {r.warnings.map((w) => <li key={w}>{w}</li>)}
              <li>{solar.attribution}</li>
            </ul>
          </>
        ) : null}
      </div>
    </section>
  )
}
