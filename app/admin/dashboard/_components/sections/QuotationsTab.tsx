'use client'

import { useCallback, useEffect, useState } from 'react'
import { ArrowRight, Edit2, ExternalLink, Mail, Phone, Plus, Send, Trash2 } from 'lucide-react'
import { cardStyle } from '../ui/card'
import Pill from '../ui/Pill'
import Button from '../ui/Button'
import Modal from '../ui/Modal'
import TextInput from '../ui/TextInput'
import { fmt } from '../mockData'
import { quoteTotal } from '@/lib/quotes'
import StatTile from '../ui/StatTile'

type Status = 'NEW' | 'CONTACTED' | 'QUALIFIED' | 'CONVERTED' | 'LOST'

interface QuoteItem {
  name: string
  price: number
  qty: number
}

interface Product {
  id: string
  name: string
  price: number
  salePrice: number | null
}

interface Lead {
  id: string
  name: string
  email: string
  phone: string | null
  status: Status
  quoteItems: QuoteItem[] | null
  quoteShoppingFor: string | null
  quoteArea: string | null
  quoteTimeframe: string | null
  quoteCcEmails: string[]
  convertedOrderId: string | null
  convertedOrderNo: string | null
  createdAt: string
}

const STATUSES: Status[] = ['NEW', 'CONTACTED', 'QUALIFIED', 'CONVERTED', 'LOST']
const STATUS_LABEL: Record<Status, string> = { NEW: 'New', CONTACTED: 'Contacted', QUALIFIED: 'Qualified', CONVERTED: 'Converted', LOST: 'Lost' }

/**
 * Quote requests — the pre-sale half of the pipeline Finance → Sales covers
 * after the fact. Reads the same Lead records as the Marketing → Leads
 * card, filtered to the ones that came in with a real itemized product
 * list (app/contact's "request a quote" flow), so a plain contact-form
 * enquiry with no products attached doesn't clutter a finance-facing view.
 * "Convert to order" funnels a quote straight into the normal Order
 * pipeline — from there it's invoiced exactly like any other sale.
 */
