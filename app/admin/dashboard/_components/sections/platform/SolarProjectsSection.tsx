'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Plus, Trash2, ArrowLeft, Upload, Link2, Eye, EyeOff } from 'lucide-react'
import { cardStyle, h3Style } from '../../ui/card'
import Button from '../../ui/Button'
import Badge from '../../ui/Badge'
import { PARISHES } from '@/lib/map/parishes'
import { STAGES, stageLabel, DOC_KINDS, QUOTE_SECTIONS, quoteTotals, designSummaryLines, TYPE_LABEL, type DesignSnapshot, type Quote, type QuoteLine, type QuoteSection, type DocKind } from '@/lib/solarProjects'

/**
 * Solar projects (staff): every design sent from /solar/design, carried
 * through survey, quote, approvals, installation, inspection and handover.
 * The quote builder follows the PV course capstone: sizing, materials by
 * section, labour, inspection, subtotal / GCT / total. Prices are entered here.
 */

interface Row {
  id: string
  projectNo: string
  customerName: string
  email: string
  phone: string
  parish: string | null
  stage: string
  quoteStatus: string
  design: DesignSnapshot
  bookingNo: string | null
  createdAt: string
  updatedAt: string
}
interface Event {
  id: string
  stage: string | null
  note: string | null
  customerVisible: boolean
  createdBy: string | null
  createdAt: string
}
interface Doc {
  id: string
  kind: string
  name: string
  path: string | null
  url: string | null
  customerVisible: boolean
  createdAt: string
}
interface Project extends Row {
  address: string | null
  note: string | null
  exportsToGrid: boolean
  quote: Quote | null
  quoteSentAt: string | null
  quoteAcceptedAt: string | null
  staffNote: string | null
  events: Event[]
  documents: Doc[]
}

