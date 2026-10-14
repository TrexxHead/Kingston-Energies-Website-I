'use client'

import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Plus, Trash2, ArrowLeft, CircleCheck, CircleX } from 'lucide-react'
import { cardStyle, h3Style } from '../../ui/card'
import Badge from '../../ui/Badge'
import Button from '../../ui/Button'
import TextInput from '../../ui/TextInput'
import { PARISHES } from '@/lib/map/parishes'

interface GroupStatus { state: 'available' | 'status_unknown' | 'out_of_service'; detail: string }
interface Group { id?: string; status?: GroupStatus; connectorType: string; currentType: 'AC' | 'DC'; maxPowerKw: number | null; count: number | null; portsShared: boolean | null; notes: string | null }
interface Source { id: string; sourceName: string; sourceType: string; url: string | null; notes: string | null; licence: string | null; permissionScope: string | null; reviewState: string; verifiedAt: string | null; observedAt: string | null }
interface Station {
  id: string
  name: string
  operator: { name: string } | null
  parish: string
  address: string | null
  lat: number
  lng: number
  access: string
  accessNotes: string | null
  hours: string | null
  paymentNotes: string | null
  pricingNotes: string | null
  googlePlaceId: string | null
  verificationNote: string | null
  status: string
  connectorGroups: Group[]
  sources: Source[]
  blockers: string[]
  _count: { reports: number }
}

const CONNECTORS = ['Type 2', 'J1772 (Type 1)', 'CCS', 'CCS2', 'CCS1', 'CHAdeMO', 'Tesla', 'NACS', 'GB/T', 'Wall outlet', 'Other']
const ACCESS = ['public', 'customers_only', 'restricted', 'private', 'unknown']
const SOURCE_TYPES = ['field_visit', 'site_owner', 'operator_agreement', 'operator_public', 'open_data', 'staff_list', 'community']
const muted = { color: 'var(--color-text-muted)', fontSize: 13 } as const
const STATUS_LABEL = { available: 'Available', status_unknown: 'Status unknown', out_of_service: 'Out of service' } as const
const STATUS_TONE = { available: 'green', status_unknown: 'neutral', out_of_service: 'red' } as const
const bestState = (groups: Group[]): GroupStatus['state'] =>
  groups.some((g) => g.status?.state === 'available') ? 'available' : groups.length && groups.every((g) => g.status?.state === 'out_of_service') ? 'out_of_service' : 'status_unknown'
const CHECK_METHODS: [string, string][] = [['site_visit', 'Site visit'], ['phone_call', 'Phoned the site / operator'], ['operator_app', 'Operator app'], ['operator_confirmed', 'Operator confirmed in writing'], ['other', 'Other']]
const parishName = (id: string) => PARISHES.find((p) => p.id === id)?.name ?? id

interface Form {
  name: string; operatorName: string; parish: string; address: string; lat: string; lng: string; access: string
  accessNotes: string; hours: string; paymentNotes: string; pricingNotes: string; googlePlaceId: string; verificationNote: string
  groups: { connectorType: string; currentType: 'AC' | 'DC'; maxPowerKw: string; count: string; portsShared: boolean }[]
}

function emptyForm(prefill?: Partial<Form>): Form {
  return { name: '', operatorName: '', parish: 'kingston', address: '', lat: '', lng: '', access: 'public', accessNotes: '', hours: '', paymentNotes: '', pricingNotes: '', googlePlaceId: '', verificationNote: '', groups: [], ...prefill }
}

function toForm(s: Station): Form {
  return {
    name: s.name, operatorName: s.operator?.name ?? '', parish: s.parish, address: s.address ?? '', lat: String(s.lat), lng: String(s.lng), access: s.access,
    accessNotes: s.accessNotes ?? '', hours: s.hours ?? '', paymentNotes: s.paymentNotes ?? '', pricingNotes: s.pricingNotes ?? '', googlePlaceId: s.googlePlaceId ?? '', verificationNote: s.verificationNote ?? '',
    groups: s.connectorGroups.map((g) => ({ connectorType: g.connectorType, currentType: g.currentType, maxPowerKw: g.maxPowerKw != null ? String(g.maxPowerKw) : '', count: g.count != null ? String(g.count) : '', portsShared: !!g.portsShared })),
  }
}

