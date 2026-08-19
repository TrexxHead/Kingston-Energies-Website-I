'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { CloudLightning, ExternalLink, Gauge, BatteryCharging, ClipboardList, PowerOff } from 'lucide-react'
import Topbar from '../_components/Topbar'
import { wizardCard } from '../energy-checkup/_components/shared'
import StormPrepSubNav from './_components/SubNav'
import OfflineCard from './_components/OfflineCard'
import { CATEGORY_LABEL, loadChecked, loadCachedContent, syncContent, type ChecklistCategory, type StormPrepContent } from './_lib/checklist'
import { computeReserve, fetchDevices, type DeviceSignal } from './_lib/reserve'

interface CheckupSignal {
  id: string
  mode: 'home' | 'biz'
  estimatedKwh: number
  hasBackup: boolean | null
  completedAt: string
}

export default function StormPrepDashboard() {
  const [content, setContent] = useState<StormPrepContent>(() => loadCachedContent())
  const [checked, setChecked] = useState<Set<string>>(new Set())
  const [loaded, setLoaded] = useState(false)
  const [checkup, setCheckup] = useState<CheckupSignal | null>(null)
  const [checkupLoaded, setCheckupLoaded] = useState(false)
  const [devices, setDevices] = useState<DeviceSignal[]>([])
  const [devicesLoaded, setDevicesLoaded] = useState(false)

  useEffect(() => {
    setChecked(loadChecked())
    setLoaded(true)
    syncContent().then((fresh) => {
      if (fresh) setContent(fresh)
    })
  }, [])

  useEffect(() => {
    fetch('/api/hub/energy-checkup')
      .then((r) => (r.ok ? r.json() : { checkup: null }))
      .then((d) => setCheckup(d.checkup ?? null))
      .catch(() => setCheckup(null))
      .finally(() => setCheckupLoaded(true))

    fetchDevices()
      .then(setDevices)
      .finally(() => setDevicesLoaded(true))
  }, [])

  // Counted against the current admin-edited checklist, not the raw
  // checked-id set — an id checked before an admin removed that item
  // shouldn't inflate completion against a shorter or different list.
  const done = content.checklist.filter((i) => checked.has(i.id)).length
  const pct = content.checklist.length ? Math.round((done / content.checklist.length) * 100) : 0

  const categoryPct: Record<ChecklistCategory, number> = { power: 0, light: 0, food: 0, records: 0 }
  ;(Object.keys(CATEGORY_LABEL) as ChecklistCategory[]).forEach((cat) => {
    const items = content.checklist.filter((i) => i.category === cat)
    const doneInCat = items.filter((i) => checked.has(i.id)).length
    categoryPct[cat] = items.length ? Math.round((doneInCat / items.length) * 100) : 0
  })

  // Readiness score averages only the signals we actually have real data
  // for — checklist completion, whether an Energy Checkup was ever run, and
  // whether the account has a registered power bank/station. It never
  // invents a number for dimensions (food/water, medication, comms) this
  // build doesn't track yet — those show as "not tracked yet" instead.
  const signalsLoaded = loaded && checkupLoaded && devicesLoaded
  const hasBackupDevice = devices.some((d) => d.hasBattery)
  const checkupScore = checkup ? 100 : 0
  const backupScore = hasBackupDevice ? 100 : 0
  const readinessScore = signalsLoaded ? Math.round((pct + checkupScore + backupScore) / 3) : null

  const { reserveDevices, totalReserveWh, unmeasuredBackupDevices } = computeReserve(devices)

  return (
    <>
      <Topbar title="Storm prep" subtitle="Get ready before an outage, not during one" />
      <div className="ke-screen" style={{ padding: 32 }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <div style={{ background: 'var(--gradient-deep)', borderRadius: 24, padding: 32, color: '#fff', marginBottom: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <CloudLightning size={20} color="var(--ke-green-400)" />
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '.24em', color: 'var(--ke-green-400)', textTransform: 'uppercase' }}>
                Storm &amp; outage prep
              </span>
            </div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 30, lineHeight: 1.1, margin: '10px 0 8px' }}>
              A checklist, not a scramble
            </h1>
            <p style={{ fontSize: 14.5, color: 'rgba(234,242,236,.75)', maxWidth: 560, lineHeight: 1.6, margin: 0 }}>
              Jamaica&apos;s Atlantic hurricane season runs June 1 through November 30. Most of what actually helps
              during an outage takes five minutes and needs to happen before the power goes, not after.
            </p>
            <p style={{ fontSize: 12.5, color: 'rgba(234,242,236,.55)', marginTop: 14 }}>
              For active watches and warnings, follow{' '}
              <a href="https://www.odpem.org.jm/" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--ke-green-400)' }}>
                ODPEM <ExternalLink size={11} style={{ display: 'inline', verticalAlign: '-1px' }} />
              </a>{' '}
              — this page is prep guidance, not a live weather alert.
            </p>
          </div>

          <Link href="/hub/storm-prep/outage" style={{ textDecoration: 'none' }}>
            <div
              style={{
                display: 'flex', alignItems: 'center', gap: 12, background: '#7a2020', borderRadius: 18, padding: '16px 22px',
                marginBottom: 18, cursor: 'pointer', transition: 'transform .15s ease',
              }}
            >
              <PowerOff size={22} color="#fff" style={{ flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 16, color: '#fff' }}>I HAVE LOST POWER</div>
                <div style={{ fontSize: 12.5, color: 'rgba(255,255,255,.75)' }}>Start tracking your outage — battery status, runtime, and what to do next</div>
              </div>
            </div>
          </Link>

          <StormPrepSubNav />

          <OfflineCard />

          <div style={{ ...wizardCard, marginBottom: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <Gauge size={16} color="var(--ke-green-600)" />
              <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 17, margin: 0 }}>Your storm readiness</h3>
            </div>
            <p style={{ fontSize: 13, color: 'var(--color-text-muted)', margin: '6px 0 18px', maxWidth: 560 }}>
              Built from what we actually know about your account — checklist progress, whether you&apos;ve run an
              Energy Checkup, and any backup power you&apos;ve registered. Nothing here is guessed.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
              <div style={{ border: '1px solid var(--color-border)', borderRadius: 14, padding: 16 }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--color-text-subtle)' }}>
                  Overall
                </div>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 34, margin: '6px 0 2px', color: 'var(--ke-green-700)' }}>
                  {readinessScore === null ? '—' : `${readinessScore}%`}
                </div>
                <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                  {readinessScore === null ? 'Loading…' : 'Checklist + checkup + backup power'}
                </div>
              </div>

              <Link href="/hub/storm-prep/checklist" style={{ textDecoration: 'none', color: 'inherit' }}>
                <div style={{ border: '1px solid var(--color-border)', borderRadius: 14, padding: 16, height: '100%' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <ClipboardList size={13} color="var(--color-text-muted)" />
                    <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>Checklist</span>
                  </div>
                  <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 22, margin: '6px 0 2px' }}>{pct}%</div>
                  <div style={{ fontSize: 12, color: 'var(--color-text-subtle)' }}>{done} of {content.checklist.length} items done</div>
                </div>
              </Link>

              <div style={{ border: '1px solid var(--color-border)', borderRadius: 14, padding: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Gauge size={13} color="var(--color-text-muted)" />
                  <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>Energy checkup</span>
                </div>
                {!checkupLoaded ? (
                  <div style={{ fontSize: 13, color: 'var(--color-text-subtle)', marginTop: 10 }}>Loading…</div>
                ) : checkup ? (
                  <>
                    <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 22, margin: '6px 0 2px', color: 'var(--ke-green-600)' }}>Done</div>
                    <div style={{ fontSize: 12, color: 'var(--color-text-subtle)' }}>~{Math.round(checkup.estimatedKwh)} kWh/mo estimated</div>
                  </>
                ) : (
                  <>
                    <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 22, margin: '6px 0 2px', color: 'var(--color-text-subtle)' }}>Not done</div>
                    <Link href="/hub/energy-checkup" style={{ fontSize: 12, color: 'var(--ke-green-600)', textDecoration: 'none' }}>Run it →</Link>
                  </>
                )}
              </div>

              <div style={{ border: '1px solid var(--color-border)', borderRadius: 14, padding: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <BatteryCharging size={13} color="var(--color-text-muted)" />
                  <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>Backup power</span>
                </div>
                {!devicesLoaded ? (
                  <div style={{ fontSize: 13, color: 'var(--color-text-subtle)', marginTop: 10 }}>Loading…</div>
                ) : hasBackupDevice ? (
                  <>
                    <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 22, margin: '6px 0 2px', color: 'var(--ke-green-600)' }}>Registered</div>
                    <Link href="/hub/devices" style={{ fontSize: 12, color: 'var(--ke-green-600)', textDecoration: 'none' }}>View devices →</Link>
                  </>
                ) : (
                  <>
                    <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 22, margin: '6px 0 2px', color: 'var(--color-text-subtle)' }}>None found</div>
                    <Link href="/hub/storm-prep/resources" style={{ fontSize: 12, color: 'var(--ke-green-600)', textDecoration: 'none' }}>See the kit →</Link>
                  </>
                )}
              </div>
            </div>

            <div style={{ marginTop: 18, paddingTop: 16, borderTop: '1px solid var(--color-border)' }}>
              <div style={{ fontSize: 11.5, fontFamily: 'var(--font-mono)', letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--color-text-subtle)', marginBottom: 10 }}>
                Checklist by category
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {(Object.keys(CATEGORY_LABEL) as ChecklistCategory[]).map((cat) => (
                  <div key={cat} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 12.5, color: 'var(--color-text-muted)', width: 130, flexShrink: 0 }}>{CATEGORY_LABEL[cat]}</span>
                    <div style={{ flex: 1, height: 6, borderRadius: 999, background: 'var(--ke-gray-100)', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${categoryPct[cat]}%`, background: 'var(--ke-green-500)', transition: 'width .4s var(--ease-out)' }} />
                    </div>
                    <span style={{ fontSize: 12, color: 'var(--color-text-subtle)', width: 34, textAlign: 'right', flexShrink: 0 }}>{categoryPct[cat]}%</span>
                  </div>
                ))}
                <div style={{ fontSize: 11.5, color: 'var(--color-text-subtle)', marginTop: 4 }}>
                  Food/water, medication and communications tracking aren&apos;t built yet — not shown rather than guessed.
                </div>
              </div>
            </div>
          </div>

          {devicesLoaded && devices.length > 0 && (
            <div style={wizardCard}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <BatteryCharging size={16} color="var(--ke-green-600)" />
                <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 17, margin: 0 }}>Household energy reserve</h3>
              </div>
              <p style={{ fontSize: 13, color: 'var(--color-text-muted)', margin: '6px 0 16px', maxWidth: 560 }}>
                Usable capacity across everything you&apos;ve registered under{' '}
                <Link href="/hub/devices" style={{ color: 'var(--ke-green-600)' }}>My devices</Link>, after real-world
                battery losses — not the raw advertised total.
              </p>

              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 14 }}>
                <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 30, color: 'var(--ke-green-700)' }}>
                  {totalReserveWh >= 1000 ? `${(totalReserveWh / 1000).toFixed(2)} kWh` : `${Math.round(totalReserveWh)} Wh`}
                </span>
                <span style={{ fontSize: 12.5, color: 'var(--color-text-muted)' }}>
                  usable, across {reserveDevices.length} registered device{reserveDevices.length === 1 ? '' : 's'}
                </span>
              </div>

              {reserveDevices.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: unmeasuredBackupDevices.length ? 14 : 0 }}>
                  {reserveDevices.map((d, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, color: 'var(--color-text-muted)' }}>
                      <span>{d.name}</span>
                      <span style={{ fontVariantNumeric: 'tabular-nums' }}>≈{Math.round(d.usableWh ?? 0)} Wh usable</span>
                    </div>
                  ))}
                </div>
              )}

              {unmeasuredBackupDevices.length > 0 && (
                <p style={{ fontSize: 11.5, color: 'var(--color-text-subtle)', margin: 0 }}>
                  {unmeasuredBackupDevices.map((d) => d.name).join(', ')} {unmeasuredBackupDevices.length === 1 ? 'has' : 'have'} a
                  battery but no listed capacity spec, so {unmeasuredBackupDevices.length === 1 ? "it's" : "they're"} not counted in
                  the total above rather than guessed at.
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