const muted = { color: 'var(--color-text-muted)', fontSize: 13 } as const
const field = { width: '100%', height: 36, padding: '0 10px', borderRadius: 10, border: '1px solid var(--color-border-strong)', background: 'var(--color-surface)', color: 'var(--color-text)', fontSize: 13.5 } as const
const QUOTE_TONE: Record<string, 'green' | 'blue' | 'orange' | 'neutral' | 'red'> = { none: 'neutral', draft: 'orange', sent: 'blue', accepted: 'green', declined: 'red' }
const money = (n: number) => `J$${n.toLocaleString('en-JM', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

export default function SolarProjectsSection() {
  const [filter, setFilter] = useState('open')
  const [rows, setRows] = useState<Row[]>([])
  const [openId, setOpenId] = useState<string | null>(null)
  const load = useCallback(async () => {
    const r = await fetch(`/api/admin/solar-projects?stage=${filter}`)
    if (r.ok) setRows((await r.json()).projects)
  }, [filter])
  useEffect(() => {
    load()
  }, [load])
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get('id')
    if (id) setOpenId(id)
  }, [])

  if (openId) return <ProjectDetail id={openId} onBack={() => (setOpenId(null), load())} />

  return (
    <div style={cardStyle}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <h3 style={{ ...h3Style, margin: 0 }}>Solar projects</h3>
        <select value={filter} onChange={(e) => setFilter(e.target.value)} style={{ ...field, width: 'auto' }} aria-label="Filter by stage">
          <option value="open">Open</option>
          <option value="all">All</option>
          {STAGES.map((s) => (
            <option key={s.id} value={s.id}>{s.label}</option>
          ))}
          <option value="cancelled">Cancelled</option>
        </select>
      </div>
      {rows.length === 0 ? (
        <p style={{ ...muted, margin: '14px 0 0' }}>No projects here yet. Customers send them from Design your system (/solar/design).</p>
      ) : (
        <div style={{ overflowX: 'auto', marginTop: 12 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5, minWidth: 720 }}>
            <thead>
              <tr style={{ textAlign: 'left', color: 'var(--color-text-muted)' }}>
                {['Project', 'Customer', 'System', 'Stage', 'Quote', 'Updated'].map((h) => (
                  <th key={h} style={{ padding: '8px 6px', borderBottom: '1px solid var(--color-border)', fontWeight: 600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} onClick={() => setOpenId(r.id)} style={{ cursor: 'pointer' }}>
                  <td style={td}><span style={{ fontFamily: 'var(--font-mono)' }}>{r.projectNo}</span></td>
                  <td style={td}>
                    {r.customerName}
                    <div style={muted}>{PARISHES.find((p) => p.id === r.parish)?.name ?? ''} · {r.phone}</div>
                  </td>
                  <td style={td}>
                    {r.design.kwp.toFixed(2)} kW {r.design.batteryKwh ? `+ ${r.design.batteryKwh.toFixed(1)} kWh` : ''}
                    <div style={muted}>{TYPE_LABEL[r.design.type]}</div>
                  </td>
                  <td style={td}>{stageLabel(r.stage)}{r.bookingNo && <div style={muted}>Survey {r.bookingNo}</div>}</td>
                  <td style={td}><Badge tone={QUOTE_TONE[r.quoteStatus] ?? 'neutral'}>{r.quoteStatus}</Badge></td>
                  <td style={td}>{new Date(r.updatedAt).toLocaleDateString('en-JM')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
const td = { padding: '10px 6px', borderBottom: '1px solid var(--color-border)', verticalAlign: 'top' } as const

function ProjectDetail({ id, onBack }: { id: string; onBack: () => void }) {
  const [p, setP] = useState<Project | null>(null)
  const [quote, setQuote] = useState<Quote | null>(null)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [stage, setStage] = useState('')
  const [note, setNote] = useState('')
  const [visible, setVisible] = useState(true)
  const [notify, setNotify] = useState(true)
  const [staffNote, setStaffNote] = useState('')

  const load = useCallback(async () => {
    const r = await fetch(`/api/admin/solar-projects/${id}`)
    if (!r.ok) return setMsg({ ok: false, text: 'Could not load the project.' })
    const j = await r.json()
    setP(j.project)
    setQuote(j.project.quote ?? j.suggestedQuote)
    setStage(j.project.stage)
    setStaffNote(j.project.staffNote ?? '')
  }, [id])
  useEffect(() => {
    load()
  }, [load])

  async function patch(body: Record<string, unknown>, ok: string) {
    setMsg(null)
    const r = await fetch(`/api/admin/solar-projects/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    const j = await r.json().catch(() => ({}))
    setMsg(r.ok ? { ok: true, text: ok } : { ok: false, text: j.error ?? 'Not saved.' })
    if (r.ok) load()
    return r.ok
  }

  if (!p || !quote) return <div style={cardStyle}>{msg ? <p style={muted}>{msg.text}</p> : <p style={muted}>Loading…</p>}</div>
  const d = p.design

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div style={cardStyle}>
        <button type="button" onClick={onBack} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'none', border: 0, color: 'var(--color-text-muted)', cursor: 'pointer', padding: 0, fontSize: 13 }}>
          <ArrowLeft size={14} /> All projects
        </button>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginTop: 8 }}>
          <div>
            <h3 style={{ ...h3Style, margin: 0 }}>
              {p.projectNo} · {p.customerName}
            </h3>
            <p style={{ ...muted, margin: '4px 0 0' }}>
              {p.email} · {p.phone} · {PARISHES.find((x) => x.id === p.parish)?.name ?? ''}
              {p.address ? ` · ${p.address}` : ''}
              {p.exportsToGrid ? ' · wants to export (net billing)' : ''}
            </p>
          </div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <Badge tone="blue">{stageLabel(p.stage)}</Badge>
            <Badge tone={QUOTE_TONE[p.quoteStatus] ?? 'neutral'}>Quote: {p.quoteStatus}</Badge>
          </div>
        </div>
        {p.note && <p style={{ margin: '10px 0 0', fontSize: 13.5 }}>Customer: “{p.note}”</p>}
        <ul style={{ margin: '10px 0 0', paddingLeft: 18, fontSize: 13.5, lineHeight: 1.6 }}>
          {designSummaryLines(d).map((l) => (
            <li key={l}>{l}</li>
          ))}
          {d.priceRange && <li>Online price range shown: {money(d.priceRange.low)} – {money(d.priceRange.high)}</li>}
        </ul>
        {msg && <p role="status" style={{ margin: '10px 0 0', fontSize: 13.5, color: msg.ok ? 'var(--color-primary-strong)' : 'var(--color-danger)' }}>{msg.text}</p>}
      </div>

      <div style={cardStyle}>
        <h3 style={h3Style}>Move the project on</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(180px,240px) 1fr', gap: 10 }}>
          <select value={stage} onChange={(e) => setStage(e.target.value)} style={field} aria-label="Stage">
            {STAGES.map((s, i) => (
              <option key={s.id} value={s.id}>{i + 1}. {s.label}</option>
            ))}
            <option value="cancelled">Cancelled</option>
          </select>
          <input value={note} onChange={(e) => setNote(e.target.value)} style={field} placeholder="Note (e.g. Inspection booked for 12 Dec)" aria-label="Note" />
        </div>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginTop: 10, fontSize: 13 }}>
          <label><input type="checkbox" checked={visible} onChange={(e) => setVisible(e.target.checked)} /> Customer can see the note</label>
          <label><input type="checkbox" checked={notify} onChange={(e) => setNotify(e.target.checked)} /> E-mail the customer</label>
        </div>
        <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
          <Button size="sm" disabled={stage === p.stage && !note.trim()} onClick={async () => (await patch({ stage: stage !== p.stage ? stage : undefined, note: note || undefined, customerVisible: visible, notifyCustomer: notify }, 'Updated.')) && setNote('')}>
            Save
          </Button>
        </div>
        {stage === 'approvals' && p.exportsToGrid && <p style={{ ...muted, margin: '10px 0 0' }}>Exporting system: generation licence and JPS Standard Offer Contract before connection, plus the GER inspection.</p>}
      </div>

      <QuoteBuilder quote={quote} setQuote={setQuote} status={p.quoteStatus} onSave={(send) => patch({ quote, sendQuote: send || undefined }, send ? 'Quote sent to the customer.' : 'Quote saved as a draft.')} />

      <Documents project={p} reload={load} setMsg={setMsg} />

      <div style={cardStyle}>
        <h3 style={h3Style}>Staff notes</h3>
        <textarea value={staffNote} onChange={(e) => setStaffNote(e.target.value)} rows={4} style={{ ...field, height: 'auto', padding: 10 }} aria-label="Staff notes" placeholder="Survey findings, roof details, main panel, access… (staff only)" />
        <div style={{ marginTop: 8 }}>
          <Button size="sm" variant="outline" onClick={() => patch({ staffNote }, 'Notes saved.')}>Save notes</Button>
        </div>
        <h3 style={{ ...h3Style, marginTop: 18 }}>History</h3>
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 6 }}>
          {p.events.map((e) => (
            <li key={e.id} style={{ display: 'grid', gridTemplateColumns: '130px 1fr', gap: 10, fontSize: 13 }}>
              <span style={muted}>{new Date(e.createdAt).toLocaleString('en-JM', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}</span>
              <span>
                {e.stage && <strong>{stageLabel(e.stage)}. </strong>}
                {e.note}
                <span style={muted}> — {e.createdBy ?? 'system'}{e.customerVisible ? '' : ' · staff only'}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

function QuoteBuilder({ quote, setQuote, status, onSave }: { quote: Quote; setQuote: (q: Quote) => void; status: string; onSave: (send: boolean) => void }) {
  const totals = useMemo(() => quoteTotals(quote), [quote])
  const setLine = (lid: string, patch: Partial<QuoteLine>) => setQuote({ ...quote, lines: quote.lines.map((l) => (l.id === lid ? { ...l, ...patch } : l)) })
  const addLine = (section: QuoteSection) => setQuote({ ...quote, lines: [...quote.lines, { id: `l${Date.now().toString(36)}`, section, item: 'New item', spec: '', qty: 1, unit: 'ea', unitPrice: null, gct: false }] })
  const num = (s: string) => (s.trim() === '' ? null : Math.max(0, Number(s.replace(/,/g, '')) || 0))
  const sz = quote.sizing
  return (
    <div style={cardStyle}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'baseline' }}>
        <h3 style={{ ...h3Style, margin: 0 }}>Quotation</h3>
        <span style={muted}>{status === 'none' ? 'Started from the online design — check it against the survey.' : `Status: ${status}`}</span>
      </div>
      <h4 style={sub}>Sizing (after the survey)</h4>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(130px,1fr))', gap: 8 }}>
        {(
          [
            ['Panels', 'modules'],
            ['Panel W', 'moduleWatts'],
            ['kWp', 'kwp'],
            ['Inverter kW', 'inverterKw'],
            ['Battery kWh', 'batteryKwh'],
            ['kWh / day', 'expectedDailyKwh'],
          ] as [string, keyof Quote['sizing']][]
        ).map(([l, k]) => (
          <label key={k} style={{ fontSize: 12.5, color: 'var(--color-text-muted)' }}>
            {l}
            <input style={field} inputMode="decimal" value={sz[k] ?? ''} onChange={(e) => setQuote({ ...quote, sizing: { ...sz, [k]: k === 'inverterKw' || k === 'batteryKwh' ? num(e.target.value) : (num(e.target.value) ?? 0) } })} />
          </label>
        ))}
      </div>

      {(Object.keys(QUOTE_SECTIONS) as QuoteSection[]).map((sec) => {
        const lines = quote.lines.filter((l) => l.section === sec)
        return (
          <div key={sec}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h4 style={sub}>{QUOTE_SECTIONS[sec]}</h4>
              <button type="button" onClick={() => addLine(sec)} style={linkBtn}>
                <Plus size={13} /> Add line
              </button>
            </div>
            {lines.map((l) => (
              <div key={l.id} className="ke-qb-row">
                <input style={field} value={l.item} onChange={(e) => setLine(l.id, { item: e.target.value })} aria-label="Item" />
                <input style={field} value={l.spec} onChange={(e) => setLine(l.id, { spec: e.target.value })} aria-label="Specification" placeholder="Specification" />
                <input style={field} inputMode="decimal" value={l.qty} onChange={(e) => setLine(l.id, { qty: num(e.target.value) ?? 0 })} aria-label="Quantity" />
                <input style={field} value={l.unit} onChange={(e) => setLine(l.id, { unit: e.target.value.slice(0, 20) })} aria-label="Unit" />
                <input style={{ ...field, borderColor: l.unitPrice == null ? 'var(--color-warning)' : 'var(--color-border-strong)' }} inputMode="decimal" value={l.unitPrice ?? ''} onChange={(e) => setLine(l.id, { unitPrice: num(e.target.value) })} aria-label="Unit price (J$)" placeholder="Unit J$" />
                <label style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <input type="checkbox" checked={l.gct} onChange={(e) => setLine(l.id, { gct: e.target.checked })} /> GCT
                </label>
                <span style={{ fontSize: 13, textAlign: 'right' }}>{l.unitPrice != null ? money(l.qty * l.unitPrice) : '—'}</span>
                <button type="button" aria-label={`Remove ${l.item}`} onClick={() => setQuote({ ...quote, lines: quote.lines.filter((x) => x.id !== l.id) })} style={linkBtn}>
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )
      })}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))', gap: 8, marginTop: 14 }}>
        <label style={{ fontSize: 12.5, color: 'var(--color-text-muted)' }}>
          GCT rate %
          <input style={field} inputMode="decimal" value={quote.gctRatePct} onChange={(e) => setQuote({ ...quote, gctRatePct: Math.min(50, num(e.target.value) ?? 0) })} />
        </label>
        <label style={{ fontSize: 12.5, color: 'var(--color-text-muted)' }}>
          Valid for (days)
          <input style={field} inputMode="numeric" value={quote.validDays} onChange={(e) => setQuote({ ...quote, validDays: Math.max(1, Math.min(180, Math.round(num(e.target.value) ?? 30))) })} />
        </label>
      </div>
      <label style={{ display: 'block', fontSize: 12.5, color: 'var(--color-text-muted)', marginTop: 8 }}>
        Notes for the customer (terms, deposit, timeline, exclusions)
        <textarea style={{ ...field, height: 'auto', padding: 10 }} rows={3} value={quote.notes} onChange={(e) => setQuote({ ...quote, notes: e.target.value.slice(0, 4000) })} />
      </label>
      <div style={{ display: 'grid', justifyContent: 'end', gap: 4, marginTop: 12, fontSize: 14, textAlign: 'right' }}>
        <span>Subtotal {money(totals.subtotal)}</span>
        <span>GCT {money(totals.gct)}</span>
        <strong style={{ fontSize: 17 }}>Total {money(totals.total)}</strong>
        {totals.unpriced > 0 && <span style={{ color: 'var(--color-warning-strong)', fontSize: 12.5 }}>{totals.unpriced} line{totals.unpriced === 1 ? '' : 's'} without a price</span>}
      </div>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 10 }}>
        <Button size="sm" variant="outline" onClick={() => onSave(false)}>Save draft</Button>
        <Button size="sm" disabled={totals.unpriced > 0 || totals.total <= 0} onClick={() => onSave(true)}>{status === 'sent' ? 'Re-send to customer' : 'Send to customer'}</Button>
      </div>
      <style>{`.ke-qb-row{display:grid;grid-template-columns:minmax(140px,1.2fr) minmax(160px,2fr) 64px 60px 110px 56px 110px 28px;gap:6px;align-items:center;margin-bottom:6px}@media (max-width:1100px){.ke-qb-row{grid-template-columns:1fr 1fr;}}`}</style>
    </div>
  )
}
const sub = { fontFamily: 'var(--font-display)', fontSize: 13.5, margin: '16px 0 8px', color: 'var(--color-text)' } as const
const linkBtn = { display: 'inline-flex', alignItems: 'center', gap: 4, background: 'none', border: 0, color: 'var(--color-primary-strong)', cursor: 'pointer', fontSize: 12.5, padding: 2 } as const

