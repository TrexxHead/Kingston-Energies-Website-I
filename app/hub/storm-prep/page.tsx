'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { CloudLightning, Check, ExternalLink, ShoppingBag, Gauge, BatteryCharging, ClipboardList } from 'lucide-react'
import Topbar from '../_components/Topbar'
import { wizardCard } from '../energy-checkup/_components/shared'
import { CATALOG, fmt, type Product } from '@/lib/catalog'
import { useCart } from '@/components/cart/CartContext'
import { useToast } from '@/components/cart/ToastContext'
import { Button, Badge } from '@/components/shop/ui'

const STORAGE_KEY = 'ke-storm-checklist'

type ChecklistCategory = 'power' | 'light' | 'food' | 'records'

interface ChecklistItem {
  id: string
  text: string
  category: ChecklistCategory
}

const CHECKLIST: ChecklistItem[] = [
  { id: 'powerbanks', text: 'Charge every power bank to 100%', category: 'power' },
  { id: 'station', text: 'Charge your power station (if you have one) to 100%', category: 'power' },
  { id: 'devices', text: 'Charge phones, laptops and any medical devices to 100%', category: 'power' },
  { id: 'light', text: 'Have a flashlight or lantern ready — don’t rely on a phone screen for hours of light', category: 'light' },
  { id: 'cables', text: 'Keep charging cables and adapters together in one bag, not scattered around the house', category: 'power' },
  { id: 'fridge', text: 'Set the fridge/freezer as cold as it goes now — it holds temperature far longer once the power cuts', category: 'food' },
  { id: 'unplug', text: 'Know what you’ll unplug first to stretch a power station’s runtime (AC and water heating first)', category: 'power' },
  { id: 'records', text: 'Save your order numbers and warranty info somewhere you can reach offline', category: 'records' },
]

const CATEGORY_LABEL: Record<ChecklistCategory, string> = {
  power: 'Power & charging',
  light: 'Light',
  food: 'Food & cooling',
  records: 'Records',
}

interface CheckupSignal {
  id: string
  mode: 'home' | 'biz'
  estimatedKwh: number
  hasBackup: boolean | null
  completedAt: string
}

interface DeviceSignal {
  name: string
  hasBattery: boolean
  usableWh: number | null
}

// The catalog's own picks for a storm kit — real products, real prices, no
// invented "kit" SKU. Kept to a short, deliberately chosen list rather than
// every power bank/station in the catalog.
const KIT_PRODUCT_IDS = ['pb10', 'st300', 'chcab']

