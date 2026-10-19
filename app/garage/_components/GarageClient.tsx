'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { Plus, Pencil, Trash2, Star, Cloud, HardDrive, Zap, Fuel, BatteryCharging, Map as MapIcon, Route, Sun, CloudLightning, Gauge, Plug } from 'lucide-react'
import { useEnergyProfile } from '@/lib/energy/useEnergyProfile'
import { POWERTRAIN_LABEL, BODY_LABEL, PAINT, SPEC_BASIS_LABEL, VEHICLE_LIMIT, plugsIn, primaryVehicle, vehicleName, type Vehicle, type Spec } from '@/lib/vehicles/vehicle'
import { card, muted, h2, Btn } from '@/app/my-energy/_components/ui'
import VehicleForm from './VehicleForm'

import DesignNote from '@/components/garage/DesignNote'
const VehicleModel3D = dynamic(() => import('@/components/garage/VehicleModel3D'), { ssr: false, loading: () => <div style={{ height: 380 }} /> })

export default function GarageClient({ tripPlanner = false }: { tripPlanner?: boolean }) {
  const { profile, persist, ready, sync, signedIn, notice } = useEnergyProfile()
  const vehicles = profile.vehicles ?? []
  const [selId, setSelId] = useState<string | null>(null)
  const [editing, setEditing] = useState<Vehicle | 'new' | null>(null)
  const selected = vehicles.find((v) => v.clientId === selId) ?? primaryVehicle(vehicles)

  const save = (next: Vehicle[]) => persist({ ...profile, vehicles: next })
  function upsert(v: Vehicle) {
    const exists = vehicles.some((x) => x.clientId === v.clientId)
    let next = exists ? vehicles.map((x) => (x.clientId === v.clientId ? v : x)) : [...vehicles, { ...v, primary: vehicles.length === 0 || v.primary }]
    if (v.primary) next = next.map((x) => ({ ...x, primary: x.clientId === v.clientId }))
    save(next)
    setSelId(v.clientId)
    setEditing(null)
    top()
  }
  function remove(v: Vehicle) {
    if (!window.confirm(`Remove ${vehicleName(v)} from your garage?`)) return
    const rest = vehicles.filter((x) => x.clientId !== v.clientId)
    if (v.primary && rest[0]) rest[0] = { ...rest[0], primary: true }
    save(rest)
    setSelId(null)
  }
  const makePrimary = (v: Vehicle) => save(vehicles.map((x) => ({ ...x, primary: x.clientId === v.clientId })))
  const repaint = (v: Vehicle, colour: string) => save(vehicles.map((x) => (x.clientId === v.clientId ? { ...x, colour } : x)))

  const top = () => requestAnimationFrame(() => document.getElementById('garage')?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
  const edit = (v: Vehicle | 'new') => {
    setEditing(v)
    top()
  }

  if (!ready) return <p style={muted}>Loading your garage…</p>

  if (editing)
    return (
      <div id="garage" style={{ scrollMarginTop: 84 }}>
        <VehicleForm initial={editing === 'new' ? null : editing} onSave={upsert} onCancel={() => setEditing(null)} />
      </div>
    )

  return (
    <div id="garage" style={{ display: 'grid', gap: 18, scrollMarginTop: 84 }}>
      <style>{CSS}</style>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ ...muted, display: 'inline-flex', gap: 6, alignItems: 'center' }}>
          {signedIn ? <Cloud size={14} aria-hidden /> : <HardDrive size={14} aria-hidden />}
          {signedIn ? (sync === 'saving' ? 'Saving to your account…' : sync === 'error' ? 'Couldn’t save to your account — kept in this browser.' : 'Saved to your account') : 'Saved in this browser.'}
          {!signedIn && (
            <>
              {' '}
              <Link href="/login?callbackUrl=/garage" style={{ color: 'var(--ke-green-400)' }}>
                Sign in
              </Link>{' '}
              to keep it on your account.
            </>
          )}
        </span>
        {vehicles.length > 0 && vehicles.length < VEHICLE_LIMIT && (
          <Btn onClick={() => edit('new')}>
            <Plus size={15} aria-hidden /> Add a vehicle
          </Btn>
        )}
      </div>
      {notice && <p role="status" style={{ ...muted, margin: 0 }}>{notice}</p>}

      {vehicles.length === 0 ? (
        <section className="ke-gar-empty" style={card}>
          <div className="ke-gar-empty__art">
            <VehicleModel3D bodyStyle="crossover" colour="#0f8c8c" powertrain="bev" height={300} />
          </div>
          <div style={{ display: 'grid', gap: 12, alignContent: 'center' }}>
            <h2 style={{ ...h2, fontSize: 26 }}>Add your vehicle</h2>
            <p style={{ ...muted, margin: 0 }}>Look it up from the US EPA list or your VIN, or type in your own figures. Your car then shows up in 3D here, and every tool that needs it fills itself in.</p>
            <div>
              <Btn onClick={() => edit('new')}>
                <Plus size={15} aria-hidden /> Add my EV or hybrid
              </Btn>
            </div>
          </div>
        </section>
      ) : (
        <>
          {vehicles.length > 1 && (
            <div role="tablist" aria-label="Your vehicles" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {vehicles.map((v) => (
                <button key={v.clientId} role="tab" aria-selected={selected?.clientId === v.clientId} className="ke-gar-tab" onClick={() => setSelId(v.clientId)}>
                  <i style={{ background: v.colour }} aria-hidden />
                  {vehicleName(v)}
                  {v.primary && <Star size={12} aria-label="main vehicle" />}
                </button>
              ))}
            </div>
          )}
          {selected && <Showcase tripPlanner={tripPlanner} v={selected} onEdit={() => edit(selected)} onRemove={() => remove(selected)} onPrimary={() => makePrimary(selected)} onPaint={(c) => repaint(selected, c)} single={vehicles.length === 1} />}
        </>
      )}
    </div>
  )
}