function Documents({ project, reload, setMsg }: { project: Project; reload: () => void; setMsg: (m: { ok: boolean; text: string } | null) => void }) {
  const [kind, setKind] = useState<DocKind>('single_line')
  const [name, setName] = useState('')
  const [link, setLink] = useState('')
  const [visible, setVisible] = useState(true)
  const [busy, setBusy] = useState(false)
  const base = `/api/admin/solar-projects/${project.id}/documents`
  async function upload(file: File) {
    setBusy(true)
    const fd = new FormData()
    fd.set('file', file)
    fd.set('kind', kind)
    fd.set('name', name || file.name)
    fd.set('customerVisible', String(visible))
    const r = await fetch(base, { method: 'POST', body: fd })
    setBusy(false)
    setMsg(r.ok ? { ok: true, text: 'Document added.' } : { ok: false, text: (await r.json().catch(() => ({}))).error ?? 'Upload failed.' })
    if (r.ok) (setName(''), reload())
  }
  async function addLink() {
    const r = await fetch(base, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url: link, kind, name, customerVisible: visible }) })
    setMsg(r.ok ? { ok: true, text: 'Link added.' } : { ok: false, text: (await r.json().catch(() => ({}))).error ?? 'Not added.' })
    if (r.ok) (setLink(''), setName(''), reload())
  }
  return (
    <div style={cardStyle}>
      <h3 style={h3Style}>Documents</h3>
      <p style={{ ...muted, margin: '0 0 10px' }}>Handover pack: as-built single-line diagram, datasheets, test results, settings sheet, serial numbers, inspector’s certificate. Visible documents appear in the customer’s hub.</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))', gap: 8 }}>
        <select value={kind} onChange={(e) => setKind(e.target.value as DocKind)} style={field} aria-label="Kind">
          {(Object.keys(DOC_KINDS) as DocKind[]).map((k) => (
            <option key={k} value={k}>{DOC_KINDS[k]}</option>
          ))}
        </select>
        <input style={field} value={name} onChange={(e) => setName(e.target.value)} placeholder="Name (optional)" aria-label="Document name" />
        <label style={{ ...field, display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
          <Upload size={14} /> {busy ? 'Uploading…' : 'Upload file'}
          <input type="file" accept="application/pdf,image/jpeg,image/png,image/webp" hidden onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
        </label>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 8, marginTop: 8 }}>
        <input style={field} value={link} onChange={(e) => setLink(e.target.value)} placeholder="…or paste an https:// link (e.g. a shared drive file)" aria-label="Link" />
        <Button size="sm" variant="outline" disabled={!/^https:\/\//.test(link)} onClick={addLink}><Link2 size={14} /> Add link</Button>
      </div>
      <label style={{ display: 'block', fontSize: 13, marginTop: 8 }}>
        <input type="checkbox" checked={visible} onChange={(e) => setVisible(e.target.checked)} /> Customer can see it
      </label>
      <ul style={{ listStyle: 'none', margin: '12px 0 0', padding: 0, display: 'grid', gap: 6 }}>
        {project.documents.map((doc) => (
          <li key={doc.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center', padding: '8px 10px', borderRadius: 10, background: 'var(--color-bg-subtle)', fontSize: 13.5 }}>
            <a href={`${base}/${doc.id}`} target="_blank" rel="noopener noreferrer">{doc.name}</a>
            <span style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <span style={muted}>{DOC_KINDS[doc.kind as DocKind] ?? doc.kind}</span>
              <button type="button" style={linkBtn} aria-label={doc.customerVisible ? 'Hide from customer' : 'Show to customer'} title={doc.customerVisible ? 'Visible to customer' : 'Staff only'} onClick={async () => (await fetch(`${base}/${doc.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ customerVisible: !doc.customerVisible }) }), reload())}>
                {doc.customerVisible ? <Eye size={14} /> : <EyeOff size={14} />}
              </button>
              <button type="button" style={linkBtn} aria-label={`Delete ${doc.name}`} onClick={async () => (await fetch(`${base}/${doc.id}`, { method: 'DELETE' }), reload())}>
                <Trash2 size={14} />
              </button>
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

