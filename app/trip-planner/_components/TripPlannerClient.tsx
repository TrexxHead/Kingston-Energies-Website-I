'use client'

import { useEffect, useMemo, useState } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { card, label, input, muted, h2, Btn, fmt } from '@/app/my-energy/_components/ui'
import MapSearch from '@/app/energy-map/_components/maps/MapSearch'
import { tripPlan, type RoutePoint } from '@/lib/energy/engine/trip'
import { stationSlug } from '@/lib/map/stationSlug'
import type { SearchHit } from '@/lib/map/search'

const TripMap = dynamic(() => import('./TripMap'), { ssr: false, loading: () => <div className="ke-tp-map" /> })

interface RouteResp {
  distanceKm: number
  durationMin: number
  coordinates: [number, number][]
  points: RoutePoint[]
  chargers: { id: string; name: string; lat: number; lng: number; statusSummary: string; connectors: string[] }[]
}
const num = (v: string) => (v.trim() === '' ? undefined : Number(v.replace(/,/g, '')))
const digits = (v: string) => v.replace(/[^\d.,]/g, '')
const KEY = 'ke-trip-car-v1'

export default function TripPlannerClient() {
  const [from, setFrom] = useState<SearchHit | null>(null)
  const [to, setTo] = useState<SearchHit | null>(null)
  const [car, setCar] = useState({ kwh100: '', battery: '', start: '90', reserve: '15', mass: '' })
  const [route, setRoute] = useState<RouteResp | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(KEY) ?? 'null')
      if (saved) setCar((c) => ({ ...c, ...saved }))
    } catch {
      /* ignore */
    }
  }, [])
  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(car))
    } catch {
      /* ignore */
    }
  }, [car])

  async function plan() {
    if (!from || !to) return
    setBusy(true)
    setError(null)
    const res = await fetch('/api/trip/route', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ from: { lat: from.lat, lng: from.lng }, to: { lat: to.lat, lng: to.lng } }) }).catch(() => null)
    const d = await res?.json().catch(() => ({}))
    setBusy(false)
    if (!res?.ok) {
      setRoute(null)
      setError(d?.error ?? 'Route planning is unavailable right now.')
    } else setRoute(d)
  }

  const result = useMemo(
    () =>
      route
        ? tripPlan({ points: route.points, kwhPer100km: num(car.kwh100) ?? 0, batteryKwh: num(car.battery) ?? 0, startPct: num(car.start) ?? 0, reservePct: num(car.reserve) ?? 0, vehicleMassKg: num(car.mass) })
        : null,
    [route, car],
  )
  const set = (k: keyof typeof car) => (e: { target: { value: string } }) => setCar({ ...car, [k]: digits(e.target.value) })
  const chargerById = new Map(route?.chargers.map((c) => [c.id, c]) ?? [])

  return (
    <div style={{ display: 'grid', gap: 20 }}>
      <style>{CSS}</style>
      <div className="ke-tp-grid">
        <section style={{ ...card, display: 'grid', gap: 12, alignContent: 'start' }} aria-labelledby="tp-where">
          <h2 id="tp-where" style={h2}>Where</h2>
          <div>
            <span style={label}>From</span>
            {from ? <PlaceChip hit={from} onClear={() => { setFrom(null); setRoute(null) }} /> : <MapSearch chargers={[]} onPick={setFrom} />}
          </div>
          <div>
            <span style={label}>To</span>
            {to ? <PlaceChip hit={to} onClear={() => { setTo(null); setRoute(null) }} /> : <MapSearch chargers={[]} onPick={setTo} />}
          </div>
          <div>
            <Btn onClick={plan} disabled={!from || !to || busy}>{busy ? 'Finding the route…' : 'Plan the trip'}</Btn>
          </div>
          {error && <p role="alert" style={{ ...muted, color: '#f6a5a5', margin: 0 }}>{error}</p>}
        </section>
        <section style={{ ...card, display: 'grid', gap: 12, alignContent: 'start' }} aria-labelledby="tp-car">
          <h2 id="tp-car" style={h2}>Your car</h2>
          <div className="ke-tp-fields">
            <div><label htmlFor="tp-kwh" style={label}>Energy use (kWh/100 km)</label><input id="tp-kwh" style={input} inputMode="decimal" placeholder="From the dashboard" value={car.kwh100} onChange={set('kwh100')} /></div>
            <div><label htmlFor="tp-bat" style={label}>Usable battery (kWh)</label><input id="tp-bat" style={input} inputMode="decimal" value={car.battery} onChange={set('battery')} /></div>
            <div><label htmlFor="tp-start" style={label}>Charge at start (%)</label><input id="tp-start" style={input} inputMode="numeric" value={car.start} onChange={set('start')} /></div>
            <div><label htmlFor="tp-res" style={label}>Arrive with at least (%)</label><input id="tp-res" style={input} inputMode="numeric" value={car.reserve} onChange={set('reserve')} /></div>
            <div><label htmlFor="tp-mass" style={label}>Weight with people (kg)</label><input id="tp-mass" style={input} inputMode="numeric" placeholder="Optional, for hills" value={car.mass} onChange={set('mass')} /></div>
          </div>
        </section>
      </div>

      {route && (
        <section style={{ ...card, display: 'grid', gap: 14 }} aria-labelledby="tp-res-title" aria-live="polite">
          <h2 id="tp-res-title" style={h2}>
            {fmt(route.distanceKm, 0)} km · about {route.durationMin >= 60 ? `${Math.floor(route.durationMin / 60)} h ${Math.round(route.durationMin % 60)} min` : `${Math.round(route.durationMin)} min`} driving
          </h2>
          <TripMap coordinates={route.coordinates} chargers={route.chargers} stops={result?.ok ? result.value.stops.map((s) => s.chargerId) : []} />
          {!result?.ok ? (
            <p style={{ ...muted, margin: 0 }}>{result?.message}</p>
          ) : (
            <>
              <p style={{ margin: 0, fontSize: 17, color: '#fff' }}>
                {result.value.stranded ? (
                  <>With the chargers we know of near this road, you’d drop below {car.reserve}% around km {fmt(result.value.stranded.atKm, 0)}.</>
                ) : result.value.stops.length === 0 ? (
                  <>No charging stop needed — you’d arrive with about <strong>{fmt(result.value.arrivePct, 0)}%</strong>.</>
                ) : (
                  <><strong>{result.value.stops.length} charging stop{result.value.stops.length > 1 ? 's' : ''}</strong>, arriving with about {fmt(result.value.arrivePct, 0)}%.</>
                )}{' '}
                The trip uses about {fmt(result.value.energyKwh, 1)} kWh.
              </p>
              {result.value.stops.length > 0 && (
                <ol className="ke-tp-stops">
                  {result.value.stops.map((s) => {
                    const c = chargerById.get(s.chargerId)
                    return (
                      <li key={s.chargerId + s.atKm}>
                        <strong>{s.name}</strong> — {s.atKm < 1 ? 'before you set off' : `km ${fmt(s.atKm, 0)}`}: {s.atKm < 1 ? 'at' : 'arrive'} {fmt(s.arrivePct, 0)}%, charge to {s.chargeToPct}% (+{fmt(s.addKwh, 1)} kWh)
                        {c && <small>{c.connectors.join(', ')} · {c.statusSummary} · <Link href={`/energy-map/station/${stationSlug(c)}`}>details</Link></small>}
                      </li>
                    )
                  })}
                </ol>
              )}
              <ul style={{ ...muted, fontSize: 12.5, margin: 0, paddingLeft: 18 }}>
                {result.assumptions.map((a) => <li key={a.id}>{a.description}</li>)}
                {result.warnings.map((w) => <li key={w}>{w}</li>)}
                <li>Check each charger’s status and connector before you rely on it — many have no live status feed.</li>
              </ul>
            </>
          )}
        </section>
      )}
    </div>
  )
}

function PlaceChip({ hit, onClear }: { hit: SearchHit; onClear: () => void }) {
  return (
    <div className="ke-tp-chip">
      <span>{hit.name}</span>
      <button type="button" onClick={onClear} aria-label={`Change ${hit.name}`}>Change</button>
    </div>
  )
}

const CSS = `
.ke-tp-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,380px),1fr));gap:16px}
.ke-tp-fields{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:10px}
.ke-tp-chip{display:flex;justify-content:space-between;align-items:center;gap:10px;height:44px;padding:0 14px;border-radius:12px;border:1px solid rgba(255,255,255,.14);color:#fff}
.ke-tp-chip button{background:none;border:0;color:var(--ke-green-400);font:inherit;font-weight:600;cursor:pointer}
.ke-tp-map{height:clamp(260px,40vh,420px);border-radius:16px;overflow:hidden;background:#a7d3ee}
.ke-tp-stops{margin:0;padding-left:20px;display:grid;gap:8px;color:#fff;font-size:14.5px}
.ke-tp-stops small{display:block;color:var(--ke-dark-text-muted);font-size:12.5px}
.ke-tp-stops a{color:var(--ke-green-400)}
`
