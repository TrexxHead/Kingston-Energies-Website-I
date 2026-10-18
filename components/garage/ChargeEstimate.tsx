'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { CircleCheck, CircleHelp, CircleX, Timer } from 'lucide-react'
import { chargeSession } from '@/lib/energy/engine/ev'
import { connectorFit, type Fit } from '@/lib/vehicles/connectors'
import { vehicleName, type Vehicle } from '@/lib/vehicles/vehicle'
import { priceAt, type OperatorPrice } from '@/lib/refdata/chargingPrice'

export interface EstimateGroup {
  connectorType: string
  currentType?: string | null
  maxPowerKw: number | null
}

const money = (n: number) => `J$${Math.round(n).toLocaleString('en-JM')}`
const mins = (m: number) => (m < 90 ? `${Math.round(m / 5) * 5 || 5} min` : `${(m / 60).toFixed(1)} h`)
const FIT_ICON: Record<Fit, typeof CircleCheck> = { yes: CircleCheck, check: CircleHelp, no: CircleX }
const FIT_COLOUR: Record<Fit, string> = { yes: 'var(--ke-green-400)', check: '#f6c66b', no: '#f6a5a5' }

/** Best fit across a station for the badge: “Fits your car” / “Check the plug” / “Doesn’t fit your car”. */
export function FitBadge({ vehicle, groups }: { vehicle: Vehicle; groups: EstimateGroup[] }) {
  const fits = groups.map((g) => connectorFit(vehicle, g.connectorType).fit)
  const fit: Fit = fits.includes('yes') ? 'yes' : fits.includes('check') ? 'check' : 'no'
  const Icon = FIT_ICON[fit]
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12.5, fontWeight: 600, color: FIT_COLOUR[fit] }} data-fit={fit}>
      <Icon size={14} aria-hidden /> {fit === 'yes' ? 'Fits your car' : fit === 'check' ? 'Check the plug' : 'Doesn’t fit your car'}
    </span>
  )
}

/**
 * “Charging your Leaf here from 20% to 80%: about 25–50 min, about J$1,900.”
 * Uses the best-fitting connector group, the car's charging limit, and the
 * operator's price right now (when we have one).
 */
export function ChargeEstimate({ vehicle, groups, price }: { vehicle: Vehicle; groups: EstimateGroup[]; price: OperatorPrice | null }) {
  const [from, setFrom] = useState(20)
  const [to, setTo] = useState(80)
  const [now, setNow] = useState<Date | null>(null)
  useEffect(() => setNow(new Date()), [])

  const usable = groups
    .map((g) => ({ g, fit: connectorFit(vehicle, g.connectorType) }))
    .filter((x) => x.fit.fit !== 'no')
    .sort((a, b) => (b.g.maxPowerKw ?? 0) - (a.g.maxPowerKw ?? 0))
  if (!usable.length) {
    const why = groups.map((g) => connectorFit(vehicle, g.connectorType).note)[0]
    return <p style={{ margin: 0, fontSize: 13, color: 'var(--ke-dark-text-muted)' }}>{why}</p>
  }
  const best = usable[0]
  const current: 'AC' | 'DC' = best.g.currentType === 'DC' ? 'DC' : 'AC'
  const carKw = current === 'DC' ? vehicle.specs.dcChargeKw?.value : vehicle.specs.acChargeKw?.value
  const p = price && now ? priceAt(price.data, now) : null
  const r = chargeSession({ batteryKwh: vehicle.specs.batteryKwh?.value ?? 0, fromPct: from, toPct: to, current, chargerKw: best.g.maxPowerKw ?? 0, carKw, pricePerKwh: p?.pricePerKwh ?? null, sessionFee: price?.data.sessionFee ?? null })
  const sel = { background: 'transparent', color: '#fff', border: '1px solid rgba(255,255,255,.2)', borderRadius: 8, padding: '1px 4px', fontSize: 13 }

  return (
    <div style={{ display: 'grid', gap: 4, fontSize: 13, color: 'var(--ke-dark-text-muted)' }} data-testid="charge-estimate">
      <span style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
        <Timer size={14} aria-hidden style={{ color: 'var(--ke-green-400)' }} />
        {vehicleName(vehicle)} from
        <select aria-label="Starting charge" value={from} onChange={(e) => setFrom(Number(e.target.value))} style={sel}>
          {[5, 10, 20, 30, 40, 50].map((v) => (
            <option key={v} value={v} style={{ color: '#000' }}>{v}%</option>
          ))}
        </select>
        to
        <select aria-label="Finishing charge" value={to} onChange={(e) => setTo(Number(e.target.value))} style={sel}>
          {[60, 70, 80, 90, 100].map((v) => (
            <option key={v} value={v} style={{ color: '#000' }}>{v}%</option>
          ))}
        </select>
        on {best.g.connectorType}
        {best.fit.fit === 'check' ? ' (check the plug)' : ''}:
      </span>
      {r.ok ? (
        <span style={{ color: '#fff' }}>
          about <strong>{mins(r.value.minutes.fast)}–{mins(r.value.minutes.slow)}</strong>
          {r.value.cost != null ? (
            <>
              {' '}
              · about <strong>{money(r.value.cost)}</strong>
              {price?.data.sessionFee ? ' incl. session fee' : ''}
            </>
          ) : (
            <span style={{ color: 'var(--ke-dark-text-muted)' }}> · price not published</span>
          )}
          <span style={{ color: 'var(--ke-dark-text-muted)' }}>
            {' '}
            ({Math.round(r.value.kwhDrawn)} kWh at up to {r.value.rateKw} kW{r.value.limitedBy === 'car' ? ', your car’s limit' : ''})
          </span>
        </span>
      ) : (
        <span>
          {r.message}{' '}
          {r.fields.includes('batteryKwh') && (
            <Link href="/garage" style={{ color: 'var(--ke-green-400)' }}>
              Open My Garage
            </Link>
          )}
        </span>
      )}
      {r.ok && r.warnings[0] && <span style={{ fontSize: 12 }}>{r.warnings[0]}</span>}
    </div>
  )
}
