'use client'

import { useCallback, useEffect, useState } from 'react'
import { Plus, Trash2, Send, Mail, MessageSquare, Bell, Share2, Link2, Check } from 'lucide-react'
import { cardStyle, h3Style } from '../ui/card'
import Badge from '../ui/Badge'
import Button from '../ui/Button'
import Modal from '../ui/Modal'
import TextInput from '../ui/TextInput'
import { fmt } from '../mockData'

type Channel = 'EMAIL' | 'SMS' | 'PUSH' | 'SOCIAL'
type Status = 'DRAFT' | 'SCHEDULED' | 'SENT'

interface Campaign {
  id: string
  name: string
  channel: Channel
  category: string | null
  subject: string | null
  body: string | null
  status: Status
  scheduledAt: string | null
  recipientCount: number | null
  sentAt: string | null
  segment: { id: string; name: string } | null
  discountCode: { id: string; code: string } | null
  spend: number | null
  attributedOrders: number
  attributedRevenue: number
  trackingLink: string
}

interface Segment {
  id: string
  name: string
  size: number
}

interface DiscountCode {
  id: string
  code: string
}

const CHANNEL_META: Record<Channel, { icon: typeof Mail; tone: 'blue' | 'green' | 'orange' | 'neutral' }> = {
  EMAIL: { icon: Mail, tone: 'blue' },
  SMS: { icon: MessageSquare, tone: 'green' },
  PUSH: { icon: Bell, tone: 'orange' },
  SOCIAL: { icon: Share2, tone: 'neutral' },
}
const STATUS_TONE: Record<Status, 'neutral' | 'orange' | 'green'> = { DRAFT: 'neutral', SCHEDULED: 'orange', SENT: 'green' }
const CATEGORIES = ['Promotion', 'Newsletter', 'Product launch', 'Re-engagement', 'Announcement', 'Other']
const NONE = '(everyone / none)'

const emptyForm = { name: '', channel: 'EMAIL' as Channel, category: 'Promotion', subject: '', body: '', scheduledAt: '', segmentId: NONE, discountCodeId: NONE, spend: '' }

