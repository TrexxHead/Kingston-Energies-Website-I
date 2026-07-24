'use client'

import { useCallback, useEffect, useState } from 'react'
import { MapPin, Trash2, Star, Plus } from 'lucide-react'
import { hubCard } from '../_components/ui'

interface Address {
  id: string
  label: string | null
  name: string
  phone: string | null
  street: string
  parish: string
  isDefault: boolean
}

const PARISHES = [
  'Kingston', 'St. Andrew', 'St. Catherine', 'Clarendon', 'Manchester', 'St. Elizabeth',
  'Westmoreland', 'Hanover', 'St. James', 'Trelawny', 'St. Ann', 'St. Mary', 'Portland', 'St. Thomas',
]

const empty = { label: '', name: '', phone: '', street: '', parish: 'Kingston' }

export default function AddressesClient() {
  const [addresses, setAddresses] = useState<Address[]>([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState(empty)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    const res = await fetch('/api/hub/addresses')
    if (res.ok) setAddresses((await res.json()).addresses)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const save = async () => {
    setError('')
    if (!form.name.trim() || !form.street.trim()) { setError('Name and street are required.'); return }
    setBusy(true)
    const res = await fetch('/api/hub/addresses', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ label: form.label || undefined, name: form.name, phone: form.phone || undefined, street: form.street, parish: form.parish }),
    })
    setBusy(false)
    if (res.ok) { setForm(empty); setAdding(false); load() }
    else setError((await res.json().catch(() => ({}))).error ?? 'Could not save.')
  }

  const makeDefault = async (id: string) => {
    setAddresses((prev) => prev.map((a) => ({ ...a, isDefault: a.id === id })))
    await fetch(`/api/hub/addresses/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ isDefault: true }) })
    load()
  }

  const remove = async (id: string) => {
    setAddresses((prev) => prev.filter((a) => a.id !== id))
    await fetch(`/api/hub/addresses/${id}`, { method: 'DELETE' })
    load()
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {loading ? (
        <p style={{ fontSize: 13.5, color: 'var(--color-text-muted)' }}>Loading…</p>
      ) : addresses.length === 0 && !adding ? (
        <div style={{ ...hubCard, textAlign: 'center', padding: '40px 24px' }}>
          <MapPin size={24} style={{ color: 'var(--ke-green-600)', margin: '0 auto 10px' }} />
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16 }}>No saved addresses</div>
          <p style={{ fontSize: 13, color: 'var(--color-text-muted)', margin: '6px 0 16px' }}>Save an address to check out faster next time.</p>
          <button type="button" onClick={() => setAdding(true)} style={primaryBtn}>Add address</button>
        </div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14 }}>
            {addresses.map((a) => (
              <div key={a.id} style={{ ...hubCard, padding: 18, position: 'relative' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <MapPin size={15} style={{ color: 'var(--ke-green-600)' }} />
                  <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14 }}>{a.label || 'Address'}</span>
                  {a.isDefault && <span style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--ke-green-700)', background: 'var(--ke-green-50,#eef7ee)', borderRadius: 999, padding: '2px 8px' }}>Default</span>}
                </div>
                <div style={{ fontSize: 13, color: 'var(--color-text)' }}>{a.name}</div>
                <div style={{ fontSize: 13, color: 'var(--color-text-muted)', marginTop: 2 }}>{a.street}, {a.parish}</div>
                {a.phone && <div style={{ fontSize: 12.5, color: 'var(--color-text-muted)', marginTop: 2 }}>{a.phone}</div>}
                <div style={{ display: 'flex', gap: 14, marginTop: 12 }}>
                  {!a.isDefault && (
                    <button type="button" onClick={() => makeDefault(a.id)} style={linkBtn}><Star size={13} /> Set default</button>
                  )}
                  <button type="button" onClick={() => remove(a.id)} style={{ ...linkBtn, color: 'var(--color-danger,#dc2626)' }}><Trash2 size={13} /> Remove</button>
                </div>
              </div>
            ))}
          </div>

          {adding ? (
            <div style={{ ...hubCard, padding: 18 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <Field label="Label (optional)"><input value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} placeholder="Home" style={input} /></Field>
                <Field label="Full name"><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} style={input} /></Field>
                <Field label="Phone (optional)"><input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="876…" style={input} /></Field>
                <Field label="Parish">
                  <select value={form.parish} onChange={(e) => setForm({ ...form, parish: e.target.value })} style={{ ...input, appearance: 'none' }}>
                    {PARISHES.map((p) => <option key={p}>{p}</option>)}
                  </select>
                </Field>
                <div style={{ gridColumn: '1 / -1' }}>
                  <Field label="Street address"><input value={form.street} onChange={(e) => setForm({ ...form, street: e.target.value })} placeholder="12 Hope Road" style={input} /></Field>
                </div>
              </div>
              {error && <p style={{ color: 'var(--color-danger,#dc2626)', fontSize: 12.5, margin: '10px 0 0' }}>{error}</p>}
              <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
                <button type="button" onClick={save} disabled={busy} style={{ ...primaryBtn, opacity: busy ? 0.6 : 1 }}>{busy ? 'Saving…' : 'Save address'}</button>
                <button type="button" onClick={() => { setAdding(false); setError('') }} style={ghostBtn}>Cancel</button>
              </div>
            </div>
          ) : (
            <button type="button" onClick={() => setAdding(true)} style={{ ...ghostBtn, alignSelf: 'flex-start', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <Plus size={15} /> Add another address
            </button>
          )}
        </>
      )}
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: 'block' }}>
      <span style={{ display: 'block', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 12.5, marginBottom: 5 }}>{label}</span>
      {children}
    </label>
  )
}

const input = { width: '100%', height: 40, padding: '0 12px', border: '1px solid var(--color-border)', borderRadius: 10, fontSize: 13.5, fontFamily: 'var(--font-body)', background: '#fff' } as const
const primaryBtn = { padding: '10px 20px', borderRadius: 999, background: 'var(--color-primary)', color: '#fff', border: 'none', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 13.5, cursor: 'pointer' } as const
const ghostBtn = { padding: '10px 18px', borderRadius: 999, background: 'transparent', color: 'var(--color-text)', border: '1px solid var(--color-border)', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 13.5, cursor: 'pointer' } as const
const linkBtn = { display: 'inline-flex', alignItems: 'center', gap: 5, background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 12.5, color: 'var(--color-text-muted)' } as const
