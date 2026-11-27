'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { CircleCheck, CircleX, TriangleAlert, CircleHelp } from 'lucide-react'
import { loadLocalProfile } from '@/lib/energy/localProfile'
import type { EnergyProfile } from '@/lib/energy/profileSchema'
import type { Range } from '@/lib/energy/engine'

/**
 * "Will this run my devices?" on a power station's product page (roadmap
 * M4). Uses the visitor's own My Energy scenario (kept in this browser) and
 * this product's catalogue evidence on the server. Specs nobody has
 * verified are reported as such — never as a pass.
 */

interface Check {
  rule: string
  status: 'pass' | 'fail' | 'marginal' | 'unknown' | 'needs_review'
  detail: string
  unverifiedEvidence: boolean
}
interface Result {
  product: { displayName: string }
  scenario: { averageWatts: Range; simultaneousWatts: number; unresolved: { name: string; message: string }[] }
  match: { status: 'pass' | 'fail' | 'needs_review'; summary: string; checks: Check[]; runtimeHours: Range | null }
}

const RULE: Record<string, string> = {
  continuous_output: 'Power for everything at once',
  surge_output: 'Starting motors (fridge, pump)',
  runtime: 'Lasts long enough',
  ac_voltage: 'Output voltage',
  ac_frequency: 'Output frequency',
  ac_waveform: 'Waveform',
  scenario_complete: 'Your equipment list',
}
const TONE = {
  pass: { Icon: CircleCheck, color: '#2f7a1f', label: 'Yes' },
  fail: { Icon: CircleX, color: '#b3261e', label: 'No' },
  marginal: { Icon: TriangleAlert, color: '#9a6700', label: 'Borderline' },
  needs_review: { Icon: TriangleAlert, color: '#9a6700', label: 'Not verified yet' },
  unknown: { Icon: CircleHelp, color: '#5f6b66', label: 'Unknown' },
} as const
const fmtH = (h: number) => (h >= 48 ? `${(h / 24).toFixed(1)} days` : `${h < 10 ? h.toFixed(1) : Math.round(h)} h`)

