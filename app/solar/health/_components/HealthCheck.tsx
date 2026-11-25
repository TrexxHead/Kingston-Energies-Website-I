'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { CircleCheck, TriangleAlert, CircleX, CloudLightning, CalendarClock } from 'lucide-react'
import { card, label, input, muted, h2, fmt } from '@/app/my-energy/_components/ui'
import { performanceRatio } from '@/lib/energy/engine/systemDesign'

/**
 * Performance ratio check (engine 1.9.0, notebook §15.4): kWh produced ÷
 * (kWp × peak sun hours). About 0.75 is healthy; a zero-export system with a
 * full battery throttles its panels, which reads as "low" but is normal.
 */
export default function HealthCheck() {
  const [kwp, setKwp] = useState('')
  const [kwh, setKwh] = useState('')
  const [period, setPeriod] = useState<'day' | 'month'>('day')
  const [days, setDays] = useState('30')
  const [psh, setPsh] = useState('5')
  const [batteryFull, setBatteryFull] = useState(false)
  const num = (s: string) => (s.trim() ? Number(s.replace(/,/g, '')) : NaN)

  const r = useMemo(() => {
    if (!kwp.trim() || !kwh.trim()) return null
    return performanceRatio({ kwhProduced: num(kwh), kwp: num(kwp), peakSunHours: num(psh), days: period === 'day' ? 1 : num(days) })
  }, [kwp, kwh, psh, period, days])

  const v = r?.ok ? r.value : null
  const curtailed = !!v && batteryFull && (v.status === 'low' || v.status === 'very_low')
  const tone = !v ? null : curtailed ? 'note' : v.status === 'healthy' ? 'good' : v.status === 'high' ? 'note' : v.status === 'low' ? 'warn' : 'bad'
  const Icon = tone === 'good' ? CircleCheck : tone === 'bad' ? CircleX : TriangleAlert

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <style>{CSS}</style>
      <section style={card} aria-labelledby="hc-in">
        <h2 id="hc-in" style={h2}>Your numbers</h2>
        <div className="ke-hc-grid">
          <div>
            <label htmlFor="hc-kwp" style={label}>System size (kWp)</label>
            <input id="hc-kwp" style={input} inputMode="decimal" value={kwp} onChange={(e) => setKwp(e.target.value)} placeholder="e.g. 3.3 — on your design or the app" />
          </div>
          <div>
            <label htmlFor="hc-period" style={label}>Period</label>
            <select id="hc-period" style={input} value={period} onChange={(e) => setPeriod(e.target.value as 'day' | 'month')}>
              <option value="day">One day</option>
              <option value="month">Several days (e.g. a month)</option>
            </select>
          </div>
          <div>
            <label htmlFor="hc-kwh" style={label}>kWh the panels made</label>
            <input id="hc-kwh" style={input} inputMode="decimal" value={kwh} onChange={(e) => setKwh(e.target.value)} placeholder="“PV” or “solar” in the app" />
          </div>
          {period === 'month' ? (
            <div>
              <label htmlFor="hc-days" style={label}>Number of days</label>
              <input id="hc-days" style={input} inputMode="numeric" value={days} onChange={(e) => setDays(e.target.value)} />
            </div>
          ) : (
            <div />
          )}
          <div>
            <label htmlFor="hc-psh" style={label}>Peak sun hours {period === 'day' ? 'that day' : 'a day'}</label>
            <input id="hc-psh" style={input} inputMode="decimal" value={psh} onChange={(e) => setPsh(e.target.value)} />
            <p style={{ ...muted, fontSize: 12.5, margin: '6px 0 0' }}>About 5–6 on a clear day in Jamaica, 2–3 when it’s overcast. A weather service’s “solar radiation” in kWh/m² is the same number.</p>
          </div>
        </div>
        <label className="ke-hc-check">
          <input type="checkbox" checked={batteryFull} onChange={(e) => setBatteryFull(e.target.checked)} /> My battery was full by early afternoon (and my system doesn’t sell to JPS)
        </label>
      </section>

      {r && !r.ok && <p role="alert" style={{ ...muted, color: '#f6a5a5', margin: 0 }}>{r.message}</p>}
      {v && (
        <section className={`ke-hc-result ke-hc-${tone}`} aria-live="polite">
          <Icon size={22} aria-hidden />
          <div>
            <strong>
              Performance ratio {v.pr.toFixed(2)} — {curtailed ? 'normal for a full battery' : v.status === 'healthy' ? 'healthy' : v.status === 'high' ? 'unusually high' : v.status === 'low' ? 'a little low' : 'low'}
            </strong>
            <p>
              On {fmt(num(psh) * (period === 'day' ? 1 : num(days)), 1)} sun-hours a {fmt(num(kwp), 2)} kWp system should make about <b>{fmt(v.expectedKwh, 1)} kWh</b> (a ratio near 0.75). It made {fmt(num(kwh), 1)} kWh.
              {curtailed && ' When the battery is full and the house is using little, a zero-export inverter throttles the panels because the energy has nowhere to go — that’s not a fault. Judge it on a day when the battery was charging or the house was busy.'}
              {!curtailed && v.status === 'low' && ' Worth a look — work down the list below.'}
              {!curtailed && v.status === 'very_low' && ' Something is likely wrong. Work down the list below, then call us.'}
              {v.status === 'high' && ' Check the sun-hours figure and the dates — a ratio above about 0.9 is rare.'}
            </p>
          </div>
        </section>
      )}

      <section style={card} aria-labelledby="hc-order">
        <h2 id="hc-order" style={h2}>If it’s low, check in this order</h2>
        <ol className="ke-hc-list">
          <li><b>Was it really sunny?</b> Clouds after midday cut a day’s output a lot. Compare a few clear days.</li>
          <li><b>Full battery?</b> A zero-export system throttles once the battery is full (above).</li>
          <li><b>Dirt.</b> Dust, salt and bird droppings. Rinse with water and a soft brush from the ground or a safe ladder — never walk on panels, never use abrasives.</li>
          <li><b>New shade.</b> A tree that grew, a new tank or a neighbour’s extension.</li>
          <li><b>Alarms in the app or on the inverter.</b> Note the fault code and call us — don’t open the inverter or battery.</li>
        </ol>
      </section>

      <section style={card} aria-labelledby="hc-routine">
        <h2 id="hc-routine" style={h2}><CalendarClock size={18} aria-hidden style={{ display: 'inline', verticalAlign: '-3px' }} /> A simple routine</h2>
        <ul className="ke-hc-list">
          <li><b>Daily:</b> glance at the app. A red alert, or zero solar on a sunny day — call.</li>
          <li><b>Monthly:</b> compare kWh with last month and with the season; note the battery level at dawn.</li>
          <li><b>Twice a year (us):</b> clean panels, check clamps, cables and terminals, clear the inverter’s vents and insect screen, review battery alarms, replace any spent surge protectors.</li>
          <li><b>Yearly:</b> compare with your first year. Panels lose about 0.5% a year; much more than that is worth checking.</li>
        </ul>
      </section>

      <section style={card} aria-labelledby="hc-storm">
        <h2 id="hc-storm" style={h2}><CloudLightning size={18} aria-hidden style={{ display: 'inline', verticalAlign: '-3px' }} /> Storm season</h2>
        <ul className="ke-hc-list">
          <li><b>Before:</b> charge the battery full, and make sure everyone at home knows the shutdown steps from your handover.</li>
          <li><b>After:</b> look for loose panels, bent racking or damaged cables from the ground. If you see any, keep the system off and call us — panels make dangerous DC voltage whenever there’s daylight.</li>
        </ul>
        <p style={{ ...muted, margin: '10px 0 0' }}>More in <Link href="/storm-ready" style={{ color: 'var(--ke-green-400)' }}>Storm ready</Link> and <Link href="/guides/going-solar" style={{ color: 'var(--ke-green-400)' }}>Going solar in Jamaica</Link>.</p>
      </section>
    </div>
  )
}

