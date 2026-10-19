'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { Car, Home, Receipt, Sun, CloudLightning, ArrowRight, PlugZap } from 'lucide-react'
import { muted, h2, fmt } from './ui'
import type { EnergyProfile } from '@/lib/energy/profileSchema'
import { POWERTRAIN_LABEL, plugsIn, primaryVehicle, vehicleName } from '@/lib/vehicles/vehicle'
import { loadSavedEstimates, encodeSnapshot, type SolarSnapshot } from '@/lib/solar/report'
import { loadChecked } from '@/app/hub/storm-prep/_lib/checklist'

const VehicleModel3D = dynamic(() => import('@/components/garage/VehicleModel3D'), { ssr: false, loading: () => <div style={{ height: 150 }} /> })

interface Bill {
  periodEnd: string
  kwh: number
  days: number
  currentCharges: number
}

/**
 * “Your energy at a glance”: one card per part of the profile — car, home,
 * bills, solar, storm readiness — and the next useful step. Everything is
 * read from what the visitor has already entered on this site.
 */
export default function EnergyOverview({ profile }: { profile: EnergyProfile }) {
  const [bills, setBills] = useState<Bill[]>([])
  const [solar, setSolar] = useState<SolarSnapshot[]>([])
  const [stormTicks, setStormTicks] = useState(0)
  useEffect(() => {
    try {
      const b = JSON.parse(localStorage.getItem('ke-bill-history-v1') ?? '[]')
      if (Array.isArray(b)) setBills(b)
    } catch {
      /* storage unavailable */
    }
    setSolar(loadSavedEstimates())
    try {
      setStormTicks(loadChecked().size)
    } catch {
      /* storage unavailable */
    }
  }, [])

  const car = primaryVehicle(profile.vehicles)
  const devices = profile.properties.reduce((a, p) => a + p.devices.length, 0)
  const lastBill = bills[bills.length - 1]
  const perDay = (b: Bill) => b.kwh / Math.max(1, b.days)
  const avg = bills.length ? bills.reduce((a, b) => a + perDay(b), 0) / bills.length : 0
  const est = solar[0]

  const next: { href: string; text: string; Icon: typeof Car }[] = []
  if (!car) next.push({ href: '/garage', text: 'Add your EV or hybrid to My Garage', Icon: Car })
  if (!bills.length) next.push({ href: '/bill-explainer', text: 'Read your latest JPS bill from a photo', Icon: Receipt })
  if (!est) next.push({ href: '/solar', text: 'Tap your roof for a solar estimate', Icon: Sun })
  if (car && plugsIn(car.powertrain) && car.homeCharging !== 'level2') next.push({ href: '/home-charging', text: 'See if you need a home charger', Icon: PlugZap })
  if (stormTicks === 0) next.push({ href: '/storm-ready', text: 'Start the storm checklist', Icon: CloudLightning })

  return (
    <section className="ke-ov" aria-labelledby="ov-title">
      <style>{CSS}</style>
      <h2 id="ov-title" style={h2}>Your energy at a glance</h2>
      <div className="ke-ov-grid">
        <Tile href="/garage" Icon={Car} title="My Garage" testId="ov-car">
          {car ? (
            <>
              <div className="ke-ov-car">
                <VehicleModel3D bodyStyle={car.bodyStyle} colour={car.colour} powertrain={car.powertrain} make={car.make} model={car.model} year={car.year} height={150} />
              </div>
              <strong>{vehicleName(car)}</strong>
              <span>
                {POWERTRAIN_LABEL[car.powertrain]}
                {car.specs.rangeKm ? ` · ${fmt(car.specs.rangeKm.value, 0)} km range` : ''}
              </span>
            </>
          ) : (
            <span>Add your car once — the map, cost calculator, trip planner and solar estimator use it.</span>
          )}
        </Tile>
        <Tile href="#properties" Icon={Home} title="Home & equipment" testId="ov-home">
          <strong>{profile.properties.length ? `${devices} device${devices === 1 ? '' : 's'}` : 'Not started'}</strong>
          <span>{profile.properties.length ? `${profile.properties.length} propert${profile.properties.length === 1 ? 'y' : 'ies'} · used by backup and storm tools` : 'List what you run to size backup power.'}</span>
        </Tile>
        <Tile href="/bill-explainer" Icon={Receipt} title="Bills" testId="ov-bills">
          {lastBill ? (
            <>
              <strong>{fmt(perDay(lastBill), 1)} kWh a day</strong>
              <span>
                Latest bill to {lastBill.periodEnd}
                {bills.length > 1 ? ` · ${perDay(lastBill) >= avg ? `${fmt(((perDay(lastBill) - avg) / avg) * 100, 0)}% above` : `${fmt(((avg - perDay(lastBill)) / avg) * 100, 0)}% below`} your average` : ''}
              </span>
            </>
          ) : (
            <span>Save your bills to see your use month by month.</span>
          )}
        </Tile>
        <Tile href={est ? `/solar/report#${encodeSnapshot(est)}` : '/solar'} Icon={Sun} title="Solar" testId="ov-solar">
          {est ? (
            <>
              <strong>{est.system.kwp.toFixed(1)} kWp estimate</strong>
              <span>{est.savings ? `About J$${fmt(Math.round(est.savings.daytime / 1000) * 1000, 0)}+ a year saved` : est.production ? `${fmt(est.production.base, 0)} kWh a year` : 'Open the report'} · {est.date}</span>
            </>
          ) : (
            <span>Tap your roof on the map for panels, output and savings.</span>
          )}
        </Tile>
        <Tile href="/storm-ready" Icon={CloudLightning} title="Storm ready" testId="ov-storm">
          <strong>{stormTicks ? `${stormTicks} checklist item${stormTicks === 1 ? '' : 's'} done` : 'Checklist not started'}</strong>
          <span>Live NHC storms, forecast cone, shelters and backup runtime.</span>
        </Tile>
      </div>
      {next.length > 0 && (
        <div className="ke-ov-next">
          <span style={{ ...muted, fontSize: 13 }}>Next steps</span>
          <ul>
            {next.slice(0, 3).map((n) => (
              <li key={n.href}>
                <Link href={n.href}>
                  <n.Icon size={15} aria-hidden /> {n.text} <ArrowRight size={14} aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}

function Tile({ href, Icon, title, children, testId }: { href: string; Icon: typeof Car; title: string; children: React.ReactNode; testId: string }) {
  return (
    <Link href={href} className="ke-ov-tile" data-testid={testId}>
      <span className="ke-ov-head">
        <Icon size={16} aria-hidden /> {title}
      </span>
      {children}
    </Link>
  )
}

const CSS = `
.ke-ov{display:grid;gap:14px}
.ke-ov-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,180px),1fr));gap:12px}
.ke-ov-tile{display:grid;gap:4px;align-content:start;padding:16px;border-radius:18px;background:var(--ke-dark-card);border:1px solid var(--ke-dark-hairline);text-decoration:none;color:var(--ke-dark-text-muted);font-size:13px;line-height:1.45;transition:border-color .15s}
.ke-ov-tile:hover{border-color:var(--ke-green-400)}
.ke-ov a.ke-ov-tile,.ke-ov a.ke-ov-tile>span:not(.ke-ov-head){color:var(--ke-dark-text-muted)}
.ke-ov-tile strong{color:#fff;font-size:16px;font-family:var(--font-display)}
.ke-ov-head{display:flex;align-items:center;gap:6px;color:var(--ke-green-400);font-weight:600;font-size:12.5px;margin-bottom:4px}
.ke-ov-car{margin:-6px -8px 0;border-radius:12px;background:radial-gradient(100% 80% at 50% 100%,rgba(62,207,142,.12),transparent 60%)}
.ke-ov-next{display:grid;gap:6px}
.ke-ov-next ul{list-style:none;margin:0;padding:0;display:flex;gap:8px;flex-wrap:wrap}
.ke-ov-next a{display:inline-flex;align-items:center;gap:6px;padding:8px 12px;border-radius:999px;border:1px solid rgba(62,207,142,.3);color:var(--ke-green-400);text-decoration:none;font-size:13.5px;font-weight:600}
`
