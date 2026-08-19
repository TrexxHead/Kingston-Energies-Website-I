'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Phone, BatteryCharging, ClipboardList, PowerOff, Power, MapPin } from 'lucide-react'
import Topbar from '../../_components/Topbar'
import { computeReserve, fetchDevices, type DeviceSignal } from '../_lib/reserve'
import { loadChecked, CHECKLIST, loadCachedContent } from '../_lib/checklist'

const OUTAGE_KEY = 'ke-storm-outage'

interface OutageState {
  startedAt: string | null
}

function loadOutage(): OutageState {
  try {
    const raw = localStorage.getItem(OUTAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch { /* ignore */ }
  return { startedAt: null }
}

function formatDuration(ms: number): string {
  const totalMinutes = Math.floor(ms / 60000)
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  if (hours === 0) return `${minutes}m`
  return `${hours}h ${minutes}m`
}

/**
 * Storm Command Centre — the one screen meant to be used DURING an event:
 * big tap targets, dark/low-glare background (kinder to phone battery and
 * eyes at night), and only the handful of things that matter in the
 * moment — outage status, remaining reserve, emergency numbers, and what's
 * left on the checklist. Everything here reads from state other pages
 * already maintain; nothing new is tracked just for this screen.
 */
export default function CommandCentrePage() {
  const [outage, setOutage] = useState<OutageState>({ startedAt: null })
  const [now, setNow] = useState(() => Date.now())
  const [devices, setDevices] = useState<DeviceSignal[]>([])
  const [devicesLoaded, setDevicesLoaded] = useState(false)
  const [checkedCount, setCheckedCount] = useState(0)

  useEffect(() => {
    setOutage(loadOutage())
    setCheckedCount(loadChecked().size)
    fetchDevices().then(setDevices).finally(() => setDevicesLoaded(true))
  }, [])

  useEffect(() => {
    if (!outage.startedAt) return
    const id = setInterval(() => setNow(Date.now()), 30_000)
    return () => clearInterval(id)
  }, [outage.startedAt])

  function toggleOutage() {
    if (outage.startedAt) {
      setOutage({ startedAt: null })
      localStorage.setItem(OUTAGE_KEY, JSON.stringify({ startedAt: null }))
    } else {
      const state = { startedAt: new Date().toISOString() }
      setOutage(state)
      localStorage.setItem(OUTAGE_KEY, JSON.stringify(state))
    }
  }

  const { totalReserveWh } = computeReserve(devices)
  const EMERGENCY_NUMBERS = loadCachedContent().directory.filter((d) => d.phone)
  const durationMs = outage.startedAt ? now - new Date(outage.startedAt).getTime() : 0
  const remainingChecklist = CHECKLIST.length - checkedCount

  return (
    <>
      <Topbar title="Storm prep" subtitle="Command centre" />
      <div style={{ minHeight: '100vh', background: '#0a0f0d', color: '#eaf2ec', padding: 24 }}>
        <div style={{ maxWidth: 640, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 20 }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '.24em', textTransform: 'uppercase', color: 'rgba(234,242,236,.5)' }}>
              Storm command centre
            </div>
            <p style={{ fontSize: 12.5, color: 'rgba(234,242,236,.55)', margin: '6px 0 0' }}>
              Big buttons, dark screen — built for during the event, not before it.
            </p>
          </div>

          <button
            type="button"
            onClick={toggleOutage}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: 16, padding: 22,
              borderRadius: 20, border: 'none', cursor: 'pointer', marginBottom: 16,
              background: outage.startedAt ? '#1a2e22' : '#7a2020', color: '#fff',
            }}
          >
            {outage.startedAt ? <Power size={30} /> : <PowerOff size={30} />}
            <div style={{ textAlign: 'left', flex: 1 }}>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 18 }}>
                {outage.startedAt ? 'Power is back' : 'I HAVE LOST POWER'}
              </div>
              <div style={{ fontSize: 12.5, opacity: 0.8 }}>
                {outage.startedAt ? `Outage running — ${formatDuration(durationMs)}` : 'Tap to start tracking'}
              </div>
            </div>
          </button>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
            <div style={{ background: '#111a16', borderRadius: 16, padding: 18 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                <BatteryCharging size={14} color="var(--ke-green-400)" />
                <span style={{ fontSize: 11, color: 'rgba(234,242,236,.6)' }}>Reserve</span>
              </div>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 22 }}>
                {!devicesLoaded ? '—' : totalReserveWh >= 1000 ? `${(totalReserveWh / 1000).toFixed(1)} kWh` : `${Math.round(totalReserveWh)} Wh`}
              </div>
              <Link href="/hub/storm-prep/energy-budget" style={{ fontSize: 11.5, color: 'var(--ke-green-400)' }}>Budget it →</Link>
            </div>
            <div style={{ background: '#111a16', borderRadius: 16, padding: 18 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                <ClipboardList size={14} color="var(--ke-green-400)" />
                <span style={{ fontSize: 11, color: 'rgba(234,242,236,.6)' }}>Checklist left</span>
              </div>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 22 }}>{remainingChecklist}</div>
              <Link href="/hub/storm-prep/checklist" style={{ fontSize: 11.5, color: 'var(--ke-green-400)' }}>Open →</Link>
            </div>
          </div>

          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, letterSpacing: '.14em', textTransform: 'uppercase', color: 'rgba(234,242,236,.5)', margin: '4px 0 10px' }}>
            Emergency numbers
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
            {EMERGENCY_NUMBERS.map((n) => (
              <a
                key={n.name}
                href={`tel:${n.phone}`}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', textDecoration: 'none', color: '#fff',
                  background: '#1a2e22', borderRadius: 16, padding: '16px 20px',
                }}
              >
                <span style={{ fontSize: 15, fontWeight: 600 }}>{n.name}</span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 20, color: 'var(--ke-green-400)' }}>
                  <Phone size={16} /> {n.phone}
                </span>
              </a>
            ))}
            <Link
              href="/hub/storm-prep/directory"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, textDecoration: 'none', color: 'rgba(234,242,236,.7)', padding: '10px 0', fontSize: 12.5 }}
            >
              <MapPin size={13} /> Full resource directory →
            </Link>
          </div>
        </div>
      </div>
    </>
  )
}
