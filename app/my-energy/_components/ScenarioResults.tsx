'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { ChevronDown } from 'lucide-react'
import { evaluateScenario, type Range, type ScenarioTotals } from '@/lib/energy/engine'
import { scenarioDevices, type ProfileProperty, type ProfileScenario } from '@/lib/energy/profileSchema'
import { card, muted, h2, Btn, BasisChip, StatusTag, fmt, type StatusWord } from './ui'

interface MatchCheck {
  rule: string
  status: StatusWord
  detail: string
  unverifiedEvidence: boolean
}
interface Match {
  skuId: string
  catalogId: string | null
  displayName: string
  status: 'pass' | 'fail' | 'needs_review'
  summary: string
  checks: MatchCheck[]
  runtimeHours: Range | null
}
interface ServerResult {
  engineVersion: string
  inputHash: string
  savedRunId: string | null
  matches: Match[]
  catalogueNote: string | null
}

const RULE_LABEL: Record<string, string> = {
  continuous_output: 'Continuous output',
  surge_output: 'Startup surge',
  runtime: 'Runtime',
  ac_voltage: 'Output voltage',
  ac_frequency: 'Output frequency',
  ac_waveform: 'Waveform',
  scenario_complete: 'Your equipment list',
}

const r = (x: Range, d = 1) => `${fmt(x.low, d)}–${fmt(x.high, d)}`

function Stat({ title, value, note }: { title: string; value: string; note: string }) {
  return (
    <div style={{ padding: 16, borderRadius: 14, border: '1px solid var(--ke-dark-hairline)' }}>
      <div style={{ ...muted, fontSize: 12, fontFamily: 'var(--font-mono)', letterSpacing: '.08em', textTransform: 'uppercase' }}>{title}</div>
      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 22, color: '#fff', marginTop: 6 }}>{value}</div>
      <div style={{ ...muted, fontSize: 12.5, marginTop: 4 }}>{note}</div>
    </div>
  )
}

