'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { cardStyle, h3Style } from '../../ui/card'
import Badge from '../../ui/Badge'
import Button from '../../ui/Button'
import TextInput from '../../ui/TextInput'
import { PARISHES, COVERAGE_LABEL, type CoverageState } from '@/lib/map/parishes'

interface Report {
  id: string
  kind: string
  observedAt: string
  message: string | null
  proposedName: string | null
  parish: string | null
  contactEmail: string | null
  moderation: string
  moderatorNote: string | null
  createdAt: string
  station: { id: string; name: string } | null
}
interface Coverage { parish: string; name: string; published: number; state: CoverageState; sourcesReviewed: string[]; notes: string | null; reviewedAt: string | null; reviewedBy: string | null }

const KIND_LABEL: Record<string, string> = {
  new_station: 'Missing charger',
  successful_charge: 'Successful charge',
  equipment_fault: 'Equipment fault',
  access_blocked: 'Access blocked',
  connector_missing: 'Connector missing',
  could_not_find: 'Could not find',
}
const STATES: CoverageState[] = ['unreviewed', 'in_progress', 'reviewed_none_confirmed', 'reviewed_sites_confirmed']
const muted = { color: 'var(--color-text-muted)', fontSize: 13 } as const

/** Moderate driver reports (nothing reaches the map unreviewed) and record parish coverage reviews. */
export default function MapReportsSection() {
  const [tab, setTab] = useState<'pending' | 'approved' | 'rejected'>('pending')
  const [reports, setReports] = useState<Report[]>([])
  const [coverage, setCoverage] = useState<Coverage[]>([])
  const [msg, setMsg] = useState<string | null>(null)

  const loadReports = useCallback(async () => {
    const res = await fetch(`/api/admin/map/reports?moderation=${tab}`)
    if (res.ok) setReports((await res.json()).reports)
  }, [tab])
  const loadCoverage = useCallback(async () => {
    const res = await fetch('/api/admin/map/coverage')
    if (res.ok) setCoverage((await res.json()).parishes)
  }, [])
  useEffect(() => {
    loadReports()
  }, [loadReports])
  useEffect(() => {
    loadCoverage()
  }, [loadCoverage])

  async function moderate(id: string, moderation: 'approved' | 'rejected') {
    const res = await fetch(`/api/admin/map/reports/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ moderation }) })
    setMsg(res.ok ? `Report ${moderation}.` : (await res.json()).error)
    loadReports()
  }

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div style={cardStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <h3 style={{ ...h3Style, margin: 0 }}>Driver reports</h3>
          <div style={{ display: 'flex', gap: 6 }}>
            {(['pending', 'approved', 'rejected'] as const).map((t) => (
              <Button key={t} size="sm" variant={tab === t ? 'primary' : 'outline'} onClick={() => setTab(t)}>{t}</Button>
            ))}
          </div>
        </div>
        <p style={{ ...muted, margin: '8px 0 12px' }}>
          Approved “successful charge” reports show on the station as dated community evidence — never as live status. A fault report is a prompt to re-check: confirm it (site visit, call or operator app) with “Record a check”, and only that changes the public status. A missing-charger report is a lead to check, not a station.
        </p>
        {msg && <p role="status" style={{ fontSize: 13 }}>{msg}</p>}
        {reports.length === 0 ? (
          <p style={muted}>No {tab} reports.</p>
        ) : (
          <div style={{ display: 'grid', gap: 10 }}>
            {reports.map((r) => (
              <div key={r.id} style={{ borderTop: '1px solid var(--color-border)', paddingTop: 10, display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                <div style={{ fontSize: 13.5 }}>
                  <Badge tone={r.kind === 'equipment_fault' || r.kind === 'access_blocked' ? 'orange' : 'blue'}>{KIND_LABEL[r.kind] ?? r.kind}</Badge>{' '}
                  <strong>{r.station?.name ?? r.proposedName ?? 'Unnamed'}</strong>
                  {r.parish && <span style={muted}> · {PARISHES.find((p) => p.id === r.parish)?.name}</span>}
                  <div style={muted}>
                    Seen {new Date(r.observedAt).toLocaleDateString('en-JM')} · submitted {new Date(r.createdAt).toLocaleString('en-JM')}
                    {r.contactEmail ? ` · ${r.contactEmail}` : ''}
                  </div>
                  {r.message && <p style={{ margin: '6px 0 0', whiteSpace: 'pre-wrap' }}>{r.message}</p>}
                </div>
                <div style={{ display: 'flex', gap: 6, alignItems: 'start', flexWrap: 'wrap' }}>
                  {r.moderation === 'pending' && (
                    <>
                      <Button size="sm" onClick={() => moderate(r.id, 'approved')}>Approve</Button>
                      <Button size="sm" variant="outline" onClick={() => moderate(r.id, 'rejected')}>Reject</Button>
                    </>
                  )}
                  {r.station && r.kind !== 'new_station' && (
                    <Link href={`/admin/dashboard/platform/map?station=${encodeURIComponent(r.station.id)}`} style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-link)', alignSelf: 'center' }}>
                      Record a check
                    </Link>
                  )}
                  {r.kind === 'new_station' && (
                    <Link
                      href={`/admin/dashboard/platform/map?new=1&name=${encodeURIComponent(r.proposedName ?? '')}&parish=${encodeURIComponent(r.parish ?? '')}&notes=${encodeURIComponent(`From driver report ${r.id}: ${r.message ?? ''}`)}`}
                      style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-link)', alignSelf: 'center' }}
                    >
                      Start a draft station
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={cardStyle}>
        <h3 style={h3Style}>Parish coverage</h3>
        <p style={{ ...muted, margin: '0 0 12px' }}>
          The public map shows these states, so “searched, none confirmed” is never confused with “not looked yet”. Record which sources you checked.
        </p>
        <div style={{ display: 'grid', gap: 10 }}>
          {coverage.map((c) => (
            <CoverageRow key={c.parish} c={c} onSaved={(m) => { setMsg(m); loadCoverage() }} />
          ))}
        </div>
      </div>
    </div>
  )
}

function CoverageRow({ c, onSaved }: { c: Coverage; onSaved: (msg: string) => void }) {
  const [state, setState] = useState<CoverageState>(c.state)
  const [sources, setSources] = useState(c.sourcesReviewed.join(', '))
  const [notes, setNotes] = useState(c.notes ?? '')
  const [err, setErr] = useState<string | null>(null)
  async function save() {
    const res = await fetch('/api/admin/map/coverage', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ parish: c.parish, state, sourcesReviewed: sources.split(',').map((s) => s.trim()).filter(Boolean), notes: notes || null }),
    })
    if (res.ok) {
      setErr(null)
      onSaved(`${c.name} coverage saved.`)
    } else setErr((await res.json()).error)
  }
  return (
    <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 10, display: 'grid', gridTemplateColumns: 'minmax(120px,160px) repeat(auto-fit,minmax(180px,1fr))', gap: 10, alignItems: 'end' }}>
      <div style={{ fontSize: 13.5 }}>
        <strong>{c.name}</strong>
        <div style={muted}>{c.published} published{c.reviewedAt ? ` · reviewed ${new Date(c.reviewedAt).toLocaleDateString('en-JM')}` : ''}</div>
      </div>
      <TextInput label="State" value={state} onChange={(v) => setState(v as CoverageState)} options={STATES} />
      <TextInput label="Sources reviewed (comma-separated)" value={sources} onChange={setSources} placeholder="e.g. JPS Charge ’n Go page, site visits" />
      <TextInput label="Notes" value={notes} onChange={setNotes} />
      <div style={{ display: 'grid', gap: 4 }}>
        <Button size="sm" variant="outline" onClick={save}>Save</Button>
        <span style={{ ...muted, fontSize: 11.5 }}>{COVERAGE_LABEL[state]}</span>
        {err && <span role="alert" style={{ color: 'var(--color-danger)', fontSize: 12 }}>{err}</span>}
      </div>
    </div>
  )
}
