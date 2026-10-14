'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Plus, Trash2 } from 'lucide-react'
import { card, label, input, muted, h2, fmt, StatusTag, BasisChip } from '@/app/my-energy/_components/ui'
import { loadLocalProfile } from '@/lib/energy/localProfile'
import { scenarioDevices, type EnergyProfile } from '@/lib/energy/profileSchema'
import { backupEstimate, quickDevices, type QuickLoad } from '@/lib/storm/backup'
import type { CapacityBasis, ScenarioDevice } from '@/lib/energy/engine'

/**
 * "How long will my backup last?" — the visitor's own devices (from My
 * Energy, or typed in here) against a battery's label figures. Devices
 * without a wattage stay listed but out of the totals.
 */

const KEY = 'ke-storm-ready-backup-v1'
const num = (v: string) => (v.trim() === '' ? null : Number(v.replace(/,/g, '')))
const newRow = (): QuickLoad & { w: string; h: string } => ({ id: Math.random().toString(36).slice(2, 10), name: '', watts: null, hoursPerDay: null, quantity: 1, motor: false, w: '', h: '' })
type Row = ReturnType<typeof newRow>

function hoursText(h: number): string {
  if (h >= 48) return `${fmt(h / 24, 1)} days`
  return `${fmt(h, h < 10 ? 1 : 0)} h`
}