const CSS = `
.ke-hc-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:12px}
@media (max-width:560px){.ke-hc-grid{grid-template-columns:1fr}}
.ke-hc-check{display:flex;gap:8px;align-items:flex-start;margin-top:14px;color:var(--ke-dark-text);font-size:13.5px}
.ke-hc-check input{margin-top:3px;accent-color:var(--ke-green-500)}
.ke-hc-result{display:flex;gap:12px;align-items:flex-start;padding:18px 20px;border-radius:20px;border:1px solid}
.ke-hc-result strong{color:#fff;font-family:var(--font-display);font-size:18px}
.ke-hc-result p{margin:6px 0 0;color:var(--ke-dark-text);font-size:14.5px;line-height:1.6}
.ke-hc-result b{color:#fff}
.ke-hc-good{background:rgba(62,207,142,.08);border-color:rgba(62,207,142,.35)}.ke-hc-good svg{color:var(--ke-green-400)}
.ke-hc-note{background:rgba(41,171,226,.08);border-color:rgba(41,171,226,.35)}.ke-hc-note svg{color:#6cc3ea}
.ke-hc-warn{background:rgba(253,184,19,.08);border-color:rgba(253,184,19,.35)}.ke-hc-warn svg{color:#f6c445}
.ke-hc-bad{background:rgba(232,133,133,.08);border-color:rgba(232,133,133,.4)}.ke-hc-bad svg{color:#f0a0a0}
.ke-hc-result svg{flex-shrink:0;margin-top:2px}
.ke-hc-list{margin:10px 0 0;padding-left:20px;display:grid;gap:8px;color:var(--ke-dark-text);font-size:14.5px;line-height:1.6}
.ke-hc-list b{color:#fff}
`