export default function StormPrepPage() {
  const { addItem } = useCart()
  const { pushToast } = useToast()
  const [checked, setChecked] = useState<Set<string>>(new Set())
  const [loaded, setLoaded] = useState(false)
  const [checkup, setCheckup] = useState<CheckupSignal | null>(null)
  const [checkupLoaded, setCheckupLoaded] = useState(false)
  const [devices, setDevices] = useState<DeviceSignal[]>([])
  const [devicesLoaded, setDevicesLoaded] = useState(false)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) setChecked(new Set(JSON.parse(raw)))
    } catch { /* ignore */ }
    setLoaded(true)
  }, [])

  useEffect(() => {
    fetch('/api/hub/energy-checkup')
      .then((r) => (r.ok ? r.json() : { checkup: null }))
      .then((d) => setCheckup(d.checkup ?? null))
      .catch(() => setCheckup(null))
      .finally(() => setCheckupLoaded(true))

    fetch('/api/hub/devices')
      .then((r) => (r.ok ? r.json() : { devices: [] }))
      .then((d: { devices: DeviceSignal[] }) => setDevices(d.devices ?? []))
      .catch(() => setDevices([]))
      .finally(() => setDevicesLoaded(true))
  }, [])

  useEffect(() => {
    if (!loaded) return
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...checked]))
    } catch { /* ignore */ }
  }, [checked, loaded])

  function toggle(id: string) {
    setChecked((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const done = checked.size
  const pct = Math.round((done / CHECKLIST.length) * 100)

  const categoryPct: Record<ChecklistCategory, number> = { power: 0, light: 0, food: 0, records: 0 }
  ;(Object.keys(CATEGORY_LABEL) as ChecklistCategory[]).forEach((cat) => {
    const items = CHECKLIST.filter((i) => i.category === cat)
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

  // Household energy reserve — total usable Wh across every registered
  // device with a known real capacity spec. Devices with no derivable
  // capacity (e.g. a power station with no listed Wh) are counted separately
  // rather than silently dropped, so the total is never presented as
  // "everything you own" when it's really "everything we can measure."
  const reserveDevices = devices.filter((d) => d.usableWh !== null)
  const totalReserveWh = reserveDevices.reduce((sum, d) => sum + (d.usableWh ?? 0), 0)
  const unmeasuredBackupDevices = devices.filter((d) => d.hasBattery && d.usableWh === null)

  const kitItems = KIT_PRODUCT_IDS.map((id) => CATALOG.find((p) => p.id === id)).filter((p): p is Product => Boolean(p))

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

              <div style={{ border: '1px solid var(--color-border)', borderRadius: 14, padding: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <ClipboardList size={13} color="var(--color-text-muted)" />
                  <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>Checklist</span>
                </div>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 22, margin: '6px 0 2px' }}>{pct}%</div>
                <div style={{ fontSize: 12, color: 'var(--color-text-subtle)' }}>{done} of {CHECKLIST.length} items done</div>
              </div>

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
                    <div style={{ fontSize: 12, color: 'var(--color-text-subtle)' }}>See the kit below</div>
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
            <div style={{ ...wizardCard, marginBottom: 18 }}>
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

          <div style={{ ...wizardCard, marginBottom: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4, flexWrap: 'wrap', gap: 8 }}>
              <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 17, margin: 0 }}>Before the power goes</h3>
              <Badge tone={pct === 100 ? 'green' : 'neutral'}>{done} of {CHECKLIST.length} done</Badge>
            </div>
            <div style={{ height: 8, borderRadius: 999, background: 'var(--ke-gray-100)', overflow: 'hidden', margin: '12px 0 18px' }}>
              <div style={{ height: '100%', width: `${pct}%`, background: 'var(--ke-green-500)', transition: 'width .4s var(--ease-out)' }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {CHECKLIST.map((item) => {
                const isChecked = checked.has(item.id)
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => toggle(item.id)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left',
                      padding: '10px 8px', borderRadius: 10, border: 'none', cursor: 'pointer',
                      background: 'transparent',
                    }}
                  >
                    <span
                      style={{
                        width: 20, height: 20, borderRadius: 6, flexShrink: 0,
                        border: isChecked ? 'none' : '1.5px solid var(--color-border-strong)',
                        background: isChecked ? 'var(--ke-green-500)' : '#fff',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}
                    >
                      {isChecked && <Check size={13} color="#fff" />}
                    </span>
                    <span style={{ fontSize: 13.5, lineHeight: 1.5, color: isChecked ? 'var(--color-text-muted)' : 'var(--color-text)', textDecoration: isChecked ? 'line-through' : 'none' }}>
                      {item.text}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          <div style={wizardCard}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <ShoppingBag size={16} color="var(--ke-green-600)" />
              <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 17, margin: 0 }}>Not ready yet?</h3>
            </div>
            <p style={{ fontSize: 13, color: 'var(--color-text-muted)', margin: '6px 0 16px', maxWidth: 560 }}>
              The core of a storm kit — one to charge phones on the go, one to keep bigger essentials running, one to
              keep everything connected.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
              {kitItems.map((p) => (
                <div key={p.id} style={{ border: '1px solid var(--color-border)', borderRadius: 14, padding: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div>
                    <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14 }}>{p.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 2 }}>{fmt(p.price)}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 'auto' }}>
                    <Link href={`/product/${p.id}`} style={{ flex: 1, textDecoration: 'none' }}>
                      <Button size="sm" variant="outline" block>View</Button>
                    </Link>
                    <Button
                      size="sm"
                      onClick={() => {
                        addItem({ name: p.name, price: p.price, spec: p.spec })
                        pushToast('check', 'Added to cart', p.name)
                      }}
                    >
                      Add
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