export default function CompatibilityCheck({ catalogId, productName }: { catalogId: string; productName: string }) {
  const [profile, setProfile] = useState<EnergyProfile | null>(null)
  const [key, setKey] = useState('')
  const [hours, setHours] = useState('8')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<Result | null>(null)

  useEffect(() => {
    const p = loadLocalProfile()
    setProfile(p)
    const first = p.properties.flatMap((pr) => pr.scenarios.map((s) => ({ pr, s }))).sort((a, b) => Number(b.s.kind === 'storm') - Number(a.s.kind === 'storm'))[0]
    if (first) {
      setKey(`${first.pr.clientId}:${first.s.clientId}`)
      if (first.s.targetHours) setHours(String(first.s.targetHours))
    }
  }, [])
  const options = useMemo(() => (profile?.properties ?? []).flatMap((p) => p.scenarios.map((s) => ({ key: `${p.clientId}:${s.clientId}`, label: `${p.name} — ${s.name}`, p, s }))), [profile])

  async function check() {
    const o = options.find((x) => x.key === key)
    const h = Number(hours)
    if (!o || !(h > 0)) return
    setBusy(true)
    setError(null)
    const res = await fetch('/api/energy/compatibility', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ catalogId, property: o.p, scenarioClientId: o.s.clientId, targetHours: h }),
    }).catch(() => null)
    const d = await res?.json().catch(() => ({}))
    setBusy(false)
    if (!res?.ok) {
      setResult(null)
      setError(d?.error ?? 'The check couldn’t run just now.')
    } else setResult(d)
  }

  const box: React.CSSProperties = { border: '1px solid var(--color-border)', borderRadius: 20, padding: 24, display: 'grid', gap: 14, background: '#fff' }
  const muted: React.CSSProperties = { color: 'var(--color-text-muted)', fontSize: 13.5, lineHeight: 1.55, margin: 0 }
  const field: React.CSSProperties = { height: 42, borderRadius: 10, border: '1px solid var(--color-border-strong, #cfd8d3)', padding: '0 12px', font: 'inherit', fontSize: 14.5, background: '#fff' }

  return (
    <section style={{ maxWidth: 1240, margin: '0 auto', padding: '8px 32px 0' }} aria-labelledby="compat-title">
      <div style={box}>
        <div>
          <h2 id="compat-title" style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 24, letterSpacing: '-.02em', margin: 0 }}>
            Will it run my devices?
          </h2>
          <p style={{ ...muted, marginTop: 6 }}>Checks {productName} against the equipment you listed in My Energy — power, motor starts and runtime.</p>
        </div>
        {profile && options.length === 0 ? (
          <p style={muted}>
            List the things you want to keep running in <Link href="/my-energy" style={{ color: 'var(--ke-green-700)', fontWeight: 600 }}>My Energy</Link> (a few minutes, no account needed), then come back to check this product.
          </p>
        ) : (
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'end' }}>
            <label style={{ display: 'grid', gap: 4, fontSize: 13, fontWeight: 600, flex: '1 1 240px' }}>
              Your scenario
              <select style={field} value={key} onChange={(e) => setKey(e.target.value)}>
                {options.map((o) => (
                  <option key={o.key} value={o.key}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
            <label style={{ display: 'grid', gap: 4, fontSize: 13, fontWeight: 600, width: 130 }}>
              For how long (h)
              <input style={field} inputMode="decimal" value={hours} onChange={(e) => setHours(e.target.value.replace(/[^\d.]/g, ''))} />
            </label>
            <button
              type="button"
              onClick={check}
              disabled={busy || !key}
              style={{ height: 42, padding: '0 18px', borderRadius: 999, border: 0, background: 'var(--ke-green-600, #2f7a1f)', color: '#fff', fontWeight: 700, fontSize: 14, cursor: busy ? 'wait' : 'pointer' }}
            >
              {busy ? 'Checking…' : 'Check'}
            </button>
          </div>
        )}
        {error && (
          <p role="status" style={{ ...muted, color: '#7a4b00' }}>
            {error}
          </p>
        )}
        {result && (
          <div aria-live="polite" style={{ display: 'grid', gap: 10 }}>
            <p style={{ margin: 0, fontWeight: 700, fontSize: 16, color: TONE[result.match.status].color }}>{result.match.summary}</p>
            {result.match.runtimeHours && (
              <p style={muted}>
                Estimated runtime {fmtH(result.match.runtimeHours.low)}–{fmtH(result.match.runtimeHours.high)} at an average of {Math.round(result.scenario.averageWatts.base)} W.
              </p>
            )}
            <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 8 }}>
              {result.match.checks.map((c) => {
                const t = TONE[c.status] ?? TONE.unknown
                return (
                  <li key={c.rule} style={{ display: 'grid', gridTemplateColumns: '22px 1fr', gap: 10, padding: '10px 12px', borderRadius: 12, background: '#f6f8f7' }}>
                    <t.Icon size={18} color={t.color} aria-hidden />
                    <div>
                      <strong style={{ fontSize: 14 }}>{RULE[c.rule] ?? c.rule}</strong> <span style={{ color: t.color, fontSize: 13, fontWeight: 600 }}>· {t.label}</span>
                      <div style={{ ...muted, fontSize: 13 }}>
                        {c.detail}
                        {c.unverifiedEvidence && ' (spec not yet verified by our team)'}
                      </div>
                    </div>
                  </li>
                )
              })}
            </ul>
            {result.scenario.unresolved.length > 0 && (
              <ul style={{ ...muted, paddingLeft: 18 }}>
                {result.scenario.unresolved.map((u) => (
                  <li key={u.name}>
                    {u.name}: {u.message} <Link href="/my-energy" style={{ color: 'var(--ke-green-700)', fontWeight: 600 }}>Add it in My Energy</Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </section>
  )
}