function Showcase({ v, onEdit, onRemove, onPrimary, onPaint, single, tripPlanner }: { tripPlanner: boolean; v: Vehicle; onEdit: () => void; onRemove: () => void; onPrimary: () => void; onPaint: (c: string) => void; single: boolean }) {
  const s = v.specs
  const ev = plugsIn(v.powertrain)
  return (
    <section className="ke-gar-show" aria-label={vehicleName(v)}>
      <div className="ke-gar-stage">
        <VehicleModel3D bodyStyle={v.bodyStyle} colour={v.colour} powertrain={v.powertrain} make={v.make} model={v.model} year={v.year} height={420} />
        <div className="ke-gar-paint" role="group" aria-label="Paint colour">
          {PAINT.map((p) => (
            <button key={p.hex} type="button" title={p.name} aria-label={p.name} aria-pressed={v.colour.toLowerCase() === p.hex} onClick={() => onPaint(p.hex)} style={{ background: p.hex }} />
          ))}
        </div>
        <div className="ke-gar-note">
          <DesignNote make={v.make} model={v.model} year={v.year} bodyStyle={v.bodyStyle} />
          <span style={{ display: 'block', marginTop: 2 }}>Drag to turn it.</span>
        </div>
      </div>

      <div className="ke-gar-info">
        <div>
          <span className="ke-gar-badge">{v.powertrain === 'bev' ? <Zap size={13} aria-hidden /> : <Fuel size={13} aria-hidden />} {POWERTRAIN_LABEL[v.powertrain]}</span>
          <h2 style={{ ...h2, fontSize: 28, marginTop: 10 }}>{vehicleName(v)}</h2>
          <p style={{ ...muted, margin: '4px 0 0' }}>{[v.nickname ? [v.year, v.make, v.model].filter(Boolean).join(' ') : null, v.trim, BODY_LABEL[v.bodyStyle]].filter(Boolean).join(' · ')}</p>
        </div>

        <dl className="ke-gar-specs">
          {ev && <SpecRow icon={<BatteryCharging size={16} />} k="Battery" spec={s.batteryKwh} unit="kWh" />}
          {ev && <SpecRow icon={<Gauge size={16} />} k="Range" spec={s.rangeKm} unit="km" />}
          {ev && <SpecRow icon={<Zap size={16} />} k="Energy use" spec={s.kwhPer100km} unit="kWh/100 km" />}
          {v.powertrain !== 'bev' && <SpecRow icon={<Fuel size={16} />} k="Petrol use" spec={s.litresPer100km} unit="L/100 km" />}
          {ev && <SpecRow icon={<Plug size={16} />} k="Home/AC charging" spec={s.acChargeKw} unit="kW" />}
          {ev && <SpecRow icon={<Zap size={16} />} k="Fast charging" spec={s.dcChargeKw} unit="kW" />}
          {ev && (
            <div>
              <dt>
                <Plug size={16} aria-hidden /> Charging ports
              </dt>
              <dd>{[v.acInlet, v.dcInlet].filter(Boolean).join(' + ') || <em>Not added</em>}</dd>
            </div>
          )}
          {s.v2lKw && <SpecRow icon={<CloudLightning size={16} />} k="Powers appliances (V2L)" spec={s.v2lKw} unit="kW" />}
          {v.kmPerWeek != null && (
            <div>
              <dt>
                <Route size={16} aria-hidden /> You drive
              </dt>
              <dd>{v.kmPerWeek.toLocaleString('en-JM')} km a week</dd>
            </div>
          )}
        </dl>
        {v.source?.kind === 'epa' && <p className="ke-gar-fine">EPA figures are US lab tests including charging losses; island driving with A/C on often uses more.</p>}

        <div className="ke-gar-uses">
          <h3>Where your car is used</h3>
          <ul>
            {ev && (
              <li>
                <Link href="/energy-map?fits=1">
                  <MapIcon size={16} aria-hidden /> Chargers that fit your plug
                </Link>
              </li>
            )}
            <li>
              <Link href="/ev-costs">
                <Gauge size={16} aria-hidden /> What it costs to run
              </Link>
            </li>
            {ev && (
              <li>
                <Link href="/home-charging">
                  <Plug size={16} aria-hidden /> Charging at home
                </Link>
              </li>
            )}
            {ev && tripPlanner && (
              <li>
                <Link href="/trip-planner">
                  <Route size={16} aria-hidden /> Plan a trip
                </Link>
              </li>
            )}
            {ev && (
              <li>
                <Link href="/solar">
                  <Sun size={16} aria-hidden /> Size solar to charge it
                </Link>
              </li>
            )}
            <li>
              <Link href="/storm-ready">
                <CloudLightning size={16} aria-hidden /> Storm backup
              </Link>
            </li>
          </ul>
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Btn variant="ghost" onClick={onEdit}>
            <Pencil size={14} aria-hidden /> Edit details
          </Btn>
          {!single && !v.primary && (
            <Btn variant="ghost" onClick={onPrimary}>
              <Star size={14} aria-hidden /> Make main vehicle
            </Btn>
          )}
          <Btn variant="danger" onClick={onRemove} ariaLabel={`Remove ${vehicleName(v)}`}>
            <Trash2 size={14} aria-hidden /> Remove
          </Btn>
        </div>
      </div>
    </section>
  )
}