function toPayload(f: Form) {
  const opt = (v: string) => (v.trim() ? v.trim() : null)
  return {
    name: f.name, operatorName: opt(f.operatorName), parish: f.parish, address: opt(f.address), lat: Number(f.lat), lng: Number(f.lng), access: f.access,
    accessNotes: opt(f.accessNotes), hours: opt(f.hours), paymentNotes: opt(f.paymentNotes), pricingNotes: opt(f.pricingNotes), googlePlaceId: opt(f.googlePlaceId), verificationNote: opt(f.verificationNote),
    connectorGroups: f.groups.map((g) => ({ connectorType: g.connectorType, currentType: g.currentType, maxPowerKw: g.maxPowerKw ? Number(g.maxPowerKw) : null, count: g.count ? Number(g.count) : null, portsShared: g.portsShared })),
  }
}

/**
 * Energy Map station registry (backlog M03). Stations start as drafts and are
 * published only with a verified source, connector details and coordinates in
 * Jamaica. Unknown details (power, count, hours) can stay blank and show as
 * unknown on the public map.
 */
export default function MapStationsSection() {
  const params = useSearchParams()
  const [stations, setStations] = useState<Station[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<string | 'new' | null>(null)
  const [prefill, setPrefill] = useState<Partial<Form> | undefined>()

  const load = useCallback(async () => {
    const res = await fetch('/api/admin/map/stations')
    if (res.ok) setStations((await res.json()).stations)
    setLoading(false)
  }, [])
  useEffect(() => {
    load()
  }, [load])
  useEffect(() => {
    if (params.get('new')) {
      setPrefill({ name: params.get('name') ?? '', parish: params.get('parish') || 'kingston', verificationNote: params.get('notes') ?? '' })
      setEditing('new')
    }
  }, [params])

  if (editing) {
    const st = stations.find((s) => s.id === editing)
    // Wait for the saved station to arrive before mounting its editor, so the form never opens blank.
    if (editing !== 'new' && !st) return <p style={muted}>Loading station…</p>
    return (
      <StationEditor
        key={editing}
        station={st}
        prefill={prefill}
        onBack={() => { setEditing(null); setPrefill(undefined) }}
        onSaved={async (id) => { await load(); setEditing(id) }}
      />
    )
  }

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div style={{ ...cardStyle, display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <p style={{ ...muted, margin: 0, maxWidth: 680 }}>
          Add chargers your team has confirmed — a site visit, the site owner, or an operator that has given permission. Google search results can’t be copied in here; only a Google Place ID may be stored as a cross-reference.
        </p>
        <Button size="sm" onClick={() => setEditing('new')} iconRight={<Plus size={14} />}>New station</Button>
      </div>
      <ImportListCard onImported={load} />
      <div style={cardStyle}>
        <h3 style={h3Style}>Stations</h3>
        {loading ? (
          <p style={muted}>Loading…</p>
        ) : stations.length === 0 ? (
          <p style={muted}>No stations yet.</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5 }}>
            <thead>
              <tr style={{ textAlign: 'left', ...muted }}>
                <th style={{ padding: 8 }}>Station</th>
                <th style={{ padding: 8 }}>Parish</th>
                <th style={{ padding: 8 }}>Connectors</th>
                <th style={{ padding: 8 }}>Sources</th>
                <th style={{ padding: 8 }}>Charger status</th>
                <th style={{ padding: 8 }}>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {stations.map((s) => (
                <tr key={s.id} style={{ borderTop: '1px solid var(--color-border)' }}>
                  <td style={{ padding: 8, fontWeight: 600 }}>{s.name}<div style={{ ...muted, fontWeight: 400 }}>{s.operator?.name}</div></td>
                  <td style={{ padding: 8 }}>{parishName(s.parish)}</td>
                  <td style={{ padding: 8 }}>{s.connectorGroups.map((g) => g.connectorType).join(', ') || <span style={muted}>None</span>}</td>
                  <td style={{ padding: 8 }}>{s.sources.filter((x) => x.reviewState === 'verified').length} verified / {s.sources.length}</td>
                  <td style={{ padding: 8 }}>
                    {s.connectorGroups.length ? (
                      <Badge tone={STATUS_TONE[bestState(s.connectorGroups)]}>{STATUS_LABEL[bestState(s.connectorGroups)]}</Badge>
                    ) : (
                      <span style={muted}>—</span>
                    )}
                  </td>
                  <td style={{ padding: 8 }}>
                    <Badge tone={s.status === 'published' ? 'green' : s.status === 'draft' ? (s.blockers.length ? 'orange' : 'blue') : 'grey'}>
                      {s.status === 'draft' && !s.blockers.length ? 'ready to publish' : s.status}
                    </Badge>
                  </td>
                  <td style={{ padding: 8, textAlign: 'right' }}>
                    <Button size="sm" variant="outline" onClick={() => setEditing(s.id)}>Open</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

function StationEditor({ station, prefill, onBack, onSaved }: { station?: Station; prefill?: Partial<Form>; onBack: () => void; onSaved: (id: string) => void }) {
  const [f, setF] = useState<Form>(station ? toForm(station) : emptyForm(prefill))
  const [msg, setMsg] = useState<string | null>(null)
  const [src, setSrc] = useState({ sourceName: '', sourceType: 'field_visit', url: '', licence: '', permissionScope: '', observedAt: '', notes: '' })
  const set = (k: keyof Form) => (v: string) => setF({ ...f, [k]: v })

  async function save(status?: string) {
    setMsg(null)
    if (!f.lat || !f.lng) {
      setMsg('Enter the latitude and longitude (from a site visit or the operator) — a parish centre is not a location.')
      return
    }
    const res = station
      ? await fetch(`/api/admin/map/stations/${station.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ station: toPayload(f), ...(status ? { status } : {}) }) })
      : await fetch('/api/admin/map/stations', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(toPayload(f)) })
    const d = await res.json()
    if (!res.ok) {
      setMsg(d.blockers ? `${d.error} ${d.blockers.join(' ')}` : `${d.error}${d.path ? ` (${d.path.join('.')})` : ''}`)
      return
    }
    setMsg(status ? `Station ${status}.` : 'Saved.')
    onSaved(d.station.id)
  }

  async function status(s: string) {
    if (!station) return
    const res = await fetch(`/api/admin/map/stations/${station.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: s }) })
    const d = await res.json()
    setMsg(res.ok ? `Station ${s}.` : d.blockers ? `${d.error} ${d.blockers.join(' ')}` : d.error)
    if (res.ok) onSaved(station.id)
  }

  async function remove() {
    if (!station || !window.confirm(`Delete draft “${station.name}”?`)) return
    const res = await fetch(`/api/admin/map/stations/${station.id}`, { method: 'DELETE' })
    if (res.ok) onBack()
    else setMsg((await res.json()).error)
  }

  async function addSource() {
    if (!station) return
    const res = await fetch(`/api/admin/map/stations/${station.id}/sources`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sourceName: src.sourceName, sourceType: src.sourceType, url: src.url || null, licence: src.licence || null, permissionScope: src.permissionScope || null,
        observedAt: src.observedAt ? new Date(src.observedAt).toISOString() : null, notes: src.notes || null,
      }),
    })
    const d = await res.json()
    setMsg(res.ok ? 'Source recorded. Verify it once the evidence is checked.' : d.error)
    if (res.ok) {
      setSrc({ sourceName: '', sourceType: 'field_visit', url: '', licence: '', permissionScope: '', observedAt: '', notes: '' })
      onSaved(station.id)
    }
  }

  async function reviewSource(id: string, reviewState: 'verified' | 'rejected') {
    const res = await fetch(`/api/admin/map/sources/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reviewState }) })
    const d = await res.json()
    setMsg(res.ok ? `Source ${reviewState}.` : d.error)
    if (station) onSaved(station.id)
  }

  const updateGroup = (i: number, patch: Partial<Form['groups'][number]>) => setF({ ...f, groups: f.groups.map((g, j) => (j === i ? { ...g, ...patch } : g)) })

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div>
        <Button size="sm" variant="outline" onClick={onBack}>
          <ArrowLeft size={14} /> All stations
        </Button>
      </div>

      <div style={{ ...cardStyle, display: 'grid', gap: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <h3 style={{ ...h3Style, margin: 0 }}>{station ? station.name : 'New station'}</h3>
          {station && (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              <Badge tone={station.status === 'published' ? 'green' : 'neutral'}>{station.status}</Badge>
              {station.status !== 'published' && station.status !== 'retired' && <Button size="sm" onClick={() => status('published')}>Publish</Button>}
              {station.status === 'published' && <Button size="sm" variant="outline" onClick={() => status('closed')}>Mark closed</Button>}
              {station.status !== 'retired' && station.status !== 'draft' && <Button size="sm" variant="outline" onClick={() => status('retired')}>Retire</Button>}
              {station.status === 'draft' && (
                <Button size="sm" variant="outline" onClick={remove}>
                  <Trash2 size={13} /> Delete draft
                </Button>
              )}
            </div>
          )}
        </div>
        {station && station.blockers.length > 0 && station.status !== 'published' && (
          <ul style={{ ...muted, margin: 0, paddingLeft: 18 }}>
            {station.blockers.map((b) => <li key={b}>{b}</li>)}
          </ul>
        )}
        {msg && <p role="status" style={{ margin: 0, fontSize: 13 }}>{msg}</p>}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 10 }}>
          <TextInput label="Name" value={f.name} onChange={set('name')} />
          <TextInput label="Operator / network" value={f.operatorName} onChange={set('operatorName')} placeholder="e.g. JPS Charge ’n Go" />
          <TextInput label="Parish" value={f.parish} onChange={set('parish')} options={PARISHES.map((p) => p.id)} />
          <TextInput label="Address" value={f.address} onChange={set('address')} />
          <TextInput label="Latitude" value={f.lat} onChange={set('lat')} type="number" placeholder="e.g. 18.0123" />
          <TextInput label="Longitude" value={f.lng} onChange={set('lng')} type="number" placeholder="e.g. -76.7891" />
          <TextInput label="Access" value={f.access} onChange={set('access')} options={ACCESS} />
          <TextInput label="Hours" value={f.hours} onChange={set('hours')} placeholder="Leave blank if unknown" />
          <TextInput label="Google Place ID (optional)" value={f.googlePlaceId} onChange={set('googlePlaceId')} />
        </div>
        <TextInput label="Access instructions" value={f.accessNotes} onChange={set('accessNotes')} multiline />
        <TextInput label="Payment / app instructions" value={f.paymentNotes} onChange={set('paymentNotes')} multiline />
        <TextInput label="Pricing (only if current and permitted to publish)" value={f.pricingNotes} onChange={set('pricingNotes')} multiline />
        <TextInput label="Internal verification notes" value={f.verificationNote} onChange={set('verificationNote')} multiline />

        <div style={{ display: 'grid', gap: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <strong style={{ fontSize: 13.5 }}>Connector groups</strong>
            <Button size="sm" variant="outline" onClick={() => setF({ ...f, groups: [...f.groups, { connectorType: 'Type 2', currentType: 'AC', maxPowerKw: '', count: '', portsShared: false }] })}>
              <Plus size={13} /> Add group
            </Button>
          </div>
          <p style={{ ...muted, margin: 0, fontSize: 12 }}>One row per connector type. Count is connectors, which may share a port — they can’t necessarily charge at the same time. Leave power or count blank if unknown.</p>
          {f.groups.map((g, i) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(130px,1fr))', gap: 8, alignItems: 'end' }}>
              <TextInput label="Connector" value={g.connectorType} onChange={(v) => updateGroup(i, { connectorType: v })} options={CONNECTORS} />
              <TextInput label="AC / DC" value={g.currentType} onChange={(v) => updateGroup(i, { currentType: v as 'AC' | 'DC' })} options={['AC', 'DC']} />
              <TextInput label="Max kW" value={g.maxPowerKw} onChange={(v) => updateGroup(i, { maxPowerKw: v })} type="number" />
              <TextInput label="Connectors" value={g.count} onChange={(v) => updateGroup(i, { count: v })} type="number" />
              <label style={{ ...muted, display: 'flex', gap: 6, alignItems: 'center', height: 42 }}>
                <input type="checkbox" checked={g.portsShared} onChange={(e) => updateGroup(i, { portsShared: e.target.checked })} /> Shares a port
              </label>
              <Button size="sm" variant="outline" onClick={() => setF({ ...f, groups: f.groups.filter((_, j) => j !== i) })}>
                <Trash2 size={13} /> Remove
              </Button>
            </div>
          ))}
        </div>
        <div>
          <Button size="sm" onClick={() => save()}>{station ? 'Save changes' : 'Create draft'}</Button>
        </div>
      </div>

      {station && station.connectorGroups.length > 0 && <StatusCheckCard station={station} onSaved={() => onSaved(station.id)} />}

      {station && (
        <div style={{ ...cardStyle, display: 'grid', gap: 12 }}>
          <h3 style={{ ...h3Style, margin: 0 }}>Sources</h3>
          <p style={{ ...muted, margin: 0 }}>Where these facts came from and what we’re allowed to publish. A field visit needs notes saying who checked what, and when.</p>
          {station.sources.map((s) => (
            <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', borderTop: '1px solid var(--color-border)', paddingTop: 8, fontSize: 13 }}>
              <span>
                <strong>{s.sourceName}</strong> <span style={muted}>· {s.sourceType.replace('_', ' ')}</span>
                {s.url && (
                  <>
                    {' · '}
                    <a href={s.url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--ke-blue-500)' }}>link</a>
                  </>
                )}
                {s.permissionScope && <div style={muted}>Permission: {s.permissionScope}</div>}
                {s.notes && <div style={{ ...muted, whiteSpace: 'pre-wrap' }}>{s.notes}</div>}
              </span>
              <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
                <Badge tone={s.reviewState === 'verified' ? 'green' : s.reviewState === 'rejected' ? 'red' : 'neutral'}>{s.reviewState}</Badge>
                {s.reviewState === 'unverified' && (
                  <>
                    <Button size="sm" variant="outline" onClick={() => reviewSource(s.id, 'verified')}>
                      <CircleCheck size={13} /> Verify
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => reviewSource(s.id, 'rejected')}>
                      <CircleX size={13} /> Reject
                    </Button>
                  </>
                )}
                {s.reviewState === 'verified' && (
                  <Button size="sm" variant="outline" onClick={() => reviewSource(s.id, 'rejected')}>Withdraw</Button>
                )}
              </span>
            </div>
          ))}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 10, borderTop: '1px solid var(--color-border)', paddingTop: 10 }}>
            <TextInput label="Source name" value={src.sourceName} onChange={(v) => setSrc({ ...src, sourceName: v })} placeholder="e.g. Site visit — J. Fearon" />
            <TextInput label="Source type" value={src.sourceType} onChange={(v) => setSrc({ ...src, sourceType: v })} options={SOURCE_TYPES} />
            <TextInput label="Link (optional)" value={src.url} onChange={(v) => setSrc({ ...src, url: v })} />
            <TextInput label="Observed on" value={src.observedAt} onChange={(v) => setSrc({ ...src, observedAt: v })} type="date" />
            <TextInput label="Licence / permission" value={src.licence} onChange={(v) => setSrc({ ...src, licence: v })} placeholder="e.g. Owner consent by email" />
            <TextInput label="What we may publish" value={src.permissionScope} onChange={(v) => setSrc({ ...src, permissionScope: v })} />
            <div style={{ gridColumn: '1 / -1' }}>
              <TextInput label="Evidence notes" value={src.notes} onChange={(v) => setSrc({ ...src, notes: v })} multiline />
            </div>
            <div>
              <Button size="sm" onClick={addSource} disabled={!src.sourceName.trim()}>Record source</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

interface ImportPreview { list: string; note: string; total: number; publishable: number; drafts: number; entries: { ref: number; name: string; publish: boolean; warnings: string[] }[] }
interface ImportOutcome { created: { ref: number; name: string; status: string }[]; skipped: { ref: number; name: string; reason: string }[]; warnings: { ref: number; name: string; warnings: string[] }[] }

/** One-click import of the owner-supplied station list bundled with the site. */
function ImportListCard({ onImported }: { onImported: () => Promise<void> }) {
  const [preview, setPreview] = useState<ImportPreview | null>(null)
  const [busy, setBusy] = useState(false)
  const [outcome, setOutcome] = useState<ImportOutcome | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/admin/map/import-list')
      .then((r) => (r.ok ? r.json() : null))
      .then(setPreview)
      .catch(() => setPreview(null))
  }, [])

  async function run() {
    setBusy(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/map/import-list', { method: 'POST' })
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? 'Import failed.')
      setOutcome(await res.json())
      await onImported()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  if (!preview) return null
  const flagged = preview.entries.filter((e) => e.warnings.length)
  return (
    <div style={{ ...cardStyle, display: 'grid', gap: 10 }}>
      <h3 style={h3Style}>Station list: {preview.list}</h3>
      <p style={{ ...muted, margin: 0 }}>
        {preview.total} stations — {preview.publishable} with connector details will be published; {preview.drafts} without connector details become drafts to complete. {preview.note} Access is marked “not confirmed” and status “unknown” until you record a status check on the station. Running it again skips stations already imported, so your edits are kept.
      </p>
      {flagged.length > 0 && (
        <details>
          <summary style={{ cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>{flagged.length} entries to double-check</summary>
          <ul style={{ ...muted, margin: '8px 0 0', paddingLeft: 18, display: 'grid', gap: 4 }}>
            {flagged.map((e) => (
              <li key={e.ref}>
                #{e.ref} {e.name}: {e.warnings.join(' ')}
              </li>
            ))}
          </ul>
        </details>
      )}
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <Button size="sm" onClick={run} disabled={busy}>{busy ? 'Importing…' : `Import ${preview.total} stations`}</Button>
        {outcome && (
          <span role="status" style={muted}>
            Added {outcome.created.filter((c) => c.status === 'published').length} published and {outcome.created.filter((c) => c.status === 'draft').length} drafts; {outcome.skipped.length} already imported.
          </span>
        )}
        {error && <span role="alert" style={{ ...muted, color: 'var(--color-danger, #c0392b)' }}>{error}</span>}
      </div>
    </div>
  )
}

type CheckChoice = 'working' | 'out_of_service' | 'unknown'

/**
 * Record a Kingston Energies status check. Public map shows "Available" for
 * 7 days after a working check and "Out of service" for 30 days after a
 * fault, then falls back to "Status unknown" until someone checks again.
 */
function StatusCheckCard({ station, onSaved }: { station: Station; onSaved: () => void }) {
  const groups = station.connectorGroups.filter((g): g is Group & { id: string } => !!g.id)
  const [choice, setChoice] = useState<Record<string, CheckChoice | ''>>({})
  const [method, setMethod] = useState('phone_call')
  const [when, setWhen] = useState('')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  const setAll = (c: CheckChoice) => setChoice(Object.fromEntries(groups.map((g) => [g.id, c])))
  const chosen = groups.filter((g) => choice[g.id])

  async function submit() {
    if (!chosen.length) return setMsg('Choose a status for at least one connector group.')
    setBusy(true)
    setMsg(null)
    const res = await fetch(`/api/admin/map/stations/${station.id}/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        checks: chosen.map((g) => ({ groupId: g.id, state: choice[g.id] })),
        method,
        note: note.trim() || null,
        observedAt: when ? new Date(when).toISOString() : null,
      }),
    })
    const d = await res.json().catch(() => ({}))
    setBusy(false)
    if (!res.ok) return setMsg(d.error ?? 'Could not save the status check.')
    setChoice({})
    setNote('')
    setWhen('')
    setMsg('Status saved — the public map shows it within a minute.')
    onSaved()
  }

  const btn = (g: Group & { id: string }, c: CheckChoice, label: string) => (
    <button
      type="button"
      aria-pressed={choice[g.id] === c}
      onClick={() => setChoice({ ...choice, [g.id]: choice[g.id] === c ? '' : c })}
      style={{
        padding: '6px 12px',
        borderRadius: 999,
        border: '1px solid var(--color-border-strong)',
        background: choice[g.id] === c ? (c === 'working' ? '#3f9d2a' : c === 'out_of_service' ? '#d9534f' : '#6b7873') : 'transparent',
        color: choice[g.id] === c ? '#fff' : 'inherit',
        fontSize: 13,
        fontWeight: 600,
        cursor: 'pointer',
      }}
    >
      {label}
    </button>
  )

  return (
    <div style={{ ...cardStyle, display: 'grid', gap: 12 }}>
      <h3 style={{ ...h3Style, margin: 0 }}>Charger status</h3>
      <p style={{ ...muted, margin: 0 }}>
        Confirm whether each connector is working. The map shows <strong>Available</strong> for 7 days after a working check and <strong>Out of service</strong> for 30 days after a fault, then <strong>Status unknown</strong> until someone checks again. Only record what you actually confirmed.
      </p>
      {groups.map((g) => (
        <div key={g.id} style={{ display: 'grid', gap: 6, borderTop: '1px solid var(--color-border)', paddingTop: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            <strong style={{ fontSize: 14 }}>
              {g.connectorType} · {g.currentType}
              {g.maxPowerKw != null ? ` · ${g.maxPowerKw} kW` : ''}
              {g.count != null ? ` · ×${g.count}` : ''}
            </strong>
            {g.status && <Badge tone={STATUS_TONE[g.status.state]}>{STATUS_LABEL[g.status.state]}</Badge>}
          </div>
          {g.status && <span style={muted}>Now showing: {g.status.detail}</span>}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }} role="group" aria-label={`${g.connectorType} status`}>
            {btn(g, 'working', 'Working')}
            {btn(g, 'out_of_service', 'Out of service')}
            {btn(g, 'unknown', 'Unknown')}
          </div>
        </div>
      ))}
      {groups.length > 1 && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Button size="sm" variant="outline" onClick={() => setAll('working')}>All working</Button>
          <Button size="sm" variant="outline" onClick={() => setAll('out_of_service')}>All out of service</Button>
        </div>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 10 }}>
        <label style={{ display: 'grid', gap: 4, fontSize: 13 }}>
          <span>How was it confirmed?</span>
          <select value={method} onChange={(e) => setMethod(e.target.value)} style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid var(--color-border-strong)' }}>
            {CHECK_METHODS.map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </label>
        <label style={{ display: 'grid', gap: 4, fontSize: 13 }}>
          <span>When checked (blank = now)</span>
          <input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid var(--color-border-strong)' }} />
        </label>
        <TextInput label="Note (internal, optional)" value={note} onChange={setNote} />
      </div>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <Button size="sm" onClick={submit} disabled={busy}>{busy ? 'Saving…' : 'Save status check'}</Button>
        {msg && <span role="status" style={muted}>{msg}</span>}
      </div>
    </div>
  )
}
