'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Topbar from '../_components/Topbar'
import { hubScreen, hubCard, hubH3 } from '../_components/ui'

interface Device {
  id: string
  name: string
  spec: string | null
  serial: string
  purchasedAt: string
  orderNo: string | null
  hasBattery: boolean
  batteryHealthPct: number | null
  monthsOwned: number
  returnWindowDaysLeft: number
  manufacturerWarranty: string | null
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function monthsOwnedLabel(iso: string): string {
  const months = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24 * 30.44)))
  if (months < 1) return 'less than a month'
  return `${months} month${months === 1 ? '' : 's'}`
}

export default function DevicesPage() {
  const [devices, setDevices] = useState<Device[]>([])
  const [loading, setLoading] = useState(true)
  const [serial, setSerial] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null)

  const load = () => {
    fetch('/api/hub/devices')
      .then((r) => (r.ok ? r.json() : { devices: [] }))
      .then((d: { devices: Device[] }) => setDevices(d.devices ?? []))
      .catch(() => setDevices([]))
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  const register = async (e: React.FormEvent) => {
    e.preventDefault()
    const sn = serial.trim()
    if (!sn || submitting) return
    setSubmitting(true)
    setMessage(null)
    try {
      const res = await fetch('/api/hub/devices/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ serial: sn }),
      })
      const data = await res.json()
      if (!res.ok) {
        setMessage({ kind: 'error', text: data.error ?? 'Could not register that device.' })
      } else {
        setMessage({ kind: 'ok', text: `✓ Device registered: ${data.pointsAwarded} loyalty points added.` })
        setSerial('')
        load()
      }
    } catch {
      setMessage({ kind: 'error', text: 'Something went wrong. Please try again.' })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <Topbar title="My devices" subtitle="Registered products, warranties and upgrades" />
      <div className="ke-screen" style={hubScreen}>
        {/* Register */}
        <div style={{ ...hubCard, marginBottom: 16 }}>
          <h3 style={hubH3}>Register a new device</h3>
          <p style={{ fontSize: 12.5, color: 'var(--color-text-muted)', margin: '0 0 14px' }}>
            The serial number is on your invoice. It&apos;s unique to the exact unit you received.
          </p>
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
                textTransform: 'uppercase',
              }}
            />
            <button
              type="submit"
              disabled={submitting}
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
                cursor: submitting ? 'default' : 'pointer',
                opacity: submitting ? 0.7 : 1,
              }}
            >
              {submitting ? 'Registering…' : 'Register: +25 pts'}
            </button>
          </form>
          {message && (
            <p style={{ margin: '12px 0 0', fontSize: 13, fontWeight: 600, color: message.kind === 'ok' ? 'var(--ke-green-700)' : 'var(--ke-sun-500, #b45309)' }}>
              {message.text}
            </p>
          )}
        </div>

        {/* Device cards */}
        {loading ? (
          <div style={{ ...hubCard, textAlign: 'center', padding: '32px 20px', color: 'var(--color-text-muted)', fontSize: 13.5 }}>Loading your devices…</div>
        ) : devices.length === 0 ? (
          <div style={{ ...hubCard, textAlign: 'center', padding: '32px 20px' }}>
            <p style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15, margin: '0 0 6px' }}>No devices registered yet</p>
            <p style={{ fontSize: 13, color: 'var(--color-text-muted)', margin: 0 }}>
              Enter the serial number from your invoice above to track its warranty{devices.length === 0 ? ' and battery health' : ''}.
            </p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }} className="hub-two-col">
            {devices.map((d) => (
              <div key={d.id} style={hubCard}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                  <h3 style={{ ...hubH3, margin: 0 }}>{d.name}</h3>
                  {d.returnWindowDaysLeft > 0 && (
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
                        background: 'var(--ke-green-50)',
                        color: 'var(--ke-green-700)',
                      }}
                    >
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'currentColor' }} />
                      RETURN WINDOW: {d.returnWindowDaysLeft}D LEFT
                    </span>
                  )}
                </div>

                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '.04em', color: 'var(--color-text-muted)', margin: '6px 0 4px' }}>
                  SN {d.serial} · PURCHASED {fmtDate(d.purchasedAt)}
                </div>
                <div style={{ fontSize: 12, color: 'var(--color-text-muted)', margin: '0 0 16px' }}>
                  {d.manufacturerWarranty ?? 'Manufacturer’s warranty applies. Terms vary by brand.'}
                </div>

                {d.hasBattery && d.batteryHealthPct !== null ? (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
                      <span>Battery health (estimated)</span>
                      <span style={{ fontWeight: 700 }}>{d.batteryHealthPct}%</span>
                    </div>
                    <div style={{ height: 8, borderRadius: 999, background: 'var(--color-border)', overflow: 'hidden', marginBottom: 6 }}>
                      <div style={{ width: `${d.batteryHealthPct}%`, height: '100%', background: 'var(--gradient-brand)' }} />
                    </div>
                    <div style={{ fontSize: 11.5, color: 'var(--color-text-muted)', marginBottom: 16 }}>
                      Modeled from typical Li-ion fade over {monthsOwnedLabel(d.purchasedAt)} of ownership, not a live sensor reading.
                    </div>
                  </>
                ) : (
                  <div style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 16 }}>
                    Owned for {monthsOwnedLabel(d.purchasedAt)}
                    {d.orderNo ? ` · Order ${d.orderNo}` : ''}
                  </div>
                )}

                {d.spec && (
                  <div style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 16 }}>{d.spec}</div>
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
        )}
      </div>
    </>
  )
}
