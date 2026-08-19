'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { PowerOff, Power, BatteryCharging, Phone, ClipboardList, Calculator, Info } from 'lucide-react'
import Topbar from '../../_components/Topbar'
import { wizardCard } from '../../energy-checkup/_components/shared'
import { Button } from '@/components/shop/ui'
import StormPrepSubNav from '../_components/SubNav'
import { computeReserve, fetchDevices, type DeviceSignal } from '../_lib/reserve'

const STORAGE_KEY = 'ke-storm-outage'

interface OutageState {
  startedAt: string | null
}

function loadOutage(): OutageState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch { /* ignore */ }
  return { startedAt: null }
}

function saveOutage(state: OutageState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch { /* ignore */ }
}

function formatDuration(ms: number): string {
  const totalMinutes = Math.floor(ms / 60000)
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  if (hours === 0) return `${minutes}m`
  return `${hours}h ${minutes}m`
}

export default function OutagePage() {
  const [outage, setOutage] = useState<OutageState>({ startedAt: null })
  const [now, setNow] = useState(() => Date.now())
  const [devices, setDevices] = useState<DeviceSignal[]>([])
  const [devicesLoaded, setDevicesLoaded] = useState(false)

  useEffect(() => {
    setOutage(loadOutage())
    fetchDevices().then(setDevices).finally(() => setDevicesLoaded(true))
  }, [])

  useEffect(() => {
    if (!outage.startedAt) return
    const id = setInterval(() => setNow(Date.now()), 30_000)
    return () => clearInterval(id)
  }, [outage.startedAt])

  function startOutage() {
    const state = { startedAt: new Date().toISOString() }
    setOutage(state)
    saveOutage(state)
  }

  function endOutage() {
    setOutage({ startedAt: null })
    saveOutage({ startedAt: null })
  }

  const { totalReserveWh } = computeReserve(devices)
  const durationMs = outage.startedAt ? now - new Date(outage.startedAt).getTime() : 0

  return (
    <>
      <Topbar title="Storm prep" subtitle="Outage mode" />
      <div className="ke-screen" style={{ padding: 32 }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <StormPrepSubNav />

          {!outage.startedAt ? (
            <div style={{ ...wizardCard, textAlign: 'center', padding: 40 }}>
              <PowerOff size={32} color="#7a2020" style={{ marginBottom: 12 }} />
              <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 20, margin: '0 0 8px' }}>Lost power?</h2>
              <p style={{ fontSize: 13.5, color: 'var(--color-text-muted)', margin: '0 0 20px', maxWidth: 420, marginLeft: 'auto', marginRight: 'auto' }}>
                Start the timer to track how long you&apos;ve been out, see your available battery reserve, and get
                straight to the tools that matter right now.
              </p>
              <Button onClick={startOutage}>Start tracking this outage</Button>
            </div>
          ) : (
            <>
              <div style={{ background: '#0d1714', borderRadius: 20, padding: 26, color: '#eaf2ec', marginBottom: 18 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
                  <div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '.14em', textTransform: 'uppercase', color: 'rgba(234,242,236,.55)' }}>
                      Outage started
                    </div>
                    <div style={{ fontSize: 13.5, marginTop: 4 }}>
                      {new Date(outage.startedAt).toLocaleString('en-JM', { hour: 'numeric', minute: '2-digit', month: 'short', day: 'numeric' })}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '.14em', textTransform: 'uppercase', color: 'rgba(234,242,236,.55)' }}>
                      Duration
                    </div>
                    <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 30, color: 'var(--ke-green-400)' }}>
                      {formatDuration(durationMs)}
                    </div>
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={endOutage} iconLeft={<Power size={14} />}>
                  Power is back
                </Button>
              </div>

              <div style={{ ...wizardCard, marginBottom: 18 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <BatteryCharging size={16} color="var(--ke-green-600)" />
                  <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 17, margin: 0 }}>Your battery reserve</h3>
                </div>
                {!devicesLoaded ? (
                  <p style={{ fontSize: 13, color: 'var(--color-text-subtle)' }}>Loading…</p>
                ) : totalReserveWh > 0 ? (
                  <>
                    <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 28, color: 'var(--ke-green-700)', margin: '6px 0 10px' }}>
                      {totalReserveWh >= 1000 ? `${(totalReserveWh / 1000).toFixed(2)} kWh` : `${Math.round(totalReserveWh)} Wh`} usable
                    </div>
                    <Link href="/hub/storm-prep/energy-budget" style={{ fontSize: 13, color: 'var(--ke-green-600)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      <Calculator size={14} /> Work out how long that needs to last →
                    </Link>
                  </>
                ) : (
                  <p style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>
                    No registered backup power found. <Link href="/hub/storm-prep/resources" style={{ color: 'var(--ke-green-600)' }}>See the storm kit</Link>.
                  </p>
                )}
              </div>
            </>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14, marginBottom: 18 }}>
            <QuickLink href="/hub/storm-prep/energy-budget" icon={Calculator} label="Energy budget" desc="Make your reserve last until a target time" />
            <QuickLink href="/hub/storm-prep/family-plan" icon={Phone} label="Emergency contacts" desc="Your saved family plan" />
            <QuickLink href="/hub/energy-checkup" icon={ClipboardList} label="What to shed first" desc="Your outage-priority breakdown" />
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, background: 'var(--ke-mist)', borderRadius: 14, padding: '14px 18px' }}>
            <Info size={15} color="var(--color-text-muted)" style={{ flexShrink: 0, marginTop: 2 }} />
            <p style={{ fontSize: 12.5, color: 'var(--color-text-muted)', margin: 0, lineHeight: 1.6 }}>
              This timer and your reserve figure live in this browser only. If your power comes back before you tap
              &quot;Power is back,&quot; the duration will keep counting up until you do.
            </p>
          </div>
        </div>
      </div>
    </>
  )
}

function QuickLink({ href, icon: Icon, label, desc }: { href: string; icon: typeof Calculator; label: string; desc: string }) {
  return (
    <Link href={href} style={{ textDecoration: 'none', color: 'inherit' }}>
      <div style={{ ...wizardCard, padding: 16, height: '100%' }}>
        <Icon size={17} color="var(--ke-green-600)" />
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14, margin: '8px 0 2px' }}>{label}</div>
        <div style={{ fontSize: 12, color: 'var(--color-text-subtle)' }}>{desc}</div>
      </div>
    </Link>
  )
}
