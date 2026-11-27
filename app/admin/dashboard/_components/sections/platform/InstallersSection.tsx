'use client'

import { useCallback, useEffect, useState } from 'react'
import { Plus } from 'lucide-react'
import { cardStyle, h3Style } from '../../ui/card'
import Button from '../../ui/Button'
import Badge from '../../ui/Badge'
import TextInput from '../../ui/TextInput'
import { PARISHES } from '@/lib/map/parishes'
import { INSTALLER_SERVICES, publishProblem } from '@/lib/installers'

interface Installer {
  id: string
  name: string
  business: string | null
  parishes: string[]
  services: string[]
  phone: string | null
  email: string | null
  website: string | null
  licenceType: string | null
  licenceNumber: string | null
  licenceExpires: string | null
  evidenceNote: string | null
  status: string
  createdBy: string | null
  verifiedBy: string | null
  verifiedAt: string | null
}
type Form = { name: string; business: string; parishes: string[]; services: string[]; phone: string; email: string; website: string; licenceType: string; licenceNumber: string; licenceExpires: string; evidenceNote: string }
const EMPTY: Form = { name: '', business: '', parishes: [], services: [], phone: '', email: '', website: '', licenceType: '', licenceNumber: '', licenceExpires: '', evidenceNote: '' }
const muted = { color: 'var(--color-text-muted)', fontSize: 13 } as const

/** Verified installer directory (roadmap W4): enter → record licence evidence → verify → publish. */
export default function InstallersSection() {
  const [list, setList] = useState<Installer[]>([])
  const [editing, setEditing] = useState<string | 'new' | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const load = useCallback(async () => {
    const r = await fetch('/api/admin/installers')
    if (r.ok) setList((await r.json()).installers)
  }, [])
  useEffect(() => {
    load()
  }, [load])

  async function act(id: string, action: string) {
    const r = await fetch(`/api/admin/installers/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action }) })
    const d = await r.json()
    setMsg(r.ok ? (d.warning ?? `Done: ${action}.`) : d.error)
    load()
  }

  if (editing) return <Editor installer={list.find((i) => i.id === editing)} onDone={(m) => { setEditing(null); if (m) setMsg(m); load() }} />

  return (
    <div style={{ ...cardStyle, display: 'grid', gap: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <h3 style={{ ...h3Style, margin: 0 }}>Installer directory</h3>
        <Button size="sm" onClick={() => setEditing('new')} iconRight={<Plus size={14} />}>Add installer</Button>
      </div>
      <p style={{ ...muted, margin: 0 }}>
        A listing goes public at /installers only after you’ve seen the licence (e.g. the Government Electrical Inspectorate licence), noted what you saw, and an admin has verified it. It drops off automatically when the licence expires. Changing licence details clears verification.
      </p>
      {msg && <p role="status" style={{ fontSize: 13 }}>{msg}</p>}
      {list.length === 0 ? (
        <p style={muted}>No installers yet.</p>
      ) : (
        list.map((i) => {
          const problem = publishProblem(i)
          return (
            <div key={i.id} style={{ borderTop: '1px solid var(--color-border)', paddingTop: 10, display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
              <div style={{ fontSize: 13.5 }}>
                <Badge tone={i.status === 'published' ? 'green' : i.status === 'suspended' ? 'red' : 'neutral'}>{i.status}</Badge> <strong>{i.name}</strong>
                {i.business ? ` · ${i.business}` : ''}
                <div style={muted}>
                  {i.licenceType ?? 'No licence recorded'}
                  {i.licenceNumber ? ` #${i.licenceNumber}` : ''}
                  {i.licenceExpires ? ` · expires ${i.licenceExpires.slice(0, 10)}` : ''}
                  {i.verifiedAt ? ` · verified by ${i.verifiedBy} on ${new Date(i.verifiedAt).toLocaleDateString('en-JM')}` : ' · not verified'}
                </div>
                {problem && i.status !== 'suspended' && <div style={{ ...muted, color: 'var(--color-warning-strong)' }}>{problem}</div>}
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'start' }}>
                <Button size="sm" variant="outline" onClick={() => setEditing(i.id)}>Edit</Button>
                {!i.verifiedAt && <Button size="sm" variant="outline" onClick={() => act(i.id, 'verify')}>I’ve checked the evidence</Button>}
                {i.status !== 'published' && !problem && <Button size="sm" onClick={() => act(i.id, 'publish')}>Publish</Button>}
                {i.status === 'published' && <Button size="sm" variant="outline" onClick={() => act(i.id, 'unpublish')}>Unpublish</Button>}
                {i.status !== 'suspended' && <Button size="sm" variant="outline" onClick={() => act(i.id, 'suspend')}>Suspend</Button>}
              </div>
            </div>
          )
        })
      )}
    </div>
  )
}

