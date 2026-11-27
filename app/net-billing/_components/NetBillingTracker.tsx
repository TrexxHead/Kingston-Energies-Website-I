'use client'

import { useEffect, useState } from 'react'
import { card, muted, h2, input } from '@/app/my-energy/_components/ui'
import { NET_BILLING_STEPS } from './steps'

/**
 * The visitor's own record of where they are — kept in this browser. It is
 * not JPS's status: we can't see JPS's systems and never claim to.
 */
const KEY = 'ke-net-billing-tracker-v1'
type Entry = { done: boolean; date: string; note: string }

export default function NetBillingTracker() {
  const [state, setState] = useState<Record<string, Entry>>({})
  useEffect(() => {
    try {
      setState(JSON.parse(localStorage.getItem(KEY) ?? '{}') ?? {})
    } catch {
      /* storage unavailable */
    }
  }, [])
  const update = (id: string, patch: Partial<Entry>) => {
    const blank: Entry = { done: false, date: '', note: '' }
    const next = { ...state, [id]: { ...blank, ...state[id], ...patch } }
    setState(next)
    try {
      localStorage.setItem(KEY, JSON.stringify(next))
    } catch {
      /* ignore */
    }
  }
  const done = NET_BILLING_STEPS.filter((s) => state[s.id]?.done).length
  const current = NET_BILLING_STEPS.find((s) => !state[s.id]?.done)

  return (
    <section style={{ ...card, display: 'grid', gap: 14 }} aria-labelledby="nb-track">
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'baseline' }}>
        <h2 id="nb-track" style={h2}>My progress</h2>
        <span style={muted} aria-live="polite">
          {done} of {NET_BILLING_STEPS.length} steps done{current ? ` · next: ${current.title.toLowerCase()}` : ' · all done'}
        </span>
      </div>
      <p style={{ ...muted, margin: 0 }}>Your own notes, saved in this browser. For the status of an application, ask JPS — we can’t see their systems.</p>
      <ol className="ke-nb-list">
        {NET_BILLING_STEPS.map((s, i) => {
          const e = state[s.id]
          return (
            <li key={s.id} className={e?.done ? 'is-done' : current?.id === s.id ? 'is-current' : ''}>
              <label className="ke-nb-head">
                <input type="checkbox" checked={!!e?.done} onChange={(ev) => update(s.id, { done: ev.target.checked, date: ev.target.checked && !e?.date ? new Date().toISOString().slice(0, 10) : e?.date ?? '' })} />
                <span>
                  <strong>
                    {i + 1}. {s.title}
                  </strong>
                  <small>{s.outcome}</small>
                </span>
              </label>
              {(e?.done || current?.id === s.id) && (
                <div className="ke-nb-fields">
                  <input aria-label={`${s.title}: date`} type="date" style={input} value={e?.date ?? ''} onChange={(ev) => update(s.id, { date: ev.target.value })} />
                  <input aria-label={`${s.title}: notes`} style={input} placeholder="Reference number, who you spoke to…" maxLength={200} value={e?.note ?? ''} onChange={(ev) => update(s.id, { note: ev.target.value })} />
                </div>
              )}
            </li>
          )
        })}
      </ol>
    </section>
  )
}
