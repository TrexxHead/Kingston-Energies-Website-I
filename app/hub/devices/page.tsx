'use client'

export const dynamic = 'force-dynamic'

import { useState } from 'react'
import Link from 'next/link'
import { TrendingUp } from 'lucide-react'
import Topbar from '../_components/Topbar'
import { hubScreen, hubCard, hubH3 } from '../_components/ui'

interface Device {
  id: string
  name: string
  serial: string
  purchased: string
  warrantyLeft: number // months
  batteryHealth: number | null
  compatible: string
  upgradeNote?: string
}

// Example registered devices (illustrative — device registry is presentational for now).
const INITIAL_DEVICES: Device[] = [
  {
    id: 'd1',
    name: 'Charmast 10,400',
    serial: 'KE-2026-00412',
    purchased: 'Mar 12, 2026',
    warrantyLeft: 8,
    batteryHealth: 94,
    compatible: 'USB-C cables, car chargers',
  },
  {
    id: 'd2',
    name: '20W USB-C Fast Charger',
    serial: 'KE-2025-00187',
    purchased: 'Oct 3, 2025',
    warrantyLeft: 3,
    batteryHealth: null,
    compatible: 'USB-C power banks, cables',
    upgradeNote: 'Pairs well with a 20,000mAh power bank — upgrade available',
  },
]

export default function DevicesPage() {
  const [devices, setDevices] = useState<Device[]>(INITIAL_DEVICES)
  const [serial, setSerial] = useState('')
  const [justAdded, setJustAdded] = useState(false)

  const register = (e: React.FormEvent) => {
    e.preventDefault()
    const sn = serial.trim().toUpperCase()
    if (!sn) return
    setDevices((prev) => [
      {
        id: `d${Date.now()}`,
        name: 'Registered device',
        serial: sn,
        purchased: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
        warrantyLeft: 12,
        batteryHealth: 100,
        compatible: 'USB-C cables, chargers',
      },
      ...prev,
    ])
    setSerial('')
    setJustAdded(true)
    setTimeout(() => setJustAdded(false), 4000)
  }

  return (
    <>
      <Topbar title="My devices" subtitle="Registered products, warranties and upgrades" />
      <div className="ke-screen" style={hubScreen}>
        {/* Register */}
        <div style={{ ...hubCard, marginBottom: 16 }}>
          <h3 style={hubH3}>Register a new device</h3>
          <form onSubmit={register} style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <input
              value={serial}
              onChange={(e) => setSerial(e.target.value)}
              placeholder="Enter serial number (e.g. KE-2026-00512)"
              style={{
                flex: 1,
                minWidth: 220,
                height: 48,
                padding: '0 16px',
                borderRadius: 12,
                border: '1px solid var(--color-border)',
                fontFamily: 'var(--font-mono)',
                fontSize: 13.5,
                outline: 'none',
              }}
            />
            <button
              type="submit"
              style={{
                height: 48,
                padding: '0 24px',
                borderRadius: 12,
                border: 'none',
                background: 'var(--color-primary)',
                color: '#fff',
                fontFamily: 'var(--font-display)',
                fontWeight: 600,
                fontSize: 14,
                cursor: 'pointer',
              }}
            >
              Register — +25 pts
            </button>
          </form>
          {justAdded && (
            <p style={{ margin: '12px 0 0', fontSize: 13, color: 'var(--ke-green-700)', fontWeight: 600 }}>
              ✓ Device registered — 25 loyalty points added.
            </p>
          )}
        </div>

        {/* Device cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }} className="hub-two-col">
          {devices.map((d) => (
            <div key={d.id} style={hubCard}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                <h3 style={{ ...hubH3, margin: 0 }}>{d.name}</h3>
                <span
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 5,
                    flexShrink: 0,
                    fontFamily: 'var(--font-mono)',
                    fontSize: 10,
                    letterSpacing: '.06em',
                    padding: '3px 9px',
                    borderRadius: 999,
                    background: d.warrantyLeft <= 3 ? 'var(--ke-sun-50)' : 'var(--ke-green-50)',
                    color: d.warrantyLeft <= 3 ? 'var(--ke-sun-500)' : 'var(--ke-green-700)',
                  }}
                >
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'currentColor' }} />
                  {d.warrantyLeft} MO WARRANTY LEFT
                </span>
              </div>

              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '.04em', color: 'var(--color-text-muted)', margin: '6px 0 16px' }}>
                SN {d.serial} · PURCHASED {d.purchased}
              </div>

              {d.batteryHealth !== null && (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
                    <span>Battery health</span>
                    <span style={{ fontWeight: 700 }}>{d.batteryHealth}%</span>
                  </div>
                  <div style={{ height: 8, borderRadius: 999, background: 'var(--color-border)', overflow: 'hidden', marginBottom: 16 }}>
                    <div style={{ width: `${d.batteryHealth}%`, height: '100%', background: 'var(--gradient-brand)' }} />
                  </div>
                </>
              )}

              <div style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: d.upgradeNote ? 12 : 16 }}>
                Compatible: {d.compatible}
              </div>

              {d.upgradeNote && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '10px 12px',
                    borderRadius: 10,
                    background: 'var(--ke-blue-50)',
                    color: 'var(--ke-blue-600)',
                    fontSize: 12.5,
                    marginBottom: 16,
                  }}
                >
                  <TrendingUp size={15} style={{ flexShrink: 0 }} />
                  {d.upgradeNote}
                </div>
              )}

              <Link
                href="/shop?category=accessories"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: 42,
                  borderRadius: 999,
                  border: '1.5px solid var(--ke-green-500)',
                  color: 'var(--ke-green-700)',
                  fontFamily: 'var(--font-display)',
                  fontWeight: 600,
                  fontSize: 13.5,
                  textDecoration: 'none',
                }}
              >
                Shop accessories
              </Link>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