function Editor({ installer, onDone }: { installer?: Installer; onDone: (msg?: string) => void }) {
  const [f, setF] = useState<Form>(
    installer
      ? { ...EMPTY, ...Object.fromEntries(Object.entries(installer).map(([k, v]) => [k, v ?? ''])), parishes: installer.parishes, services: installer.services, licenceExpires: installer.licenceExpires?.slice(0, 10) ?? '' }
      : EMPTY,
  )
  const [err, setErr] = useState<string | null>(null)
  const set = (k: keyof Form) => (v: string) => setF({ ...f, [k]: v })
  const toggle = (k: 'parishes' | 'services', v: string) => setF({ ...f, [k]: f[k].includes(v) ? f[k].filter((x) => x !== v) : [...f[k], v] })

  async function save() {
    setErr(null)
    const body = { ...f, business: f.business || null, phone: f.phone || null, licenceType: f.licenceType || null, licenceNumber: f.licenceNumber || null, evidenceNote: f.evidenceNote || null }
    const r = await fetch(installer ? `/api/admin/installers/${installer.id}` : '/api/admin/installers', { method: installer ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    const d = await r.json()
    if (!r.ok) return setErr(d.error)
    onDone(d.warning ?? 'Saved.')
  }

  return (
    <div style={{ ...cardStyle, display: 'grid', gap: 12 }}>
      <h3 style={{ ...h3Style, margin: 0 }}>{installer ? `Edit ${installer.name}` : 'New installer (draft)'}</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 10 }}>
        <TextInput label="Name" value={f.name} onChange={set('name')} />
        <TextInput label="Business name" value={f.business} onChange={set('business')} />
        <TextInput label="Phone" value={f.phone} onChange={set('phone')} />
        <TextInput label="Email" value={f.email} onChange={set('email')} />
        <TextInput label="Website" value={f.website} onChange={set('website')} />
      </div>
      <fieldset style={{ border: 0, padding: 0, margin: 0, display: 'flex', gap: 10, flexWrap: 'wrap', ...muted }}>
        <legend style={{ fontWeight: 600, marginBottom: 6 }}>Services</legend>
        {INSTALLER_SERVICES.map((s) => (
          <label key={s} style={{ display: 'inline-flex', gap: 4, alignItems: 'center' }}><input type="checkbox" checked={f.services.includes(s)} onChange={() => toggle('services', s)} /> {s}</label>
        ))}
      </fieldset>
      <fieldset style={{ border: 0, padding: 0, margin: 0, display: 'flex', gap: 10, flexWrap: 'wrap', ...muted }}>
        <legend style={{ fontWeight: 600, marginBottom: 6 }}>Parishes served</legend>
        {PARISHES.map((p) => (
          <label key={p.id} style={{ display: 'inline-flex', gap: 4, alignItems: 'center' }}><input type="checkbox" checked={f.parishes.includes(p.id)} onChange={() => toggle('parishes', p.id)} /> {p.name}</label>
        ))}
      </fieldset>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 10 }}>
        <TextInput label="Licence type" value={f.licenceType} onChange={set('licenceType')} placeholder="Licensed electrician (Government Electrical Inspectorate)" />
        <TextInput label="Licence number" value={f.licenceNumber} onChange={set('licenceNumber')} />
        <TextInput label="Licence expires" type="date" value={f.licenceExpires} onChange={set('licenceExpires')} />
      </div>
      <TextInput label="Evidence you saw (what, where, when, who)" value={f.evidenceNote} onChange={set('evidenceNote')} multiline placeholder="Saw original licence card at their office, 14 Oct 2026 — J. Brown" />
      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        <Button size="sm" onClick={save}>Save</Button>
        <Button size="sm" variant="outline" onClick={() => onDone()}>Cancel</Button>
        {err && <span role="alert" style={{ ...muted, color: 'var(--color-danger)' }}>{err}</span>}
      </div>
    </div>
  )
}
