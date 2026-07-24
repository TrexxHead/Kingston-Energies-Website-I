'use client'

import { useCallback, useEffect, useState } from 'react'
import { Plus, Trash2, Tag } from 'lucide-react'
import { cardStyle, h3Style } from '../ui/card'
import Badge from '../ui/Badge'
import Button from '../ui/Button'
import Modal from '../ui/Modal'
import TextInput from '../ui/TextInput'
import { fmt } from '../mockData'

interface Code {
  id: string
  code: string
  type: 'PERCENT' | 'FIXED'
  value: number
  minSpend: number | null
  active: boolean
  expiresAt: string | null
  description: string | null
}

const emptyForm = { code: '', type: 'PERCENT', value: '', minSpend: '', expiresAt: '', description: '' }

/**
 * Live discount-code manager. Codes created here work at checkout immediately —
 * pick a percent or fixed-J$ rate and optional conditions (minimum spend,
 * expiry). Toggle active, delete, all reflected on the storefront.
 */
export default function DiscountCodesCard() {
  const [codes, setCodes] = useState<Code[]>([])
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    const res = await fetch('/api/admin/discount-codes')
    if (res.ok) setCodes((await res.json()).codes)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const create = async () => {
    setError('')
    if (!form.code.trim() || !form.value || Number(form.value) <= 0) {
      setError('Enter a code and a positive value.')
      return
    }
    setBusy(true)
    const res = await fetch('/api/admin/discount-codes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code: form.code,
        type: form.type,
        value: Number(form.value),
        minSpend: form.minSpend ? Number(form.minSpend) : undefined,
        expiresAt: form.expiresAt || undefined,
        description: form.description || undefined,
      }),
    })
    setBusy(false)
    if (res.ok) {
      setForm(emptyForm)
      setOpen(false)
      load()
    } else {
      setError((await res.json().catch(() => ({}))).error ?? 'Could not create the code.')
    }
  }

  const toggle = async (c: Code) => {
    await fetch(`/api/admin/discount-codes/${c.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: !c.active }),
    })
    load()
  }

  const remove = async (id: string) => {
    await fetch(`/api/admin/discount-codes/${id}`, { method: 'DELETE' })
    load()
  }

  const rate = (c: Code) => (c.type === 'PERCENT' ? `${c.value}% off` : `${fmt(c.value)} off`)

  return (
    <div style={cardStyle}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <h3 style={{ ...h3Style, margin: 0 }}>Discount codes</h3>
        <Button size="sm" variant="primary" onClick={() => { setForm(emptyForm); setError(''); setOpen(true) }} iconRight={<Plus size={14} />}>New code</Button>
      </div>

      {codes.length === 0 ? (
        <p style={{ fontSize: 12.5, color: 'var(--color-text-muted)', margin: 0 }}>No codes yet. Create one and it works at checkout instantly.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {codes.map((c) => (
            <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', border: '1px solid var(--color-border)', borderRadius: 10 }}>
              <Tag size={15} style={{ color: 'var(--ke-green-600)', flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 13.5, letterSpacing: '.03em' }}>{c.code}</div>
                <div style={{ fontSize: 11.5, color: 'var(--color-text-subtle)' }}>
                  {rate(c)}
                  {c.minSpend ? ` · min ${fmt(c.minSpend)}` : ''}
                  {c.expiresAt ? ` · until ${c.expiresAt}` : ''}
                </div>
              </div>
              <Badge tone={c.active ? 'green' : 'neutral'} onClick={() => toggle(c)}>{c.active ? 'Active' : 'Paused'}</Badge>
              <button type="button" onClick={() => remove(c.id)} aria-label={`Delete ${c.code}`} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-subtle)', display: 'flex' }}>
                <Trash2 size={15} />
              </button>
            </div>
          ))}
        </div>
      )}

      {open && (
        <Modal
          title="New discount code"
          onClose={() => setOpen(false)}
          footer={
            <>
              <Button size="sm" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button size="sm" variant="primary" onClick={create}>{busy ? 'Creating…' : 'Create code'}</Button>
            </>
          }
        >
          {error && (
            <div style={{ background: 'var(--color-danger-soft)', color: 'var(--color-danger)', borderRadius: 8, padding: '8px 10px', fontSize: 12, marginBottom: 10 }}>{error}</div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <TextInput label="Code" value={form.code} onChange={(v) => setForm({ ...form, code: v.toUpperCase() })} placeholder="SUMMER25" />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <TextInput label="Type" value={form.type} onChange={(v) => setForm({ ...form, type: v })} options={['PERCENT', 'FIXED']} />
              <TextInput label={form.type === 'PERCENT' ? 'Percent (0–100)' : 'Amount (J$)'} value={form.value} onChange={(v) => setForm({ ...form, value: v })} type="number" />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <TextInput label="Min spend (J$, optional)" value={form.minSpend} onChange={(v) => setForm({ ...form, minSpend: v })} type="number" />
              <TextInput label="Expires (optional)" value={form.expiresAt} onChange={(v) => setForm({ ...form, expiresAt: v })} type="date" />
            </div>
            <TextInput label="Note (optional)" value={form.description} onChange={(v) => setForm({ ...form, description: v })} placeholder="e.g. Summer promo" />
          </div>
        </Modal>
      )}
    </div>
  )
}