export default function CampaignsCard() {
  const [items, setItems] = useState<Campaign[]>([])
  const [segments, setSegments] = useState<Segment[]>([])
  const [codes, setCodes] = useState<DiscountCode[]>([])
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [msg, setMsg] = useState('')
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const load = useCallback(async () => {
    const res = await fetch('/api/admin/campaigns')
    if (res.ok) setItems((await res.json()).campaigns)
  }, [])

  useEffect(() => {
    load()
    fetch('/api/admin/segments').then((r) => (r.ok ? r.json() : null)).then((d) => d && setSegments(d.segments))
    fetch('/api/admin/discount-codes').then((r) => (r.ok ? r.json() : null)).then((d) => d && setCodes(d.codes))
  }, [load])

  const create = async () => {
    setError('')
    if (!form.name.trim()) { setError('Give the campaign a name.'); return }
    setBusy(true)
    const segment = segments.find((s) => s.name === form.segmentId)
    const code = codes.find((c) => c.code === form.discountCodeId)
    const res = await fetch('/api/admin/campaigns', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: form.name,
        channel: form.channel,
        category: form.category,
        subject: form.subject || undefined,
        body: form.body || undefined,
        scheduledAt: form.scheduledAt || undefined,
        segmentId: segment?.id ?? null,
        discountCodeId: code?.id ?? null,
        spend: form.spend ? Number(form.spend) : undefined,
      }),
    })
    setBusy(false)
    if (res.ok) { setForm(emptyForm); setOpen(false); load() }
    else setError((await res.json().catch(() => ({}))).error ?? 'Could not create campaign.')
  }

  const send = async (c: Campaign) => {
    const audience = c.segment ? `segment "${c.segment.name}"` : 'all subscribed customers'
    if (!confirm(c.channel === 'EMAIL' ? `Send "${c.name}" to ${audience} now?` : `Mark "${c.name}" as sent?`)) return
    setMsg('Sending…')
    const res = await fetch(`/api/admin/campaigns/${c.id}/send`, { method: 'POST' })
    const data = await res.json().catch(() => ({}))
    setMsg(res.ok ? data.note : (data.error ?? 'Could not send.'))
    load()
  }

  const remove = async (id: string) => {
    await fetch(`/api/admin/campaigns/${id}`, { method: 'DELETE' })
    load()
  }

  const copyLink = async (c: Campaign) => {
    try {
      await navigator.clipboard.writeText(c.trackingLink)
      setCopiedId(c.id)
      setTimeout(() => setCopiedId((cur) => (cur === c.id ? null : cur)), 1800)
    } catch {
      // clipboard permission denied — nothing to do
    }
  }

  return (
    <div style={cardStyle}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <h3 style={{ ...h3Style, margin: 0 }}>Campaigns</h3>
        <Button size="sm" variant="primary" onClick={() => { setForm(emptyForm); setError(''); setOpen(true) }} iconRight={<Plus size={14} />}>New campaign</Button>
      </div>

      {msg && <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 10 }}>{msg}</div>}

      {items.length === 0 ? (
        <p style={{ fontSize: 12.5, color: 'var(--color-text-muted)', margin: 0 }}>No campaigns yet. Create one. Email blasts send for real, on schedule.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {items.map((c) => {
            const meta = CHANNEL_META[c.channel]
            const Icon = meta.icon
            return (
              <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '10px 12px', border: '1px solid var(--color-border)', borderRadius: 11 }}>
                <span style={{ width: 30, height: 30, borderRadius: 9, background: 'var(--ke-gray-50,#f5f7f5)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)', flexShrink: 0 }}>
                  <Icon size={15} />
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 13.5 }}>{c.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--color-text-subtle)' }}>
                    {c.channel}{c.category ? ` · ${c.category}` : ''}
                    {c.segment ? ` · ${c.segment.name}` : ' · everyone'}
                    {c.discountCode ? ` · ${c.discountCode.code}` : ''}
                    {c.status === 'SENT' && c.recipientCount != null ? ` · ${c.recipientCount} sent${c.sentAt ? ` ${c.sentAt}` : ''}` : ''}
                    {c.status === 'SCHEDULED' && c.scheduledAt ? ` · ${c.scheduledAt.replace('T', ' ')}` : ''}
                  </div>
                  {c.status === 'SENT' && (
                    <div style={{ fontSize: 11, color: c.attributedRevenue > 0 ? 'var(--ke-green-700)' : 'var(--color-text-subtle)', marginTop: 2 }}>
                      {c.attributedRevenue > 0 ? `${fmt(c.attributedRevenue)} attributed · ${c.attributedOrders} orders` : 'No attributed orders yet'}
                    </div>
                  )}
                </div>
                <Badge tone={STATUS_TONE[c.status]}>{c.status[0] + c.status.slice(1).toLowerCase()}</Badge>
                <button
                  type="button"
                  onClick={() => copyLink(c)}
                  aria-label="Copy tracking link"
                  title="Copy tracking link (attributes orders to this campaign when clicked)"
                  style={iconBtn}
                >
                  {copiedId === c.id ? <Check size={13} color="var(--ke-green-600)" /> : <Link2 size={13} />}
                </button>
                {c.status !== 'SENT' && (
                  <button type="button" onClick={() => send(c)} aria-label="Send" title="Send / action now" style={iconBtn}><Send size={13} /></button>
                )}
                <button type="button" onClick={() => remove(c.id)} aria-label="Delete" style={iconBtn}><Trash2 size={13} /></button>
              </div>
            )
          })}
        </div>
      )}

      {open && (
        <Modal
          title="New campaign"
          width={520}
          onClose={() => setOpen(false)}
          footer={
            <>
              <Button size="sm" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button size="sm" variant="primary" onClick={create}>{busy ? 'Saving…' : 'Create'}</Button>
            </>
          }
        >
          {error && <div style={{ background: 'var(--color-danger-soft)', color: 'var(--color-danger)', borderRadius: 8, padding: '8px 10px', fontSize: 12, marginBottom: 10 }}>{error}</div>}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <TextInput label="Name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} placeholder="August flash sale blast" />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <TextInput label="Channel" value={form.channel} onChange={(v) => setForm({ ...form, channel: v as Channel })} options={['EMAIL', 'SMS', 'PUSH', 'SOCIAL']} />
              <TextInput label="Category" value={form.category} onChange={(v) => setForm({ ...form, category: v })} options={CATEGORIES} />
            </div>
            {form.channel === 'EMAIL' && (
              <>
                <TextInput label="Subject" value={form.subject} onChange={(v) => setForm({ ...form, subject: v })} placeholder="⚡ 20% off this weekend" />
                <label style={{ display: 'block' }}>
                  <span style={{ display: 'block', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 12.5, marginBottom: 6 }}>Message</span>
                  <textarea value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} rows={5} placeholder="Write your email…" style={{ width: '100%', padding: '10px 12px', border: '1.5px solid var(--color-border)', borderRadius: 11, fontFamily: 'var(--font-body)', fontSize: 13.5, resize: 'vertical', outline: 'none' }} />
                </label>
              </>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <TextInput
                label="Audience"
                value={form.segmentId}
                onChange={(v) => setForm({ ...form, segmentId: v })}
                options={[NONE, ...segments.map((s) => s.name)]}
              />
              <TextInput
                label="Linked discount code (optional)"
                value={form.discountCodeId}
                onChange={(v) => setForm({ ...form, discountCodeId: v })}
                options={[NONE, ...codes.map((c) => c.code)]}
              />
            </div>
            <p style={{ fontSize: 11, color: 'var(--color-text-subtle)', margin: 0 }}>
              {form.segmentId === NONE
                ? 'No segment picked — sends to every subscribed customer.'
                : `Sends to the "${form.segmentId}" segment (${segments.find((s) => s.name === form.segmentId)?.size ?? 0} customers right now).`}
              {' '}Every campaign gets its own tracking link (copy it from the list below once created) — orders from anyone who clicks it are attributed automatically. Linking a discount code adds a second way to attribute results, useful when you're sharing outside a trackable link (e.g. reading a code aloud).
            </p>
            <TextInput label="Schedule for (optional)" value={form.scheduledAt} onChange={(v) => setForm({ ...form, scheduledAt: v })} type="datetime-local" />
            <TextInput label="Spend (J$, optional)" value={form.spend} onChange={(v) => setForm({ ...form, spend: v })} type="number" placeholder="For a paid boost — used to judge ROI" />
            <p style={{ fontSize: 11.5, color: 'var(--color-text-subtle)', margin: 0 }}>
              Email campaigns send via Resend and check the suppression list automatically. SMS/push/social are tracked here and actioned through your external tooling.
            </p>
          </div>
        </Modal>
      )}
    </div>
  )
}

const iconBtn = {
  width: 28, height: 28, borderRadius: 8, border: '1px solid var(--color-border)', background: 'var(--color-surface)',
  cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)', flexShrink: 0,
} as const
