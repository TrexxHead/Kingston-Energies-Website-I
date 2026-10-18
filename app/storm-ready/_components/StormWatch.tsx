'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { ExternalLink, Wind, RefreshCw } from 'lucide-react'
import { card, muted, h2, fmt } from '@/app/my-energy/_components/ui'
import type { ActiveStorm } from '@/lib/storm/nhc'

const StormConeMap = dynamic(() => import('./StormConeMap'), { ssr: false })

/**
 * Active Atlantic systems as the National Hurricane Center lists them.
 * We report position, strength and distance — never whether a storm will
 * affect Jamaica; the official advisories decide that.
 */

type State = { kind: 'loading' } | { kind: 'error'; message: string } | { kind: 'ok'; storms: ActiveStorm[]; checkedAt: string; attribution: string }

const OFFICIAL = [
  { href: 'https://www.metservice.gov.jm/', label: 'Jamaica Meteorological Service — watches & warnings for Jamaica' },
  { href: 'https://www.odpem.org.jm/', label: 'ODPEM — shelters, evacuation and recovery' },
  { href: 'https://www.nhc.noaa.gov/', label: 'National Hurricane Center — forecast cones & advisories' },
]

const time = (iso: string) => new Date(iso).toLocaleString('en-JM', { timeZone: 'America/Jamaica', weekday: 'short', hour: 'numeric', minute: '2-digit', day: 'numeric', month: 'short' })

export default function StormWatch() {
  const [state, setState] = useState<State>({ kind: 'loading' })
  const [coneFor, setConeFor] = useState<string | null>(null)
  const load = () => {
    setState({ kind: 'loading' })
    fetch('/api/storm/active')
      .then(async (r) => {
        const d = await r.json().catch(() => ({}))
        if (!r.ok) throw new Error(d.error ?? 'Storm information is unavailable right now.')
        setState({ kind: 'ok', storms: d.storms, checkedAt: d.checkedAt, attribution: d.attribution })
      })
      .catch((e: Error) => setState({ kind: 'error', message: e.message }))
  }
  useEffect(load, [])

  return (
    <section style={{ ...card, display: 'grid', gap: 14 }} aria-labelledby="sw-title" aria-live="polite">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <h2 id="sw-title" style={h2}>Active storms in the Atlantic</h2>
        <button type="button" onClick={load} className="ke-sr-link" aria-label="Check again">
          <RefreshCw size={14} aria-hidden /> Check again
        </button>
      </div>

      {state.kind === 'loading' && <p style={{ ...muted, margin: 0 }}>Checking the National Hurricane Center…</p>}
      {state.kind === 'error' && (
        <p className="ke-sr-note" role="status">
          {state.message} Please check the official sources below — we won’t show storm information we couldn’t confirm.
        </p>
      )}
      {state.kind === 'ok' && state.storms.length === 0 && (
        <p style={{ margin: 0, color: '#fff', fontSize: 16 }}>
          The National Hurricane Center lists <strong>no active tropical storms or hurricanes</strong> in the Atlantic right now.
          <span style={{ ...muted, display: 'block', marginTop: 6 }}>This list doesn’t include disturbances that haven’t developed yet — NHC’s tropical weather outlook covers those.</span>
        </p>
      )}
      {state.kind === 'ok' && state.storms.length > 0 && (
        <ul className="ke-sr-storms">
          {state.storms.map((s) => (
            <li key={s.id} className="ke-sr-storm">
              <div className="ke-sr-storm__head">
                <Wind size={20} aria-hidden />
                <div>
                  <strong>
                    {s.classificationLabel} {s.name}
                  </strong>
                  {s.category != null && <span className="ke-sr-badge">Category {s.category}</span>}
                  <div style={{ ...muted, fontSize: 12.5 }}>
                    NHC update {time(s.lastUpdate)}
                    {s.advisoryNumber && <> · advisory {s.advisoryNumber}</>}
                  </div>
                </div>
              </div>
              <dl className="ke-sr-facts">
                <div>
                  <dt>Distance from Kingston</dt>
                  <dd>{fmt(s.distanceFromKingstonKm, 0)} km</dd>
                </div>
                {s.windKmh != null && (
                  <div>
                    <dt>Max sustained wind</dt>
                    <dd>{s.windKmh} km/h <small>({s.windMph} mph)</small></dd>
                  </div>
                )}
                {s.movementText && (
                  <div>
                    <dt>Movement</dt>
                    <dd>{s.movementText}</dd>
                  </div>
                )}
                {s.pressureMb != null && (
                  <div>
                    <dt>Pressure</dt>
                    <dd>{s.pressureMb} mb</dd>
                  </div>
                )}
              </dl>
              <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                {s.coneKmzUrl && (
                  <button type="button" className="ke-sr-link" aria-expanded={coneFor === s.id} onClick={() => setConeFor(coneFor === s.id ? null : s.id)}>
                    {coneFor === s.id ? 'Hide the map' : 'Show the forecast cone on the map'}
                  </button>
                )}
                {s.graphicsUrl && (
                  <a className="ke-sr-link" href={s.graphicsUrl} target="_blank" rel="noopener noreferrer">
                    Forecast cone <ExternalLink size={13} aria-hidden />
                  </a>
                )}
                {s.advisoryUrl && (
                  <a className="ke-sr-link" href={s.advisoryUrl} target="_blank" rel="noopener noreferrer">
                    Public advisory <ExternalLink size={13} aria-hidden />
                  </a>
                )}
              </div>
              {coneFor === s.id && <StormConeMap id={s.id} name={s.name} />}
            </li>
          ))}
        </ul>
      )}
      {state.kind === 'ok' && (
        <p style={{ ...muted, fontSize: 12, margin: 0 }}>
          {state.attribution} Checked {time(state.checkedAt)}. Distance is from the storm’s centre; wind and rain reach far beyond it. Whether Jamaica is under a watch or warning is decided by the Meteorological Service.
        </p>
      )}

      <div>
        <h3 className="ke-sr-h3">Official sources</h3>
        <ul style={{ margin: 0, paddingLeft: 0, listStyle: 'none', display: 'grid', gap: 6 }}>
          {OFFICIAL.map((o) => (
            <li key={o.href}>
              <a className="ke-sr-link" href={o.href} target="_blank" rel="noopener noreferrer">
                {o.label} <ExternalLink size={13} aria-hidden />
              </a>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