function SpecRow({ icon, k, spec, unit }: { icon: React.ReactNode; k: string; spec?: Spec; unit: string }) {
  return (
    <div>
      <dt>
        {icon} {k}
      </dt>
      <dd>
        {spec ? (
          <>
            {spec.value.toLocaleString('en-JM', { maximumFractionDigits: 1 })} {unit}
            <small title={SPEC_BASIS_LABEL[spec.basis]}>{SPEC_BASIS_LABEL[spec.basis]}</small>
          </>
        ) : (
          <em>Not known yet — add it</em>
        )}
      </dd>
    </div>
  )
}

const CSS = `
.ke-gar-empty{display:grid;grid-template-columns:1.2fr 1fr;gap:20px;align-items:center}
.ke-gar-empty__art{border-radius:16px;background:radial-gradient(120% 90% at 50% 100%,rgba(62,207,142,.12),transparent 60%)}
.ke-gar-tab{display:inline-flex;align-items:center;gap:8px;padding:8px 14px;border-radius:999px;border:1px solid rgba(255,255,255,.16);background:transparent;color:var(--ke-dark-text);cursor:pointer;font-size:14px}
.ke-gar-tab[aria-selected="true"]{border-color:var(--ke-green-400);background:rgba(62,207,142,.1)}
.ke-gar-tab i{width:12px;height:12px;border-radius:50%;border:1px solid rgba(255,255,255,.4)}
.ke-gar-show{display:grid;grid-template-columns:minmax(0,1.35fr) minmax(0,1fr);gap:18px;align-items:start}
.ke-gar-stage{position:relative;border-radius:22px;border:1px solid var(--ke-dark-hairline);background:radial-gradient(110% 80% at 50% 95%,rgba(62,207,142,.14),transparent 55%),linear-gradient(180deg,#141c19,#0d1311);overflow:hidden}
.ke-gar-paint{display:flex;gap:8px;flex-wrap:wrap;justify-content:center;padding:0 16px 10px}
.ke-gar-paint button{width:26px;height:26px;border-radius:50%;border:2px solid rgba(255,255,255,.25);cursor:pointer;padding:0}
.ke-gar-paint button[aria-pressed="true"]{border-color:#fff;box-shadow:0 0 0 2px var(--ke-green-400)}
.ke-gar-note{margin:0;padding:0 16px 14px;text-align:center;font-size:12px;color:var(--ke-dark-text-muted)}
.ke-gar-info{display:grid;gap:16px;background:var(--ke-dark-card);border:1px solid var(--ke-dark-hairline);border-radius:22px;padding:22px}
.ke-gar-badge{display:inline-flex;align-items:center;gap:6px;font-size:12px;font-weight:600;padding:4px 10px;border-radius:999px;background:rgba(62,207,142,.14);color:var(--ke-green-400)}
.ke-gar-specs{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:0}
.ke-gar-specs>div{padding:10px 12px;border-radius:12px;background:rgba(255,255,255,.035);border:1px solid rgba(255,255,255,.06)}
.ke-gar-specs dt{display:flex;align-items:center;gap:6px;font-size:12px;color:var(--ke-dark-text-muted)}
.ke-gar-specs dd{margin:4px 0 0;color:#fff;font-weight:600;font-size:15px}
.ke-gar-specs dd small{display:block;font-weight:400;font-size:11px;color:var(--ke-dark-text-muted);margin-top:2px}
.ke-gar-specs dd em{font-style:normal;font-weight:400;font-size:13px;color:var(--ke-dark-text-muted)}
.ke-gar-fine{margin:0;font-size:12px;color:var(--ke-dark-text-muted)}
.ke-gar-uses h3{margin:0 0 8px;font-size:14px;color:#fff;font-family:var(--font-display)}
.ke-gar-uses ul{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:1fr 1fr;gap:6px}
.ke-gar-uses a{display:flex;align-items:center;gap:8px;padding:8px 10px;border-radius:10px;color:var(--ke-green-400);text-decoration:none;font-size:13.5px;font-weight:600;background:rgba(62,207,142,.06)}
.ke-gar-uses a:hover{background:rgba(62,207,142,.14)}
@media (max-width:860px){.ke-gar-show,.ke-gar-empty{grid-template-columns:1fr}}
@media (max-width:420px){.ke-gar-specs,.ke-gar-uses ul{grid-template-columns:1fr}}
`
