'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { BatteryCharging, Info } from 'lucide-react'
import { CATALOG, capacityWh, fmt, type Product } from '@/lib/catalog'
import { wattHours, usableWh, runtimeHours } from '@/lib/energyCheckup/backupPower'
import { useCart } from '@/components/cart/CartContext'
import { useToast } from '@/components/cart/ToastContext'
import { Button } from '@/components/shop/ui'
import { wizardCard } from './shared'

const HOURS_OPTIONS = [8, 24, 72]

interface BackupKitBuilderProps {
  /** Which checkup appliance this is sized from — always a USB/DC-powered
   *  one (phone & laptop charging at home, the always-on Wi-Fi kit for a
   *  business), never AC-outlet equipment like a fridge or AC unit. */
  applianceLabel: string
  deviceCount: number
  watts: number
}

/**
 * A power bank only ever outputs USB power — it cannot run anything that
 * plugs into a wall socket (a fridge, AC, TV). So this sizes backup runtime
 * for exactly what a power bank *can* keep alive: the phones, laptops and
 * routers a household or business actually depends on through an outage.
 * Capacity is only ever read from a real product spec (see capacityWh) —
 * never invented — so a product with no stated capacity is shown as a
 * "talk to us" case, not guessed at.
 */
export default function BackupKitBuilder({ applianceLabel, deviceCount, watts }: BackupKitBuilderProps) {
  const { addItem } = useCart()
  const { pushToast } = useToast()
  const [hours, setHours] = useState(8)
  const [count, setCount] = useState(Math.max(1, deviceCount))
  const [livePrices, setLivePrices] = useState<Record<string, number>>({})

  useEffect(() => {
    fetch('/api/products')
      .then((r) => (r.ok ? r.json() : { prices: {} }))
      .then((d: { prices: Record<string, { price: number }> }) => {
        const map: Record<string, number> = {}
        for (const [id, v] of Object.entries(d.prices ?? {})) map[id] = v.price
        setLivePrices(map)
      })
      .catch(() => {})
  }, [])

  // Raw energy the devices will draw — comparisons below go against each
  // bank's usable Wh (via the shared backupPower engine), not its raw
  // advertised capacity, since a USB power bank never delivers 100% of its
  // stated mAh out the port either (conversion loss, self-discharge, the BMS
  // never draining literally to 0%).
  const requiredWh = wattHours(watts * count, hours)

  const powerbanks = useMemo(
    () =>
      CATALOG.filter((p) => p.cat === 'powerbanks')
        .map((p) => {
          const capWh = capacityWh(p)
          return { product: p, capWh, usableWh: capWh !== null ? usableWh(capWh) : null, price: livePrices[p.id] ?? p.price }
        })
        .filter((r): r is { product: Product; capWh: number; usableWh: number; price: number } => r.capWh !== null && r.usableWh !== null)
        .sort((a, b) => a.usableWh - b.usableWh),
    [livePrices],
  )

  const fits = powerbanks.filter((p) => p.usableWh >= requiredWh)
  const best = fits.length > 0 ? fits.reduce((a, b) => (b.price < a.price ? b : a)) : null
  const biggest = powerbanks[powerbanks.length - 1] ?? null
  const unitsNeeded = !best && biggest ? Math.ceil(requiredWh / biggest.usableWh) : null
  const bestRuntimeHours = best ? runtimeHours(best.usableWh, watts * count) : null

  return (
    <div style={{ ...wizardCard, marginBottom: 18, background: '#0d1714', color: '#eaf2ec' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
        <BatteryCharging size={18} color="var(--ke-green-400)" />
        <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 17, margin: 0 }}>Build your outage backup kit</h3>
      </div>
      <p style={{ fontSize: 13, color: 'rgba(234,242,236,.65)', margin: '8px 0 18px', maxWidth: 560, lineHeight: 1.55 }}>
        A power bank only powers USB devices — not a fridge, AC, or anything else that plugs into a wall socket. Sized
        here for what it actually can keep alive: your {applianceLabel.toLowerCase()}.
      </p>

      <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', marginBottom: 18 }}>
        <div>
          <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', letterSpacing: '.14em', color: 'rgba(234,242,236,.5)', textTransform: 'uppercase' }}>
            Devices to keep charged
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
            <button type="button" onClick={() => setCount((c) => Math.max(1, c - 1))} style={stepperBtn}>−</button>
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 18, width: 24, textAlign: 'center' }}>{count}</span>
            <button type="button" onClick={() => setCount((c) => Math.min(20, c + 1))} style={stepperBtn}>+</button>
          </div>
        </div>
        <div>
          <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', letterSpacing: '.14em', color: 'rgba(234,242,236,.5)', textTransform: 'uppercase' }}>
            Keep them running for
          </span>
          <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
            {HOURS_OPTIONS.map((h) => (
              <button
                key={h}
                type="button"
                onClick={() => setHours(h)}
                style={{
                  height: 32, padding: '0 12px', borderRadius: 999, fontSize: 12.5, fontWeight: 600, cursor: 'pointer',
                  border: `1.5px solid ${hours === h ? 'var(--ke-green-400)' : 'rgba(234,242,236,.2)'}`,
                  background: hours === h ? 'rgba(147,201,63,.15)' : 'transparent',
                  color: hours === h ? 'var(--ke-green-400)' : 'rgba(234,242,236,.75)',
                }}
              >
                {h < 24 ? `${h} hrs` : `${h / 24} day${h > 24 ? 's' : ''}`}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ fontSize: 12.5, color: 'rgba(234,242,236,.55)', marginBottom: 14 }}>
        ≈ {Math.round(requiredWh)} Wh of draw — compared against each bank&apos;s usable capacity, not its raw advertised
        mAh (a battery never delivers 100% of that out the port).
      </div>

      {best ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, background: 'rgba(255,255,255,.05)', borderRadius: 14, padding: '14px 16px', flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15 }}>{best.product.name}</div>
            <div style={{ fontSize: 12, color: 'rgba(234,242,236,.55)', marginTop: 2 }}>
              {Math.round(best.capWh)} Wh capacity (≈{Math.round(best.usableWh)} Wh usable)
              {bestRuntimeHours !== null ? ` — ≈${Math.round(bestRuntimeHours)}h of runtime at this load` : ' — covers this with room to spare'}
              {' · '}{fmt(best.price)}
            </div>
          </div>
          <Button
            size="sm"
            onClick={() => {
              addItem({ name: best.product.name, price: best.price, spec: best.product.spec })
              pushToast('check', 'Added to cart', best.product.name)
            }}
          >
            Add to cart
          </Button>
        </div>
      ) : biggest ? (
        <div style={{ background: 'rgba(255,255,255,.05)', borderRadius: 14, padding: '14px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15 }}>{biggest.product.name}</div>
              <div style={{ fontSize: 12, color: 'rgba(234,242,236,.55)', marginTop: 2 }}>
                {Math.round(biggest.capWh)} Wh each (≈{Math.round(biggest.usableWh)} Wh usable) — you&apos;d need {unitsNeeded} to fully cover this, or run fewer devices / a shorter window
              </div>
            </div>
            <Button
              size="sm"
              onClick={() => {
                addItem({ name: biggest.product.name, price: biggest.price, spec: biggest.product.spec })
                pushToast('check', 'Added to cart', biggest.product.name)
              }}
            >
              Add to cart
            </Button>
          </div>
        </div>
      ) : (
        <p style={{ fontSize: 13, color: 'rgba(234,242,236,.6)' }}>No power bank capacity data available right now.</p>
      )}

      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginTop: 16, paddingTop: 14, borderTop: '1px solid rgba(255,255,255,.08)' }}>
        <Info size={13} color="rgba(234,242,236,.4)" style={{ flexShrink: 0, marginTop: 2 }} />
        <p style={{ fontSize: 12, color: 'rgba(234,242,236,.5)', margin: 0, lineHeight: 1.5 }}>
          Need the fridge, AC, or anything else on the wall to survive an outage too? That needs a power station or a
          sized system, not a power bank. <Link href="/business-power-continuity" style={{ color: 'var(--ke-green-400)' }}>See what a full backup setup looks like</Link>.
        </p>
      </div>
    </div>
  )
}

const stepperBtn: React.CSSProperties = {
  width: 28, height: 28, borderRadius: 8, border: '1.5px solid rgba(234,242,236,.2)', background: 'transparent',
  color: '#eaf2ec', fontSize: 16, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
}
