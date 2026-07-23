'use client'

import { useCallback, useEffect, useState } from 'react'
import { Plus, Search, Trash2, Pencil, Archive, ArchiveRestore } from 'lucide-react'
import Badge from '../ui/Badge'
import Pill from '../ui/Pill'
import Button from '../ui/Button'
import Modal from '../ui/Modal'
import TextInput from '../ui/TextInput'
import { cardStyle, h3Style } from '../ui/card'
import { fmt } from '../mockData'
import ProcurementCard from './ProcurementCard'

type Category = 'POWERBANKS' | 'CHARGERS' | 'STATIONS' | 'ACCESSORIES'

interface Product {
  id: string
  name: string
  sku: string | null
  barcode: string | null
  category: Category | null
  price: number
  stock: number
  threshold: number
  badge: string | null
}

const CAT_PILLS: { id: 'all' | Category; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'POWERBANKS', label: 'Power banks' },
  { id: 'CHARGERS', label: 'Chargers' },
  { id: 'STATIONS', label: 'Stations' },
  { id: 'ACCESSORIES', label: 'Accessories' },
]

const CAT_OPTIONS = ['POWERBANKS', 'CHARGERS', 'STATIONS', 'ACCESSORIES']
const GRID_COLS = '2fr 1fr 1fr 0.7fr 0.7fr 0.9fr 0.7fr'

function statusFor(stock: number, threshold: number): { label: string; tone: 'orange' | 'green' } {
  if (stock === 0) return { label: 'Out of stock', tone: 'orange' }
  if (stock <= threshold) return { label: 'Low stock', tone: 'orange' }
  return { label: 'In stock', tone: 'green' }
}

const emptyForm = { name: '', sku: '', price: '0', stock: '0', threshold: '5', category: 'POWERBANKS', badge: '' }

