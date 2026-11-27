'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { CircleCheck, CircleX, Star, Sun, Send } from 'lucide-react'
import { card, label, input, muted, h2, Btn, fmt } from '@/app/my-energy/_components/ui'
import { homeChargingOptions } from '@/lib/energy/engine/ev'
import { marginalSaving } from '@/lib/energy/engine/tariff'
import { useActiveRecord } from '@/lib/refdata/useRefData'
import { tariffFromPublic } from '@/lib/refdata/types'
import { useMyVehicle, VehicleChip } from '@/components/garage/useMyVehicle'
import { plugsIn, vehicleName } from '@/lib/vehicles/vehicle'
import { PARISHES } from '@/lib/map/parishes'

const num = (v: string) => (v.trim() === '' ? undefined : Number(v.replace(/,/g, '')))
const digits = (v: string) => v.replace(/[^\d.,]/g, '')
const hrs = (h: number) => (h < 1 ? `${Math.max(5, Math.round((h * 60) / 5) * 5)} min` : `${h.toFixed(h < 10 ? 1 : 0)} h`)

export default function HomeChargingClient() {
  const { vehicles, vehicle, setPick } = useMyVehicle((v) => plugsIn(v.powertrain))
  const { record: tariffRec } = useActiveRecord('tariff', 'residential')
  const tariff = tariffRec ? tariffFromPublic(tariffRec) : null
  const [f, setF] = useState({ km: '', kwh100: '', battery: '', acKw: '', window: '10', household: '', price: '' })
  useEffect(() => {
    if (!vehicle) return
    const sp = vehicle.specs
    setF((x) => ({
      ...x,
      km: vehicle.kmPerWeek ? String(vehicle.kmPerWeek) : x.km,
      kwh100: sp.kwhPer100km ? String(sp.kwhPer100km.value) : x.kwh100,
      battery: sp.batteryKwh ? String(sp.batteryKwh.value) : x.battery,
      acKw: sp.acChargeKw ? String(sp.acChargeKw.value) : x.acKw,
    }))
  }, [vehicle?.clientId]) // eslint-disable-line react-hooks/exhaustive-deps
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: digits(e.target.value) })

  const dailyKwh = ((num(f.km) ?? 0) / 7) * ((num(f.kwh100) ?? 0) / 100)
  const result = useMemo(() => homeChargingOptions({ dailyKwh, batteryKwh: num(f.battery), carAcKw: num(f.acKw), windowHours: num(f.window) ?? 0 }), [dailyKwh, f.battery, f.acKw, f.window])
  const monthlyKwh = dailyKwh * 30.4
  const today = new Date(Date.now() - 5 * 3_600_000).toISOString().slice(0, 10)
  const extra = useMemo(() => {
    if (!(monthlyKwh > 0)) return null
    const house = num(f.household)
    if (tariff && house != null) {
      const m = marginalSaving(tariff, house + monthlyKwh, monthlyKwh, today)
      return m.ok ? { cost: m.value.saving, how: `at the approved JPS tariff on top of your ${fmt(house, 0)} kWh a month` } : null
    }
    const price = num(f.price)
    return price ? { cost: price * monthlyKwh, how: `at your J$${fmt(price, 2)} per kWh` } : null
  }, [monthlyKwh, f.household, f.price, tariff, today])
  const [chosen, setChosen] = useState<string | null>(null)
  const rec = result.ok ? result.value.recommended : null
  const picked = result.ok ? (result.value.options.find((o) => o.id === (chosen ?? rec)) ?? null) : null

  return (
    <div style={{ display: 'grid', gap: 20 }}>
      <style>{CSS}</style>
      <VehicleChip vehicles={vehicles} vehicle={vehicle} onPick={setPick} returnTo="/home-charging" emptyText="Add your EV in My Garage and these fill in." />
      <div className="ke-hc-grid">
        <section style={{ ...card, display: 'grid', gap: 12, alignContent: 'start' }} aria-labelledby="hc-you">
          <h2 id="hc-you" style={h2}>Your driving</h2>
          <div className="ke-hc-row">
            <Field id="hc-km" l="Kilometres a week" v={f.km} on={set('km')} />
            <Field id="hc-kwh" l="Energy use (kWh / 100 km)" v={f.kwh100} on={set('kwh100')} hint="e.g. 14–18 small car" />
          </div>
          <div className="ke-hc-row">
            <Field id="hc-bat" l="Battery size (kWh)" v={f.battery} on={set('battery')} />
            <Field id="hc-ac" l="Car’s AC charging limit (kW)" v={f.acKw} on={set('acKw')} hint="Onboard charger" />
          </div>
          <Field id="hc-win" l="Hours parked at home overnight" v={f.window} on={set('window')} />
          {dailyKwh > 0 && (
            <p style={{ ...muted, margin: 0 }}>
              That’s about <strong style={{ color: '#fff' }}>{fmt(dailyKwh, 1)} kWh a day</strong> ({fmt(monthlyKwh, 0)} kWh a month) to put back.
            </p>
          )}
          <h2 style={{ ...h2, fontSize: 17, marginTop: 6 }}>What it adds to your bill</h2>
          {tariff ? (
            <Field id="hc-house" l="Your home’s use now (kWh / month)" v={f.household} on={set('household')} hint="From your JPS bill" />
          ) : (
            <Field id="hc-price" l="Your price (J$ per kWh)" v={f.price} on={set('price')} hint="Bill total ÷ kWh" />
          )}
          {extra ? (
            <p style={{ ...muted, margin: 0 }} data-testid="hc-extra">
              Charging at home adds about <strong style={{ color: '#fff' }}>J${fmt(Math.round(extra.cost), 0)} a month</strong> {extra.how}.
            </p>
          ) : (
            <p style={{ ...muted, margin: 0 }}>{tariff ? 'Enter your monthly kWh to see what charging adds.' : 'Enter your price per kWh to see what charging adds — we don’t guess tariffs.'}</p>
          )}
          <p style={{ ...muted, margin: 0, fontSize: 12.5 }}>
            <Sun size={13} aria-hidden style={{ verticalAlign: '-2px' }} /> Charging at midday from your own panels costs nothing per kWh. <Link href="/solar" style={{ color: 'var(--ke-green-400)' }}>Size solar with your car included</Link>.
          </p>
        </section>

        <section style={{ ...card, display: 'grid', gap: 12, alignContent: 'start' }} aria-labelledby="hc-opts" aria-live="polite">
          <h2 id="hc-opts" style={h2}>Your options</h2>
          {!result.ok ? (
            <p style={{ ...muted, margin: 0 }}>{result.message}</p>
          ) : (
            <>
              <div role="radiogroup" aria-label="Charging option" style={{ display: 'grid', gap: 10 }}>
                {result.value.options.map((o) => (
                  <button key={o.id} type="button" role="radio" aria-checked={picked?.id === o.id} className="ke-hc-opt" onClick={() => setChosen(o.id)} data-option={o.id}>
                    <span className="ke-hc-opt__top">
                      <strong>{o.label}</strong>
                      {rec === o.id && (
                        <span className="ke-hc-rec">
                          <Star size={12} aria-hidden /> Enough for you
                        </span>
                      )}
                    </span>
                    <span className="ke-hc-opt__fig">
                      {o.fitsWindow ? <CircleCheck size={15} aria-hidden color="var(--ke-green-400)" /> : <CircleX size={15} aria-hidden color="#f6a5a5" />}
                      {hrs(o.hoursPerDay)} a night for your driving
                      {o.fullHours != null && <> · {hrs(o.fullHours)} from 20% to full</>}
                    </span>
                    <span className="ke-hc-opt__sub">
                      {fmt(o.rateKw, 1)} kW{o.limitedByCar ? ` (your car’s limit; the charger could do ${fmt(o.chargerKw, 1)} kW)` : ''} · {o.breakerA} A breaker · {o.note}
                    </span>
                  </button>
                ))}
              </div>
              {!rec && <p style={{ ...muted, margin: 0, color: '#f6c66b' }}>None of these puts a full day’s driving back in {f.window} hours — top up at a public fast charger on long days, or charge for longer.</p>}
              <ul style={{ ...muted, fontSize: 12.5, margin: 0, paddingLeft: 18 }}>
                {result.assumptions.map((a) => (
                  <li key={a.id}>{a.description}</li>
                ))}
                <li>{result.warnings[0]}</li>
              </ul>
            </>
          )}
        </section>
      </div>

      {picked && picked.id !== 'outlet' && <QuoteForm vehicle={vehicle ? vehicleName(vehicle) : 'Not added'} option={picked.label} dailyKwh={dailyKwh} carAcKw={num(f.acKw) ?? null} />}
    </div>
  )
}