export default function ScenarioResults({ property, scenario, signedIn }: { property: ProfileProperty; scenario: ProfileScenario; signedIn: boolean }) {
  const result = useMemo(() => evaluateScenario(scenarioDevices(property, scenario)), [property, scenario])
  const [server, setServer] = useState<ServerResult | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!result.ok) return <p role="alert">{result.message}</p>
  const t: ScenarioTotals = result.value
  const hasDevices = t.devices.length > 0

  // Energy the target needs at the outlet — before reserve and inverter losses.
  const target = scenario.targetHours
  const neededKwh = target && t.averageWatts.base > 0 ? { low: (t.averageWatts.low * target) / 1000, base: (t.averageWatts.base * target) / 1000, high: (t.averageWatts.high * target) / 1000 } : null

  async function checkProducts(save: boolean) {
    setBusy(true)
    setError(null)
    try {
      const res = await fetch('/api/energy/scenarios/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ property, scenarioClientId: scenario.clientId, save }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Could not check products.')
      setServer(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not check products.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section style={{ ...card, display: 'grid', gap: 18 }} aria-labelledby="results-title" aria-live="polite">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <h3 id="results-title" style={h2}>Result — {scenario.name}</h3>
        {hasDevices && (
          <span style={{ display: 'inline-flex', gap: 8, alignItems: 'center', ...muted }}>
            Weakest evidence: <BasisChip basis={result.basis} />
          </span>
        )}
      </div>

      {!hasDevices ? (
        <p style={muted}>Add equipment to this scenario to see energy, power and runtime.</p>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 10 }}>
            <Stat title="Energy per day" value={`${r(t.kwhPerDay, 2)} kWh`} note={`Central estimate ${fmt(t.kwhPerDay.base, 2)} kWh`} />
            <Stat title="On at the same time" value={`${fmt(t.simultaneousWatts, 0)} W`} note="What a backup must carry continuously" />
            <Stat
              title="Startup peak"
              value={t.startupPeakWatts == null ? 'Unknown' : `${fmt(t.startupPeakWatts, 0)} W`}
              note={t.startupPeakWatts == null ? `Add startup watts for: ${t.startupUnknown.join(', ')}` : 'Largest motor start while the rest run'}
            />
            <Stat title="Everything at once" value={`${fmt(t.nameplateSumWatts, 0)} W`} note="Sum of running watts — rarely all on together" />
          </div>

          {neededKwh && (
            <p style={{ ...muted, margin: 0 }}>
              For your {target} h target this scenario needs roughly <strong style={{ color: '#fff' }}>{r(neededKwh, 2)} kWh</strong> delivered at the outlet, before battery reserve and inverter losses — energy is only one check; continuous output and startup surge must also pass.
            </p>
          )}

          <div style={{ display: 'grid', gap: 8 }}>
            {t.devices.map((d) => (
              <div key={d.deviceId} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', padding: '10px 0', borderTop: '1px solid var(--ke-dark-hairline)' }}>
                <span style={{ color: '#fff' }}>
                  {d.name} {d.essential ? <span style={{ ...muted, fontSize: 12 }}>· essential</span> : null}
                </span>
                {d.kwhPerDay ? (
                  <span style={{ display: 'inline-flex', gap: 10, alignItems: 'center' }}>
                    <span style={muted}>{r(d.kwhPerDay, 2)} kWh/day</span>
                    {d.basis && <BasisChip basis={d.basis} />}
                  </span>
                ) : (
                  <span style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}>
                    <StatusTag status="unknown" />
                    <span style={{ ...muted, fontSize: 12.5, maxWidth: 380 }}>{d.refusal?.message}</span>
                  </span>
                )}
              </div>
            ))}
          </div>

          {(result.warnings.length > 0 || t.devices.some((d) => d.warnings.length)) && (
            <ul style={{ ...muted, margin: 0, paddingLeft: 18 }}>
              {result.warnings.map((w) => (
                <li key={w}>{w}</li>
              ))}
              {t.devices.flatMap((d) => d.warnings.map((w) => <li key={d.deviceId + w}>{d.name}: {w}</li>))}
            </ul>
          )}

          <details>
            <summary style={{ cursor: 'pointer', color: 'var(--ke-green-400)', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 14, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              How was this calculated? <ChevronDown size={14} aria-hidden />
            </summary>
            <ul style={{ ...muted, marginTop: 10, paddingLeft: 18 }}>
              <li>Steady loads: watts × hours ÷ 1,000. Cycling loads: running watts × 24 h × share of time running. Air conditioners use electrical input, never BTU/h.</li>
              {result.assumptions.map((a) => (
                <li key={a.id}>
                  {a.description}
                  {a.value != null ? ` (${a.value})` : ''}
                </li>
              ))}
              <li>Ranges widen with weaker evidence: measured ±5%, label/manual ±15%, your estimate ±25%, assumed ±40%.</li>
            </ul>
          </details>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            <Btn onClick={() => checkProducts(false)} disabled={busy || !target}>
              {busy ? 'Checking…' : 'Check our products against this'}
            </Btn>
            {signedIn && (
              <Btn variant="ghost" onClick={() => checkProducts(true)} disabled={busy}>
                Save this result
              </Btn>
            )}
            {!target && <span style={muted}>Set a target runtime to compare products.</span>}
          </div>
          {error && <p role="alert" style={{ color: '#f6a5a5', margin: 0 }}>{error}</p>}

          {server && (
            <div style={{ display: 'grid', gap: 12 }}>
              {server.savedRunId && <p style={{ ...muted, margin: 0 }}>Saved to your account (engine v{server.engineVersion}).</p>}
              {server.catalogueNote && <p style={{ ...muted, margin: 0 }}>{server.catalogueNote}</p>}
              {server.matches.map((m) => (
                <div key={m.skuId} style={{ padding: 16, borderRadius: 14, border: '1px solid var(--ke-dark-hairline)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                    <strong style={{ color: '#fff' }}>{m.displayName}</strong>
                    <StatusTag status={m.status} />
                  </div>
                  <p style={{ ...muted, margin: '6px 0 10px' }}>{m.summary}</p>
                  <ul style={{ margin: 0, paddingLeft: 0, listStyle: 'none', display: 'grid', gap: 6 }}>
                    {m.checks.map((c) => (
                      <li key={c.rule} style={{ display: 'grid', gridTemplateColumns: '150px 130px 1fr', gap: 8, fontSize: 13 }}>
                        <span style={{ color: '#fff' }}>{RULE_LABEL[c.rule] ?? c.rule}</span>
                        <StatusTag status={c.status} />
                        <span style={muted}>
                          {c.detail}
                          {c.unverifiedEvidence && c.status !== 'unknown' ? ' (specification not yet verified)' : ''}
                        </span>
                      </li>
                    ))}
                  </ul>
                  {m.status === 'pass' && m.catalogId && (
                    <Link href={`/product/${m.catalogId}`} style={{ display: 'inline-block', marginTop: 10, color: 'var(--ke-green-400)', fontWeight: 600 }}>
                      View product
                    </Link>
                  )}
                </div>
              ))}
              {server.matches.length > 0 && !server.matches.some((m) => m.status === 'pass') && (
                <p style={{ ...muted, margin: 0 }}>
                  No product is confirmed for this scenario yet. <Link href="/contact" style={{ color: 'var(--ke-green-400)' }}>Ask us for a sourcing brief</Link> — we’ll match equipment against your list rather than sell an unsuitable kit.
                </p>
              )}
            </div>
          )}
        </>
      )}
    </section>
  )
}
