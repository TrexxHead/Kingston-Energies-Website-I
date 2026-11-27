'use client'

import { useState } from 'react'
import { ThumbsUp, TriangleAlert } from 'lucide-react'

type QuickKind = 'successful_charge' | 'equipment_fault'

/**
 * One-tap driver report from the station card. Sent straight to moderation —
 * it never changes the station's status on its own; staff re-check first.
 */
export default function QuickReport({ stationId }: { stationId: string }) {
  const [state, setState] = useState<{ kind: QuickKind; phase: 'sending' | 'sent' | 'error'; message?: string } | null>(null)
  const send = async (kind: QuickKind) => {
    setState({ kind, phase: 'sending' })
    const res = await fetch('/api/map/reports', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stationId, kind, observedAt: new Date().toISOString() }),
    }).catch(() => null)
    const d = await res?.json().catch(() => ({}))
    setState(res?.ok ? { kind, phase: 'sent' } : { kind, phase: 'error', message: d?.error ?? 'Couldn’t send — please try again.' })
  }
  if (state?.phase === 'sent' || state?.phase === 'error') {
    return (
      <p className="ke-card__report" role="status">
        <style>{CSS}</style>
        {state.phase === 'sent' ? (state.kind === 'successful_charge' ? 'Thanks! Our team reviews reports before the map changes.' : 'Thanks — we’ll check this charger before changing its status.') : state.message}
      </p>
    )
  }
  return (
    <div className="ke-card__quick" role="group" aria-label="Report on this charger">
      <style>{CSS}</style>
      <span>Been here?</span>
      <button type="button" disabled={!!state} onClick={() => send('successful_charge')}>
        <ThumbsUp size={14} aria-hidden /> I charged here
      </button>
      <button type="button" disabled={!!state} onClick={() => send('equipment_fault')}>
        <TriangleAlert size={14} aria-hidden /> Not working
      </button>
    </div>
  )
}


const CSS = `.ke-card__quick{display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-top:10px;font-size:12.5px;color:var(--g-muted,inherit)}
.ke-card__quick span{opacity:.75;margin-right:2px}
.ke-card__quick button{display:inline-flex;align-items:center;gap:5px;height:30px;padding:0 10px;border-radius:999px;border:1px solid var(--g-line,rgba(255,255,255,.18));background:transparent;color:inherit;font:inherit;font-weight:600;cursor:pointer}
.ke-card__quick button:hover{background:var(--g-hover,rgba(255,255,255,.07))}
.ke-card__quick button:disabled{opacity:.55;cursor:wait}
.ke-card__report{margin:10px 0 0;font-size:12.5px;line-height:1.45}`
