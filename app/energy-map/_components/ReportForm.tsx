'use client'

import { useState, type FormEvent } from 'react'
import { PARISHES } from '@/lib/map/parishes'
import { card, label, input, muted, h2, Btn } from '@/app/my-energy/_components/ui'

const KINDS = [
  { value: 'successful_charge', label: 'I charged here successfully' },
  { value: 'equipment_fault', label: 'Equipment fault' },
  { value: 'access_blocked', label: 'Access blocked' },
  { value: 'connector_missing', label: 'Connector missing' },
  { value: 'could_not_find', label: 'Could not find it' },
]

/** Today's date in the visitor's own timezone, as YYYY-MM-DD. */
function localToday(): string {
  const d = new Date()
  return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 10)
}

/** Moderated report — nothing on the map changes until a person reviews it. */
export default function ReportForm({ stationId, stationName, onClose }: { stationId?: string; stationName?: string; onClose: () => void }) {
  const isNew = !stationId
  const [kind, setKind] = useState(isNew ? 'new_station' : 'successful_charge')
  const [observedOn, setObservedOn] = useState(localToday)
  const [message, setMessage] = useState('')
  const [name, setName] = useState('')
  const [parish, setParish] = useState('')
  const [email, setEmail] = useState('')
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [error, setError] = useState('')

  async function submit(e: FormEvent) {
    e.preventDefault()
    setState('sending')
    // Today → now (noon may still be in the future); an earlier day → midday that day.
    const today = localToday()
    const observedAt = observedOn >= today ? new Date().toISOString() : new Date(`${observedOn}T12:00:00`).toISOString()
    const res = await fetch('/api/map/reports', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        stationId,
        kind,
        observedAt,
        message: message || undefined,
        proposedName: isNew ? name : undefined,
        parish: parish || undefined,
        contactEmail: email || undefined,
      }),
    }).catch(() => null)
    const data = await res?.json().catch(() => ({}))
    if (res?.ok) setState('sent')
    else {
      setState('error')
      setError(data?.error ?? 'Could not send the report.')
    }
  }

  if (state === 'sent') {
    return (
      <div role="status" style={{ ...card, display: 'grid', gap: 10 }}>
        <p style={{ margin: 0, color: '#fff' }}>Thanks — a moderator will review this before anything on the map changes.</p>
        <div><Btn variant="ghost" onClick={onClose}>Close</Btn></div>
      </div>
    )
  }

  return (
    <form onSubmit={submit} style={{ ...card, display: 'grid', gap: 12 }} aria-labelledby="report-title">
      <h2 id="report-title" style={h2}>{isNew ? 'Tell us about a missing charger' : `Report on ${stationName}`}</h2>
      {!isNew && (
        <div>
          <label htmlFor="r-kind" style={label}>What happened</label>
          <select id="r-kind" style={input} value={kind} onChange={(e) => setKind(e.target.value)}>
            {KINDS.map((k) => <option key={k.value} value={k.value}>{k.label}</option>)}
          </select>
        </div>
      )}
      {isNew && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 10 }}>
          <div>
            <label htmlFor="r-name" style={label}>Charger or venue name</label>
            <input id="r-name" style={input} value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div>
            <label htmlFor="r-parish" style={label}>Parish</label>
            <select id="r-parish" style={input} value={parish} onChange={(e) => setParish(e.target.value)}>
              <option value="">—</option>
              {PARISHES.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
        </div>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 10 }}>
        <div>
          <label htmlFor="r-date" style={label}>When did you see this?</label>
          <input id="r-date" type="date" style={input} value={observedOn} max={localToday()} onChange={(e) => setObservedOn(e.target.value)} required />
        </div>
        <div>
          <label htmlFor="r-email" style={label}>Email (optional, for follow-up)</label>
          <input id="r-email" type="email" style={input} value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
      </div>
      <div>
        <label htmlFor="r-msg" style={label}>Details {isNew ? '(address, connector types, access)' : ''}</label>
        <textarea id="r-msg" style={{ ...input, height: 90, paddingTop: 10 }} value={message} maxLength={1000} onChange={(e) => setMessage(e.target.value)} />
      </div>
      <p style={{ ...muted, margin: 0, fontSize: 12.5 }}>Please don’t include photos of people or number plates. Reports are reviewed before publication and never change live status on their own.</p>
      {state === 'error' && <p role="alert" style={{ color: '#f6a5a5', margin: 0 }}>{error}</p>}
      <div style={{ display: 'flex', gap: 10 }}>
        <Btn type="submit" disabled={state === 'sending'}>{state === 'sending' ? 'Sending…' : 'Send report'}</Btn>
        <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
      </div>
    </form>
  )
}