function Field({ id, l, v, on, hint }: { id: string; l: string; v: string; on: (e: { target: { value: string } }) => void; hint?: string }) {
  return (
    <div>
      <label htmlFor={id} style={label}>{l}</label>
      <input id={id} style={input} inputMode="decimal" value={v} onChange={on} placeholder={hint} />
    </div>
  )
}

function QuoteForm({ vehicle, option, dailyKwh, carAcKw }: { vehicle: string; option: string; dailyKwh: number; carAcKw: number | null }) {
  const [q, setQ] = useState({ name: '', email: '', phone: '', parish: '', parking: 'driveway', distance: '', note: '' })
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [msg, setMsg] = useState<string | null>(null)
  async function send() {
    setState('sending')
    setMsg(null)
    const res = await fetch('/api/home-charging/quote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: q.name, email: q.email, phone: q.phone || undefined, parish: q.parish || undefined, note: q.note || undefined, plan: { vehicle, option, dailyKwh, carAcKw, parking: q.parking, panelDistanceM: num(q.distance) ?? null } }),
    }).catch(() => null)
    const j = await res?.json().catch(() => ({}))
    if (res?.ok) setState('sent')
    else {
      setState('error')
      setMsg(j?.error ?? 'Could not send — please try again.')
    }
  }
  if (state === 'sent')
    return (
      <section style={card} aria-live="polite">
        <h2 style={h2}>Request sent</h2>
        <p style={{ ...muted, margin: '8px 0 0' }}>We’ll be in touch to arrange a survey of your panel, supply and cable route. Nothing is booked or charged yet.</p>
      </section>
    )
  return (
    <section style={{ ...card, display: 'grid', gap: 12 }} aria-labelledby="hc-q">
      <h2 id="hc-q" style={h2}>
        <Send size={17} aria-hidden style={{ verticalAlign: '-2px' }} /> Get a home charger installed
      </h2>
      <p style={{ ...muted, margin: 0 }}>For a {option.toLowerCase()}. A licensed electrician surveys first — panel capacity, your JPS service and the cable route — then quotes.</p>
      <div className="ke-hc-row3">
        <TextField id="q-name" l="Name" v={q.name} on={(v) => setQ({ ...q, name: v })} />
        <TextField id="q-email" l="E-mail" v={q.email} on={(v) => setQ({ ...q, email: v })} />
        <TextField id="q-phone" l="Phone (optional)" v={q.phone} on={(v) => setQ({ ...q, phone: v })} />
      </div>
      <div className="ke-hc-row3">
        <div>
          <label htmlFor="q-parish" style={label}>Parish</label>
          <select id="q-parish" style={input} value={q.parish} onChange={(e) => setQ({ ...q, parish: e.target.value })}>
            <option value="">Choose…</option>
            {PARISHES.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="q-park" style={label}>Where you park</label>
          <select id="q-park" style={input} value={q.parking} onChange={(e) => setQ({ ...q, parking: e.target.value })}>
            <option value="garage">Garage / carport</option>
            <option value="driveway">Driveway</option>
            <option value="street">On the street</option>
            <option value="apartment">Apartment / shared parking</option>
          </select>
        </div>
        <TextField id="q-dist" l="Metres from the electrical panel (about)" v={q.distance} on={(v) => setQ({ ...q, distance: digits(v) })} />
      </div>
      <TextField id="q-note" l="Anything else (optional)" v={q.note} on={(v) => setQ({ ...q, note: v })} />
      {msg && <p role="alert" style={{ ...muted, color: '#f6a5a5', margin: 0 }}>{msg}</p>}
      <div>
        <Btn onClick={send} disabled={state === 'sending' || !q.name.trim() || !q.email.includes('@')}>
          {state === 'sending' ? 'Sending…' : 'Request a survey and quote'}
        </Btn>
      </div>
    </section>
  )
}