export default function BackupRuntime() {
  const [profile, setProfile] = useState<EnergyProfile | null>(null)
  const [source, setSource] = useState<string>('quick')
  const [rows, setRows] = useState<Row[]>([{ ...newRow(), name: 'Fridge', motor: true }, { ...newRow(), name: 'Lights' }, { ...newRow(), name: 'Phone charging' }])
  const [cap, setCap] = useState('')
  const [basis, setBasis] = useState<CapacityBasis>('nominal')
  const [path, setPath] = useState<'ac' | 'dc'>('ac')
  const [cont, setCont] = useState('')
  const [surge, setSurge] = useState('')
  const [reserve, setReserve] = useState('10')

  useEffect(() => {
    const p = loadLocalProfile()
    setProfile(p)
    // Prefer a storm scenario the visitor already built in My Energy.
    for (const prop of p.properties) {
      const s = prop.scenarios.find((x) => x.kind === 'storm') ?? null
      if (s) {
        setSource(`${prop.clientId}:${s.clientId}`)
        break
      }
    }
    try {
      const saved = JSON.parse(localStorage.getItem(KEY) ?? 'null')
      if (saved && Array.isArray(saved.rows)) {
        setRows(saved.rows)
        setCap(saved.cap ?? '')
        setBasis(saved.basis ?? 'nominal')
        setPath(saved.path ?? 'ac')
        setCont(saved.cont ?? '')
        setSurge(saved.surge ?? '')
        setReserve(saved.reserve ?? '10')
      }
    } catch {
      /* storage unavailable */
    }
  }, [])
  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify({ rows, cap, basis, path, cont, surge, reserve }))
    } catch {
      /* ignore */
    }
  }, [rows, cap, basis, path, cont, surge, reserve])

  const scenarios = useMemo(() => (profile?.properties ?? []).flatMap((p) => p.scenarios.map((s) => ({ key: `${p.clientId}:${s.clientId}`, label: `${p.name} — ${s.name}`, prop: p, s }))), [profile])

  const devices: ScenarioDevice[] = useMemo(() => {
    if (source !== 'quick') {
      const sc = scenarios.find((x) => x.key === source)
      if (sc) return scenarioDevices(sc.prop, sc.s)
    }
    return quickDevices(rows.map((r) => ({ ...r, watts: num(r.w), hoursPerDay: num(r.h) })))
  }, [source, scenarios, rows])

  const result = useMemo(
    () =>
      backupEstimate(devices, {
        capacityWh: num(cap) ?? 0,
        capacityBasis: basis,
        outputPath: path,
        continuousWatts: num(cont) ?? undefined,
        surgeWatts: num(surge) ?? undefined,
        reserveFraction: Math.min(90, Math.max(0, num(reserve) ?? 0)) / 100,
      }),
    [devices, cap, basis, path, cont, surge, reserve],
  )

  const setRow = (id: string, patch: Partial<Row>) => setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)))
  const digits = (v: string) => v.replace(/[^\d.,]/g, '')

  return (
    <section style={{ ...card, display: 'grid', gap: 16 }} aria-labelledby="br-title">
      <div>
        <h2 id="br-title" style={h2}>How long will my backup last?</h2>
        <p style={{ ...muted, margin: '6px 0 0' }}>Use the numbers on your devices’ labels and on your battery or power station. Anything you don’t know stays out of the result — we won’t fill it in.</p>
      </div>

      <div className="ke-sr-two">
        <div style={{ display: 'grid', gap: 10, alignContent: 'start' }}>
          <h3 className="ke-sr-h3">What you want to keep running</h3>
          {scenarios.length > 0 && (
            <div>
              <label htmlFor="br-src" style={label}>Devices from</label>
              <select id="br-src" style={input} value={source} onChange={(e) => setSource(e.target.value)}>
                <option value="quick">A quick list (below)</option>
                {scenarios.map((s) => (
                  <option key={s.key} value={s.key}>
                    My Energy: {s.label}
                  </option>
                ))}
              </select>
            </div>
          )}
          {source === 'quick' ? (
            <>
              <div className="ke-sr-rows" role="table" aria-label="Devices">
                <div className="ke-sr-row ke-sr-row--head" role="row">
                  <span role="columnheader">Device</span>
                  <span role="columnheader">Watts</span>
                  <span role="columnheader">Hours / day</span>
                  <span role="columnheader">Qty</span>
                  <span role="columnheader">
                    <span className="sr-only">Remove</span>
                  </span>
                </div>
                {rows.map((r) => (
                  <div key={r.id} className="ke-sr-row" role="row">
                    <input aria-label="Device name" style={input} value={r.name} onChange={(e) => setRow(r.id, { name: e.target.value.slice(0, 60) })} placeholder="e.g. Fan" />
                    <input aria-label={`${r.name || 'Device'} watts`} style={input} inputMode="decimal" value={r.w} onChange={(e) => setRow(r.id, { w: digits(e.target.value) })} placeholder="label" />
                    <input aria-label={`${r.name || 'Device'} hours per day`} style={input} inputMode="decimal" value={r.h} onChange={(e) => setRow(r.id, { h: digits(e.target.value) })} placeholder="h" />
                    <input aria-label={`${r.name || 'Device'} quantity`} style={input} inputMode="numeric" value={String(r.quantity)} onChange={(e) => setRow(r.id, { quantity: Math.min(50, Number(e.target.value.replace(/\D/g, '')) || 0) })} />
                    <button type="button" className="ke-sr-icon" aria-label={`Remove ${r.name || 'device'}`} onClick={() => setRows((rs) => rs.filter((x) => x.id !== r.id))}>
                      <Trash2 size={15} aria-hidden />
                    </button>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'center' }}>
                <button type="button" className="ke-sr-link" onClick={() => setRows((rs) => (rs.length < 20 ? [...rs, newRow()] : rs))}>
                  <Plus size={14} aria-hidden /> Add a device
                </button>
                <span style={{ ...muted, fontSize: 12.5 }}>
                  For fridges and freezers, hours/day is how long the compressor runs — often about half the day. <Link href="/my-energy" className="ke-sr-link">My Energy</Link> models them more precisely.
                </span>
              </div>
              <div role="group" aria-label="Devices with a motor" style={{ ...muted, display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                <span>Has a motor (fridge, pump, AC):</span>
                {rows.filter((r) => r.name.trim()).map((r) => (
                  <span key={r.id} style={{ display: 'inline-flex', gap: 4, alignItems: 'center' }}>
                    <input type="checkbox" checked={r.motor} onChange={(e) => setRow(r.id, { motor: e.target.checked })} aria-label={`${r.name} has a motor`} /> {r.name}
                  </span>
                ))}
              </div>
            </>
          ) : (
            <p style={{ ...muted, margin: 0 }}>
              Using {devices.length} device{devices.length === 1 ? '' : 's'} from your My Energy scenario. <Link href="/my-energy" className="ke-sr-link">Edit in My Energy</Link>
            </p>
          )}
        </div>

        <div style={{ display: 'grid', gap: 10, alignContent: 'start' }}>
          <h3 className="ke-sr-h3">Your battery or power station</h3>
          <div>
            <label htmlFor="br-cap" style={label}>Capacity (Wh)</label>
            <input id="br-cap" style={input} inputMode="decimal" placeholder="On the label, e.g. 1,024 Wh" value={cap} onChange={(e) => setCap(digits(e.target.value))} />
          </div>
          <div>
            <label htmlFor="br-basis" style={label}>What that figure is</label>
            <select id="br-basis" style={input} value={basis} onChange={(e) => setBasis(e.target.value as CapacityBasis)}>
              <option value="nominal">The capacity printed on the box (usual)</option>
              <option value="usable_dc">The maker’s “usable” capacity</option>
              <option value="delivered_ac_measured">What I measured at the AC outlet</option>
            </select>
          </div>
          <div>
            <span style={label}>Devices plug into</span>
            <div style={{ display: 'flex', gap: 14 }}>
              {(['ac', 'dc'] as const).map((p) => (
                <label key={p} style={{ display: 'inline-flex', gap: 6, alignItems: 'center', color: 'var(--ke-dark-text)', fontSize: 14 }}>
                  <input type="radio" name="br-path" checked={path === p} onChange={() => setPath(p)} /> {p === 'ac' ? 'The AC sockets' : 'USB / 12 V (DC)'}
                </label>
              ))}
            </div>
          </div>
          <div className="ke-sr-pair">
            <div>
              <label htmlFor="br-cont" style={label}>Rated output (W)</label>
              <input id="br-cont" style={input} inputMode="decimal" placeholder="Optional" value={cont} onChange={(e) => setCont(digits(e.target.value))} />
            </div>
            <div>
              <label htmlFor="br-surge" style={label}>Surge / peak (W)</label>
              <input id="br-surge" style={input} inputMode="decimal" placeholder="Optional" value={surge} onChange={(e) => setSurge(digits(e.target.value))} />
            </div>
          </div>
          <div>
            <label htmlFor="br-res" style={label}>Keep in reserve (%)</label>
            <input id="br-res" style={input} inputMode="numeric" value={reserve} onChange={(e) => setReserve(e.target.value.replace(/\D/g, '').slice(0, 2))} />
          </div>
        </div>
      </div>

      <div className="ke-sr-result" aria-live="polite">
        {!result.ok ? (
          <p style={{ ...muted, margin: 0 }}>{result.message}</p>
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
              <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 'clamp(30px,5vw,44px)', color: '#fff', letterSpacing: '-.02em' }}>
                {hoursText(result.value.hours.low)} – {hoursText(result.value.hours.high)}
              </span>
              <span style={{ ...muted }}>most likely about {hoursText(result.value.hours.base)}</span>
              <BasisChip basis={result.basis} />
            </div>
            <p style={{ ...muted, margin: 0 }}>
              Average draw {fmt(result.value.totals.averageWatts.base, 0)} W ({fmt(result.value.totals.kwhPerDay.base, 2)} kWh a day) from about {fmt(result.value.runtime.deliverableWh.base, 0)} Wh you can actually use.
            </p>
            <div className="ke-sr-checks">
              <div>
                <span className="ke-sr-check-label">Can it power everything at once?</span>
                <StatusTag status={result.value.continuous.status} />
                <small style={muted}>{result.value.continuous.detail}{result.value.continuous.status === 'unknown' && ' Enter the rated output to check.'}</small>
              </div>
              <div>
                <span className="ke-sr-check-label">Can it start the motors?</span>
                <StatusTag status={result.value.surge.status} />
                <small style={muted}>{result.value.surge.detail}</small>
              </div>
            </div>
            {result.value.totals.unresolved.length > 0 && (
              <p className="ke-sr-note">Not counted yet (needs watts and hours): {result.value.totals.unresolved.map((u) => u.name).join(', ')}.</p>
            )}
            <details>
              <summary className="ke-sr-link" style={{ cursor: 'pointer' }}>Assumptions and notes</summary>
              <ul style={{ ...muted, fontSize: 12.5, margin: '8px 0 0', paddingLeft: 18 }}>
                {result.assumptions.map((a) => (
                  <li key={a.id}>
                    {a.description}
                    {a.value != null && <> ({a.value})</>}
                  </li>
                ))}
                {result.warnings.map((w) => (
                  <li key={w}>{w}</li>
                ))}
              </ul>
            </details>
          </>
        )}
      </div>
    </section>
  )
}