export default function QuotationsTab() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [loaded, setLoaded] = useState(false)
  const [filter, setFilter] = useState<Status | 'ALL'>('ALL')
  const [converting, setConverting] = useState<string | null>(null)
  const [newOpen, setNewOpen] = useState(false)
  const [editingLead, setEditingLead] = useState<Lead | null>(null)
  const [sendingId, setSendingId] = useState<string | null>(null)
  const [products, setProducts] = useState<Product[]>([])

  const load = useCallback(async () => {
    const res = await fetch('/api/admin/leads')
    if (res.ok) setLeads((await res.json()).leads)
    setLoaded(true)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  // Loaded once and reused by both the new-quotation and edit-quotation
  // item pickers — so a typed item name can be matched to a real catalog
  // product (and its live price) instead of staying a free-text label that
  // later fails to match stock on conversion.
  const loadProducts = useCallback(async () => {
    if (products.length) return
    const res = await fetch('/api/admin/products')
    if (res.ok) setProducts((await res.json()).products)
  }, [products.length])

  const sendQuote = async (id: string) => {
    setSendingId(id)
    const res = await fetch(`/api/admin/leads/${id}/quote-email`, { method: 'POST' })
    setSendingId(null)
    if (res.ok) {
      const { sent, of } = await res.json()
      alert(sent > 0 ? `Quotation emailed to ${sent} of ${of} recipient${of === 1 ? '' : 's'}.` : 'Could not send — check that email is configured.')
    } else {
      alert((await res.json().catch(() => ({}))).error ?? 'Could not send this quotation.')
    }
  }

  const quotes = leads.filter((l) => l.quoteItems && l.quoteItems.length > 0)
  const visible = filter === 'ALL' ? quotes : quotes.filter((l) => l.status === filter)
  const open = quotes.filter((l) => l.status !== 'CONVERTED' && l.status !== 'LOST')
  const openValue = open.reduce((sum, l) => sum + quoteTotal(l.quoteItems), 0)
  const convertedThisSet = quotes.filter((l) => l.status === 'CONVERTED')
  const convertedValue = convertedThisSet.reduce((sum, l) => sum + quoteTotal(l.quoteItems), 0)

  const convertToOrder = async (id: string) => {
    setConverting(id)
    const res = await fetch(`/api/admin/leads/${id}/convert`, { method: 'POST' })
    setConverting(null)
    if (res.ok) load()
    else alert((await res.json().catch(() => ({}))).error ?? 'Could not convert this quote.')
  }

  const setStatus = async (id: string, status: Status) => {
    setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, status } : l)))
    await fetch(`/api/admin/leads/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    load()
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {!loaded ? (
        <div style={cardStyle}><p style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>Loading…</p></div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14 }} className="kad-kpi-grid">
            <div style={cardStyle}><StatTile label="Open quotes" value={String(open.length)} sub={fmt(openValue) + ' indicative'} subTone="var(--color-primary)" /></div>
            <div style={cardStyle}><StatTile label="Converted" value={String(convertedThisSet.length)} sub={fmt(convertedValue) + ' became orders'} subTone="var(--color-primary)" /></div>
            <div style={cardStyle}><StatTile label="All quote requests" value={String(quotes.length)} sub="Since launch" /></div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {(['ALL', ...STATUSES] as const).map((s) => (
                <Pill key={s} label={s === 'ALL' ? 'All' : STATUS_LABEL[s]} selected={filter === s} onClick={() => setFilter(s)} />
              ))}
            </div>
            <Button size="sm" variant="primary" onClick={() => { loadProducts(); setNewOpen(true) }} iconRight={<Plus size={14} />}>
              New quotation
            </Button>
          </div>

          {visible.length === 0 ? (
            <div style={cardStyle}>
              <p style={{ fontSize: 13, color: 'var(--color-text-muted)', margin: 0 }}>
                No quote requests{filter !== 'ALL' ? ` with status ${STATUS_LABEL[filter].toLowerCase()}` : ' yet'}.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {visible.map((l) => {
                const total = quoteTotal(l.quoteItems)
                return (
                  <div key={l.id} style={cardStyle}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 10 }}>
                      <div>
                        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14.5 }}>{l.name}</div>
                        <div style={{ fontSize: 11.5, color: 'var(--color-text-subtle)', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginTop: 3 }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><Mail size={11} />{l.email}</span>
                          {l.phone && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><Phone size={11} />{l.phone}</span>}
                          <span>{new Date(l.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>
                          {l.quoteShoppingFor && <span>{l.quoteShoppingFor}</span>}
                          {l.quoteArea && <span>{l.quoteArea}</span>}
                          {l.quoteTimeframe && <span>{l.quoteTimeframe}</span>}
                        </div>
                      </div>
                      <select
                        value={l.status}
                        onChange={(e) => setStatus(l.id, e.target.value as Status)}
                        style={{ height: 30, padding: '0 10px', borderRadius: 8, border: '1px solid var(--color-border)', fontSize: 12.5, background: 'var(--color-surface)' }}
                      >
                        {STATUSES.map((s) => (
                          <option key={s} value={s}>{STATUS_LABEL[s]}</option>
                        ))}
                      </select>
                    </div>

                    <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 10, display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {(l.quoteItems ?? []).map((i, idx) => (
                        <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                          <span>{i.name} × {i.qty}</span>
                          <span style={{ color: 'var(--color-text-muted)' }}>{fmt(i.price * i.qty)}</span>
                        </div>
                      ))}
                    </div>

                    {!l.convertedOrderNo && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--color-border)' }}>
                        <button
                          type="button"
                          onClick={() => { loadProducts(); setEditingLead(l) }}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600, color: 'var(--color-text-muted)', padding: 0 }}
                        >
                          <Edit2 size={12} /> Edit
                        </button>
                        <a
                          href={`/api/admin/leads/${l.id}/quote-email`}
                          target="_blank"
                          rel="noreferrer"
                          style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 600, color: 'var(--color-text-muted)', textDecoration: 'none' }}
                        >
                          <ExternalLink size={12} /> View
                        </a>
                        <button
                          type="button"
                          onClick={() => sendQuote(l.id)}
                          disabled={sendingId === l.id}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'none', border: 'none', cursor: sendingId === l.id ? 'default' : 'pointer', fontSize: 12, fontWeight: 600, color: 'var(--ke-green-700,#15803d)', padding: 0, opacity: sendingId === l.id ? 0.6 : 1 }}
                        >
                          <Send size={12} /> {sendingId === l.id ? 'Sending…' : `Send to ${l.email}${l.quoteCcEmails.length ? ` +${l.quoteCcEmails.length}` : ''}`}
                        </button>
                      </div>
                    )}

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--color-border)' }}>
                      <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14 }}>{fmt(total)}</span>
                      {l.convertedOrderNo ? (
                        <a href="/admin/dashboard/orders" style={{ fontSize: 12.5, color: 'var(--color-primary-strong)', display: 'inline-flex', alignItems: 'center', gap: 4, textDecoration: 'none', fontWeight: 600 }}>
                          View order {l.convertedOrderNo} <ExternalLink size={12} />
                        </a>
                      ) : (
                        <button
                          type="button"
                          onClick={() => convertToOrder(l.id)}
                          disabled={converting === l.id}
                          style={{
                            display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12.5, fontWeight: 600,
                            color: 'var(--color-primary-contrast)', background: 'var(--color-primary)', border: 'none', borderRadius: 999,
                            padding: '7px 14px', cursor: converting === l.id ? 'default' : 'pointer', opacity: converting === l.id ? 0.6 : 1,
                          }}
                        >
                          {converting === l.id ? 'Converting…' : 'Convert to order'} <ArrowRight size={13} />
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}

      {newOpen && (
        <NewQuotationModal
          products={products}
          onClose={() => setNewOpen(false)}
          onCreated={() => {
            setNewOpen(false)
            load()
          }}
        />
      )}

      {editingLead && (
        <EditQuotationModal
          lead={editingLead}
          products={products}
          onClose={() => setEditingLead(null)}
          onSaved={() => {
            setEditingLead(null)
            load()
          }}
        />
      )}
    </div>
  )
}

/** A single item row with a type-ahead dropdown matching real catalog
 *  products — shared by the new-quotation and edit-quotation forms so a
 *  quoted item can be made to correspond to real inventory, which is what
 *  lets conversion-to-order actually decrement stock (fulfillment matches
 *  items to products by exact name). */
function ItemRow({ row, index, products, suggestFor, setSuggestFor, onChange, onRemove, removable }: {
  row: Row
  index: number
  products: Product[]
  suggestFor: number | null
  setSuggestFor: (i: number | null) => void
  onChange: (patch: Partial<Row>) => void
  onRemove: () => void
  removable: boolean
}) {
  const query = row.name.trim().toLowerCase()
  const matches = query && suggestFor === index ? products.filter((p) => p.name.toLowerCase().includes(query)).slice(0, 6) : []

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 90px 60px 28px', gap: 6, alignItems: 'center' }}>
      <div style={{ position: 'relative' }}>
        <input
          value={row.name}
          onChange={(e) => onChange({ name: e.target.value })}
          onFocus={() => setSuggestFor(index)}
          onBlur={() => setTimeout(() => setSuggestFor(null), 120)}
          placeholder="Item name: start typing to pick a product"
          style={{ width: '100%', height: 38, padding: '0 10px', border: '1.5px solid var(--color-border)', borderRadius: 10, fontSize: 13, background: 'var(--color-surface-sunk)' }}
        />
        {matches.length > 0 && (
          <div
            style={{
              position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 20,
              background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 10,
              boxShadow: '0 12px 28px rgba(0,0,0,.14)', overflow: 'hidden',
            }}
          >
            {matches.map((p) => (
              <button
                key={p.id}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault()
                  const effectivePrice = p.salePrice ?? p.price
                  onChange({ name: p.name, price: String(effectivePrice) })
                  setSuggestFor(null)
                }}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, width: '100%',
                  padding: '8px 10px', border: 'none', background: 'none', cursor: 'pointer', textAlign: 'left', fontSize: 12.5,
                }}
              >
                <span style={{ color: 'var(--color-text)' }}>{p.name}</span>
                <span style={{ color: 'var(--color-text-muted)', flexShrink: 0 }}>{fmt(p.salePrice ?? p.price)}</span>
              </button>
            ))}
          </div>
        )}
      </div>
      <input
        value={row.price}
        onChange={(e) => onChange({ price: e.target.value })}
        placeholder="Price"
        type="number"
        style={{ height: 38, padding: '0 10px', border: '1.5px solid var(--color-border)', borderRadius: 10, fontSize: 13, background: 'var(--color-surface-sunk)' }}
      />
      <input
        value={row.qty}
        onChange={(e) => onChange({ qty: e.target.value })}
        placeholder="Qty"
        type="number"
        style={{ height: 38, padding: '0 10px', border: '1.5px solid var(--color-border)', borderRadius: 10, fontSize: 13, background: 'var(--color-surface-sunk)' }}
      />
      <button
        type="button"
        onClick={onRemove}
        disabled={!removable}
        style={{ width: 28, height: 28, borderRadius: 8, border: 'none', background: 'none', cursor: removable ? 'pointer' : 'default', opacity: removable ? 1 : 0.3, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      >
        <Trash2 size={14} />
      </button>
    </div>
  )
}

interface Row {
  name: string
  price: string
  qty: string
}

/** Parses a comma/semicolon/space-separated string of emails into a clean,
 *  deduplicated array — used for the quote's extra-recipients field. */
function parseEmails(raw: string): string[] {
  return Array.from(new Set(raw.split(/[,;\s]+/).map((e) => e.trim()).filter(Boolean)))
}

function NewQuotationModal({ products, onClose, onCreated }: { products: Product[]; onClose: () => void; onCreated: () => void }) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [shoppingFor, setShoppingFor] = useState('')
  const [area, setArea] = useState('')
  const [timeframe, setTimeframe] = useState('')
  const [ccEmailsInput, setCcEmailsInput] = useState('')
  const [rows, setRows] = useState<Row[]>([{ name: '', price: '', qty: '1' }])
  const [suggestFor, setSuggestFor] = useState<number | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const setRow = (i: number, patch: Partial<Row>) => setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)))

  const total = rows.reduce((sum, r) => sum + (Number(r.price) || 0) * (Number(r.qty) || 0), 0)

  const submit = async () => {
    setError('')
    if (!name.trim()) return setError('Customer name is required.')
    if (!email.trim()) return setError('Email is required.')
    const items = rows
      .filter((r) => r.name.trim())
      .map((r) => ({ name: r.name.trim(), price: Number(r.price) || 0, qty: Math.max(1, Number(r.qty) || 1) }))
    if (items.length === 0) return setError('Add at least one item.')
    const ccEmails = parseEmails(ccEmailsInput)
    if (ccEmails.some((e) => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e))) return setError('One of the extra recipient emails looks invalid.')

    setBusy(true)
    const res = await fetch('/api/admin/leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim() || undefined,
        quoteShoppingFor: shoppingFor.trim() || undefined,
        quoteArea: area.trim() || undefined,
        quoteTimeframe: timeframe.trim() || undefined,
        items,
        ccEmails: ccEmails.length ? ccEmails : undefined,
      }),
    })
    setBusy(false)
    if (!res.ok) return setError((await res.json().catch(() => ({}))).error || 'Could not create this quotation.')
    onCreated()
  }

  return (
    <Modal
      title="New quotation"
      width={520}
      onClose={onClose}
      footer={
        <>
          <Button size="sm" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button size="sm" variant="primary" onClick={submit} disabled={busy}>
            {busy ? 'Creating…' : `Create quotation · J$${total.toLocaleString()}`}
          </Button>
        </>
      }
    >
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <TextInput label="Customer name" value={name} onChange={setName} />
        <TextInput label="Email" value={email} onChange={setEmail} type="email" />
        <TextInput label="Phone (optional)" value={phone} onChange={setPhone} type="tel" />
        <TextInput label="Shopping for (optional)" value={shoppingFor} onChange={setShoppingFor} placeholder="Home, business…" />
        <TextInput label="Area (optional)" value={area} onChange={setArea} />
        <TextInput label="Timeframe (optional)" value={timeframe} onChange={setTimeframe} placeholder="ASAP, this month…" />
      </div>

      <TextInput
        label="Also send to (optional)"
        value={ccEmailsInput}
        onChange={setCcEmailsInput}
        placeholder="comma-separated, e.g. spouse@email.com, office@email.com"
      />

      <div>
        <span style={{ display: 'block', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 12.5, color: 'var(--color-text)', marginBottom: 6 }}>
          Items
        </span>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {rows.map((r, i) => (
            <ItemRow
              key={i}
              row={r}
              index={i}
              products={products}
              suggestFor={suggestFor}
              setSuggestFor={setSuggestFor}
              onChange={(patch) => setRow(i, patch)}
              onRemove={() => setRows((prev) => prev.filter((_, idx) => idx !== i))}
              removable={rows.length > 1}
            />
          ))}
        </div>
        <button
          type="button"
          onClick={() => setRows((prev) => [...prev, { name: '', price: '', qty: '1' }])}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: 8, background: 'none', border: 'none', cursor: 'pointer', fontSize: 12.5, fontWeight: 600, color: 'var(--ke-green-700,#15803d)', padding: 0 }}
        >
          <Plus size={13} /> Add item
        </button>
      </div>

      {error && <div style={{ color: 'var(--color-danger,#dc2626)', fontSize: 13 }}>{error}</div>}
    </Modal>
  )
}

function EditQuotationModal({ lead, products, onClose, onSaved }: { lead: Lead; products: Product[]; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState(lead.name)
  const [email, setEmail] = useState(lead.email)
  const [phone, setPhone] = useState(lead.phone ?? '')
  const [shoppingFor, setShoppingFor] = useState(lead.quoteShoppingFor ?? '')
  const [area, setArea] = useState(lead.quoteArea ?? '')
  const [timeframe, setTimeframe] = useState(lead.quoteTimeframe ?? '')
  const [ccEmailsInput, setCcEmailsInput] = useState(lead.quoteCcEmails.join(', '))
  const [rows, setRows] = useState<Row[]>(
    (lead.quoteItems ?? []).map((i) => ({ name: i.name, price: String(i.price), qty: String(i.qty) })),
  )
  const [suggestFor, setSuggestFor] = useState<number | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const setRow = (i: number, patch: Partial<Row>) => setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)))

  const total = rows.reduce((sum, r) => sum + (Number(r.price) || 0) * (Number(r.qty) || 0), 0)

  const submit = async () => {
    setError('')
    if (!name.trim()) return setError('Customer name is required.')
    if (!email.trim()) return setError('Email is required.')
    const items = rows
      .filter((r) => r.name.trim())
      .map((r) => ({ name: r.name.trim(), price: Number(r.price) || 0, qty: Math.max(1, Number(r.qty) || 1) }))
    if (items.length === 0) return setError('Add at least one item.')
    const ccEmails = parseEmails(ccEmailsInput)
    if (ccEmails.some((e) => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e))) return setError('One of the extra recipient emails looks invalid.')

    setBusy(true)
    const res = await fetch(`/api/admin/leads/${lead.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim() || null,
        quoteShoppingFor: shoppingFor.trim() || null,
        quoteArea: area.trim() || null,
        quoteTimeframe: timeframe.trim() || null,
        ccEmails,
        items,
      }),
    })
    setBusy(false)
    if (!res.ok) return setError((await res.json().catch(() => ({}))).error || 'Could not save these changes.')
    onSaved()
  }

  return (
    <Modal
      title={`Edit quotation — ${lead.name}`}
      width={520}
      onClose={onClose}
      footer={
        <>
          <Button size="sm" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button size="sm" variant="primary" onClick={submit} disabled={busy}>
            {busy ? 'Saving…' : `Save · J$${total.toLocaleString()}`}
          </Button>
        </>
      }
    >
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <TextInput label="Customer name" value={name} onChange={setName} />
        <TextInput label="Email" value={email} onChange={setEmail} type="email" />
        <TextInput label="Phone (optional)" value={phone} onChange={setPhone} type="tel" />
        <TextInput label="Shopping for (optional)" value={shoppingFor} onChange={setShoppingFor} placeholder="Home, business…" />
        <TextInput label="Area (optional)" value={area} onChange={setArea} />
        <TextInput label="Timeframe (optional)" value={timeframe} onChange={setTimeframe} placeholder="ASAP, this month…" />
      </div>

      <TextInput
        label="Also send to (optional)"
        value={ccEmailsInput}
        onChange={setCcEmailsInput}
        placeholder="comma-separated, e.g. spouse@email.com, office@email.com"
      />

      <div>
        <span style={{ display: 'block', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 12.5, color: 'var(--color-text)', marginBottom: 6 }}>
          Items
        </span>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {rows.map((r, i) => (
            <ItemRow
              key={i}
              row={r}
              index={i}
              products={products}
              suggestFor={suggestFor}
              setSuggestFor={setSuggestFor}
              onChange={(patch) => setRow(i, patch)}
              onRemove={() => setRows((prev) => prev.filter((_, idx) => idx !== i))}
              removable={rows.length > 1}
            />
          ))}
        </div>
        <button
          type="button"
          onClick={() => setRows((prev) => [...prev, { name: '', price: '', qty: '1' }])}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: 8, background: 'none', border: 'none', cursor: 'pointer', fontSize: 12.5, fontWeight: 600, color: 'var(--color-primary-strong)', padding: 0 }}
        >
          <Plus size={13} /> Add item
        </button>
      </div>

      {error && <div style={{ color: 'var(--color-danger,#dc2626)', fontSize: 13 }}>{error}</div>}
    </Modal>
  )
}