function TextField({ id, l, v, on }: { id: string; l: string; v: string; on: (v: string) => void }) {
  return (
    <div>
      <label htmlFor={id} style={label}>{l}</label>
      <input id={id} style={input} value={v} onChange={(e) => on(e.target.value)} />
    </div>
  )
}

const CSS = `
.ke-hc-grid{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.15fr);gap:20px;align-items:start}
.ke-hc-row{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.ke-hc-row3{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}
.ke-hc-opt{display:grid;gap:5px;text-align:left;padding:14px 16px;border-radius:14px;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.03);color:var(--ke-dark-text);cursor:pointer}
.ke-hc-opt[aria-checked="true"]{border-color:var(--ke-green-400);background:rgba(62,207,142,.08)}
.ke-hc-opt__top{display:flex;justify-content:space-between;gap:8px;align-items:center;flex-wrap:wrap}
.ke-hc-opt__top strong{color:#fff;font-size:15px}
.ke-hc-opt__fig{display:flex;gap:6px;align-items:center;font-size:14px;color:#fff}
.ke-hc-opt__sub{font-size:12.5px;color:var(--ke-dark-text-muted);line-height:1.45}
.ke-hc-rec{display:inline-flex;gap:4px;align-items:center;font-size:11.5px;font-weight:700;padding:3px 8px;border-radius:999px;background:rgba(62,207,142,.16);color:var(--ke-green-400)}
@media (max-width:860px){.ke-hc-grid{grid-template-columns:1fr}.ke-hc-row3{grid-template-columns:1fr}}
@media (max-width:420px){.ke-hc-row{grid-template-columns:1fr}}
`