export default function InventorySection() {
  const [products, setProducts] = useState<Product[]>([])
  const [cat, setCat] = useState<'all' | Category>('all')
  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState<Product | null>(null)
  const [addOpen, setAddOpen] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [busy, setBusy] = useState(false)
  const [showArchived, setShowArchived] = useState(false)

  const loadProducts = useCallback(async () => {
    const res = await fetch(`/api/admin/products${showArchived ? '?archived=1' : ''}`)
    if (res.ok) setProducts((await res.json()).products)
  }, [showArchived])

  useEffect(() => {
    loadProducts()
  }, [loadProducts])

  const rows = products.filter((p) => {
    if (cat !== 'all' && p.category !== cat) return false
    if (search && !`${p.name} ${p.sku ?? ''}`.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })
  const inventoryValue = products.reduce((sum, p) => sum + p.price * p.stock, 0)

  const openEdit = (p: Product) => {
    setForm({
      name: p.name,
      sku: p.sku ?? '',
      price: String(p.price),
      stock: String(p.stock),
      threshold: String(p.threshold),
      category: p.category ?? 'POWERBANKS',
      badge: p.badge ?? '',
    })
    setEditing(p)
  }

  const saveEdit = async () => {
    if (!editing) return
    setBusy(true)
    await fetch(`/api/admin/products/${editing.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: form.name,
        price: Number(form.price),
        stock: Number(form.stock),
        threshold: Number(form.threshold),
        category: form.category as Category,
        badge: form.badge || null,
      }),
    })
    setBusy(false)
    setEditing(null)
    loadProducts()
  }

  const createProduct = async () => {
    setBusy(true)
    const res = await fetch('/api/admin/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: form.name,
        sku: form.sku || null,
        price: Number(form.price),
        stock: Number(form.stock),
        threshold: Number(form.threshold),
        category: form.category as Category,
        badge: form.badge || null,
      }),
    })
    setBusy(false)
    if (res.ok) {
      setAddOpen(false)
      setForm(emptyForm)
      loadProducts()
    }
  }

  const deleteProduct = async (p: Product) => {
    if (!confirm(`Permanently delete ${p.name}? This can't be undone.`)) return
    await fetch(`/api/admin/products/${p.id}`, { method: 'DELETE' })
    loadProducts()
  }

  const setArchived = async (p: Product, archived: boolean) => {
    await fetch(`/api/admin/products/${p.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ archived }),
    })
    loadProducts()
  }

  const adjustStock = async (p: Product, delta: number) => {
    const next = Math.max(0, p.stock + delta)
    await fetch(`/api/admin/products/${p.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stock: next }),
    })
    loadProducts()
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {CAT_PILLS.map((p) => (
            <Pill key={p.id} label={p.label} selected={cat === p.id} onClick={() => setCat(p.id)} />
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <div style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: 11, top: 10, color: 'var(--color-text-subtle)' }} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search products…"
              style={{ height: 34, padding: '0 12px 0 32px', border: '1px solid var(--color-border)', borderRadius: 999, fontSize: 12.5, outline: 'none', fontFamily: 'var(--font-body)' }}
            />
          </div>
          <Button size="sm" variant={showArchived ? 'primary' : 'outline'} onClick={() => setShowArchived((v) => !v)} iconRight={<Archive size={14} />}>
            {showArchived ? 'Active products' : 'Archived'}
          </Button>
          <Button size="sm" variant="primary" onClick={() => { setForm(emptyForm); setAddOpen(true) }} iconRight={<Plus size={14} />}>
            Add product
          </Button>
        </div>
      </div>

      <div style={{ ...cardStyle, padding: 0, overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: GRID_COLS, gap: 10, padding: '12px 18px', background: 'var(--ke-gray-50,#f5f7f5)', fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '.1em', color: 'var(--color-text-muted)' }}>
          <span>PRODUCT</span>
          <span>SKU</span>
          <span>BARCODE</span>
          <span>PRICE</span>
          <span>STOCK</span>
          <span>STATUS</span>
          <span style={{ textAlign: 'right' }}>ACTIONS</span>
        </div>
        {rows.map((p) => {
          const status = statusFor(p.stock, p.threshold)
          return (
            <div key={p.id} style={{ display: 'grid', gridTemplateColumns: GRID_COLS, gap: 10, padding: '11px 18px', borderTop: '1px solid var(--color-border)', alignItems: 'center' }}>
              <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 13 }}>{p.name}</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11.5, color: 'var(--color-text-muted)' }}>{p.sku ?? '—'}</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-text-subtle)' }}>{p.barcode ?? '—'}</span>
              <span style={{ fontSize: 13 }}>{fmt(p.price)}</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <button type="button" aria-label="Decrease stock" onClick={() => adjustStock(p, -1)} style={stepBtn}>−</button>
                <span style={{ fontSize: 13, minWidth: 22, textAlign: 'center' }}>{p.stock}</span>
                <button type="button" aria-label="Increase stock" onClick={() => adjustStock(p, 1)} style={stepBtn}>+</button>
              </span>
              <Badge tone={status.tone} dot>{status.label}</Badge>
              <span style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                {showArchived ? (
                  <button type="button" aria-label="Restore" title="Restore to active" onClick={() => setArchived(p, false)} style={iconBtn}><ArchiveRestore size={13} /></button>
                ) : (
                  <>
                    <button type="button" aria-label="Edit" onClick={() => openEdit(p)} style={iconBtn}><Pencil size={13} /></button>
                    <button type="button" aria-label="Archive" title="Archive (hide without deleting)" onClick={() => setArchived(p, true)} style={iconBtn}><Archive size={13} /></button>
                  </>
                )}
                <button type="button" aria-label="Delete" title="Delete permanently" onClick={() => deleteProduct(p)} style={iconBtn}><Trash2 size={13} /></button>
              </span>
            </div>
          )
        })}
        {rows.length === 0 && (
          <div style={{ padding: '28px 18px', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: 13, borderTop: '1px solid var(--color-border)' }}>
            No products match.
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div style={cardStyle}>
          <h3 style={h3Style}>Inventory value</h3>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 30 }}>{fmt(Math.round(inventoryValue))}</div>
          <p style={{ fontSize: 12.5, color: 'var(--color-text-muted)', marginTop: 6 }}>
            Across {products.length} active SKUs.
          </p>
        </div>

        <ProcurementCard />
      </div>

      {(editing || addOpen) && (
        <Modal
          title={editing ? `Edit ${editing.name}` : 'Add product'}
          onClose={() => { setEditing(null); setAddOpen(false) }}
          footer={
            <>
              <Button size="sm" variant="outline" onClick={() => { setEditing(null); setAddOpen(false) }}>Cancel</Button>
              <Button size="sm" variant="primary" onClick={editing ? saveEdit : createProduct}>{busy ? 'Saving…' : 'Save'}</Button>
            </>
          }
        >
          <TextInput label="Name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
          {!editing && <TextInput label="SKU" value={form.sku} onChange={(v) => setForm({ ...form, sku: v })} placeholder="KE-XX-000" />}
          <TextInput label="Category" value={form.category} onChange={(v) => setForm({ ...form, category: v })} options={CAT_OPTIONS} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
            <TextInput label="Price (£)" value={form.price} onChange={(v) => setForm({ ...form, price: v })} type="number" />
            <TextInput label="Stock" value={form.stock} onChange={(v) => setForm({ ...form, stock: v })} type="number" />
            <TextInput label="Low at" value={form.threshold} onChange={(v) => setForm({ ...form, threshold: v })} type="number" />
          </div>
          <TextInput label="Badge (optional)" value={form.badge} onChange={(v) => setForm({ ...form, badge: v })} placeholder="e.g. New" />
        </Modal>
      )}
    </div>
  )
}

const stepBtn = {
  width: 22,
  height: 22,
  borderRadius: 6,
  border: '1px solid var(--color-border)',
  background: '#fff',
  cursor: 'pointer',
  fontSize: 13,
  lineHeight: 1,
} as const

const iconBtn = {
  width: 28,
  height: 28,
  borderRadius: 8,
  border: '1px solid var(--color-border)',
  background: '#fff',
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: 'var(--color-text-muted)',
} as const
