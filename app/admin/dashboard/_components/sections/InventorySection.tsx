'use client'

import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { Plus, Search, Trash2, Pencil, Archive, ArchiveRestore, Eye, Image as ImageIcon } from 'lucide-react'
import { CATALOG } from '@/lib/catalog'
import Badge from '../ui/Badge'
import Pill from '../ui/Pill'
import Button from '../ui/Button'
import Modal from '../ui/Modal'
import TextInput from '../ui/TextInput'
import { cardStyle, h3Style } from '../ui/card'
import { fmt } from '../mockData'
import ProcurementCard from './ProcurementCard'

type Category = 'POWERBANKS' | 'CHARGERS' | 'STATIONS' | 'ACCESSORIES'

interface SpecItem {
  label: string
  value: string
}

interface Product {
  id: string
  name: string
  sku: string | null
  barcode: string | null
  category: Category | null
  price: number
  salePrice: number | null
  cost: number | null
  stock: number
  threshold: number
  badge: string | null
  description: string | null
  shortDescription: string | null
  brand: string | null
  weight: string | null
  dimensions: string | null
  warranty: string | null
  images: string[]
  features: string[]
  tags: string[]
  specs: unknown
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

const emptyForm = {
  name: '', sku: '', barcode: '', price: '0', salePrice: '', cost: '', stock: '0', threshold: '5',
  category: 'POWERBANKS', badge: '', brand: '', weight: '', dimensions: '', warranty: '',
  shortDescription: '', description: '', tags: '', features: '',
}

function parseSpecs(v: unknown): SpecItem[] {
  if (!Array.isArray(v)) return []
  return v
    .filter((x): x is { label?: unknown; value?: unknown } => typeof x === 'object' && x !== null)
    .map((x) => ({ label: String(x.label ?? ''), value: String(x.value ?? '') }))
}

/** Gross margin % from sale/retail price vs unit cost. */
function marginPct(price: number, cost: number | null): number | null {
  if (!cost || cost <= 0 || price <= 0) return null
  return Math.round(((price - cost) / price) * 100)
}

// Map a DB product name to its storefront catalog id, so admins can jump to the
// public product page. Names in the seed match lib/catalog.ts exactly.
const CATALOG_ID_BY_NAME = new Map(CATALOG.map((c) => [c.name.toLowerCase(), c.id]))

export default function InventorySection() {
  const [products, setProducts] = useState<Product[]>([])
  const [cat, setCat] = useState<'all' | Category>('all')
  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState<Product | null>(null)
  const [addOpen, setAddOpen] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [images, setImages] = useState<string[]>([])
  const [newImage, setNewImage] = useState('')
  const [specs, setSpecs] = useState<SpecItem[]>([])
  const [busy, setBusy] = useState(false)
  const [showArchived, setShowArchived] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [dragOver, setDragOver] = useState(false)

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

  const resetEditor = () => {
    setForm(emptyForm)
    setImages([])
    setSpecs([])
    setNewImage('')
  }

  const openEdit = (p: Product) => {
    setForm({
      name: p.name,
      sku: p.sku ?? '',
      barcode: p.barcode ?? '',
      price: String(p.price),
      salePrice: p.salePrice != null ? String(p.salePrice) : '',
      cost: p.cost != null ? String(p.cost) : '',
      stock: String(p.stock),
      threshold: String(p.threshold),
      category: p.category ?? 'POWERBANKS',
      badge: p.badge ?? '',
      brand: p.brand ?? '',
      weight: p.weight ?? '',
      dimensions: p.dimensions ?? '',
      warranty: p.warranty ?? '',
      shortDescription: p.shortDescription ?? '',
      description: p.description ?? '',
      tags: (p.tags ?? []).join(', '),
      features: (p.features ?? []).join('\n'),
    })
    setImages(p.images ?? [])
    setSpecs(parseSpecs(p.specs))
    setNewImage('')
    setEditing(p)
  }

  // Shared payload for create + update.
  const buildPayload = () => ({
    name: form.name,
    price: Number(form.price),
    salePrice: form.salePrice ? Number(form.salePrice) : null,
    cost: form.cost ? Number(form.cost) : null,
    stock: Number(form.stock),
    threshold: Number(form.threshold),
    category: form.category as Category,
    badge: form.badge || null,
    barcode: form.barcode || null,
    brand: form.brand || null,
    weight: form.weight || null,
    dimensions: form.dimensions || null,
    warranty: form.warranty || null,
    shortDescription: form.shortDescription || null,
    description: form.description || null,
    images: images.filter((s) => s.trim()),
    tags: form.tags.split(',').map((s) => s.trim()).filter(Boolean),
    features: form.features.split('\n').map((s) => s.trim()).filter(Boolean),
    specs: specs.filter((s) => s.label.trim() || s.value.trim()),
  })

  const saveEdit = async () => {
    if (!editing) return
    setBusy(true)
    await fetch(`/api/admin/products/${editing.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(buildPayload()),
    })
    setBusy(false)
    setEditing(null)
    resetEditor()
    loadProducts()
  }

  const createProduct = async () => {
    setBusy(true)
    const res = await fetch('/api/admin/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...buildPayload(), sku: form.sku || null }),
    })
    setBusy(false)
    if (res.ok) {
      setAddOpen(false)
      resetEditor()
      loadProducts()
    }
  }

  // Image list helpers (URL-based; images[0] is the thumbnail).
  const addImage = () => {
    const url = newImage.trim()
    if (!url) return
    setImages((prev) => [...prev, url])
    setNewImage('')
  }
  const uploadFiles = async (files: FileList | File[]) => {
    const list = Array.from(files).filter((f) => f.type.startsWith('image/'))
    if (list.length === 0) return
    setUploadError('')
    setUploading(true)
    try {
      const fd = new FormData()
      list.forEach((f) => fd.append('files', f))
      const res = await fetch('/api/admin/products/upload', { method: 'POST', body: fd })
      const data = await res.json().catch(() => ({}))
      if (res.ok && Array.isArray(data.urls)) {
        setImages((prev) => [...prev, ...data.urls])
      } else {
        setUploadError(data.error ?? 'Upload failed.')
      }
    } catch {
      setUploadError('Upload failed — check your connection.')
    } finally {
      setUploading(false)
    }
  }

  const removeImage = (i: number) => setImages((prev) => prev.filter((_, idx) => idx !== i))
  const moveImage = (i: number, dir: -1 | 1) => {
    setImages((prev) => {
      const next = [...prev]
      const j = i + dir
      if (j < 0 || j >= next.length) return prev
      ;[next[i], next[j]] = [next[j], next[i]]
      return next
    })
  }
  const makeThumb = (i: number) => setImages((prev) => (i === 0 ? prev : [prev[i], ...prev.filter((_, idx) => idx !== i)]))

  const setSpec = (i: number, patch: Partial<SpecItem>) =>
    setSpecs((prev) => prev.map((s, idx) => (idx === i ? { ...s, ...patch } : s)))
  const addSpec = () => setSpecs((prev) => [...prev, { label: '', value: '' }])
  const removeSpec = (i: number) => setSpecs((prev) => prev.filter((_, idx) => idx !== i))

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
          <Button size="sm" variant="primary" onClick={() => { resetEditor(); setAddOpen(true) }} iconRight={<Plus size={14} />}>
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
                {CATALOG_ID_BY_NAME.get(p.name.toLowerCase()) && (
                  <a
                    href={`/product/${CATALOG_ID_BY_NAME.get(p.name.toLowerCase())}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="View on site"
                    title="View product page"
                    style={{ ...iconBtn, textDecoration: 'none' }}
                  >
                    <Eye size={13} />
                  </a>
                )}
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
          onClose={() => { setEditing(null); setAddOpen(false); resetEditor() }}
          footer={
            <>
              <Button size="sm" variant="outline" onClick={() => { setEditing(null); setAddOpen(false); resetEditor() }}>Cancel</Button>
              <Button size="sm" variant="primary" onClick={editing ? saveEdit : createProduct}>{busy ? 'Saving…' : 'Save'}</Button>
            </>
          }
        >
          {/* Basics */}
          <SectionLabel>Basics</SectionLabel>
          <TextInput label="Title" value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <TextInput label="Brand (optional)" value={form.brand} onChange={(v) => setForm({ ...form, brand: v })} />
            <TextInput label="Category" value={form.category} onChange={(v) => setForm({ ...form, category: v })} options={CAT_OPTIONS} />
            <TextInput label="SKU" value={form.sku} onChange={(v) => setForm({ ...form, sku: v })} placeholder="KE-XX-000" />
            <TextInput label="Barcode (optional)" value={form.barcode} onChange={(v) => setForm({ ...form, barcode: v })} />
          </div>
          <TextInput label="Short description (card summary)" value={form.shortDescription} onChange={(v) => setForm({ ...form, shortDescription: v })} placeholder="One-line summary shown on cards" />
          <TextInput label="Long description" value={form.description} onChange={(v) => setForm({ ...form, description: v })} multiline placeholder="Full product story for the detail page" />

          {/* Pricing & inventory */}
          <SectionLabel>Pricing &amp; inventory</SectionLabel>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <TextInput label="Retail price (J$)" value={form.price} onChange={(v) => setForm({ ...form, price: v })} type="number" />
            <TextInput label="Sale price (J$, optional)" value={form.salePrice} onChange={(v) => setForm({ ...form, salePrice: v })} type="number" />
            <TextInput label="Unit cost (J$, optional)" value={form.cost} onChange={(v) => setForm({ ...form, cost: v })} type="number" />
            <TextInput label="Badge (optional)" value={form.badge} onChange={(v) => setForm({ ...form, badge: v })} placeholder="e.g. New" />
            <TextInput label="Inventory quantity" value={form.stock} onChange={(v) => setForm({ ...form, stock: v })} type="number" />
            <TextInput label="Reorder threshold" value={form.threshold} onChange={(v) => setForm({ ...form, threshold: v })} type="number" />
          </div>
          {(() => {
            const eff = form.salePrice ? Number(form.salePrice) : Number(form.price)
            const m = marginPct(eff, form.cost ? Number(form.cost) : null)
            return m != null ? (
              <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                Profit margin: <strong style={{ color: m >= 0 ? 'var(--ke-green-700)' : 'var(--color-danger)' }}>{m}%</strong>
                {' '}({fmt(Math.round(eff - Number(form.cost)))} per unit)
              </div>
            ) : null
          })()}

          {/* Images */}
          <SectionLabel>Images</SectionLabel>
          <p style={{ fontSize: 11.5, color: 'var(--color-text-muted)', margin: '0 0 4px' }}>
            Drag &amp; drop or browse to upload, or paste an image URL. The first image is the thumbnail — reorder or set any as the thumbnail.
          </p>
          {/* Drag & drop uploader */}
          <label
            onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => { e.preventDefault(); setDragOver(false); if (e.dataTransfer.files.length) uploadFiles(e.dataTransfer.files) }}
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4,
              padding: '18px 12px', marginBottom: 8, borderRadius: 12, cursor: 'pointer', textAlign: 'center',
              border: `1.5px dashed ${dragOver ? 'var(--ke-green-500)' : 'var(--color-border)'}`,
              background: dragOver ? 'var(--ke-green-50,#eef7ee)' : 'var(--ke-gray-50,#fafafa)',
              transition: 'background .15s ease, border-color .15s ease',
            }}
          >
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => { if (e.target.files?.length) uploadFiles(e.target.files); e.target.value = '' }}
              style={{ display: 'none' }}
            />
            <ImageIcon size={20} style={{ color: 'var(--color-text-muted)' }} />
            <span style={{ fontSize: 12.5, fontWeight: 600, fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}>
              {uploading ? 'Uploading…' : 'Drop images here or click to browse'}
            </span>
            <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>JPEG, PNG, WEBP, GIF or AVIF · up to 8 MB each</span>
          </label>
          {uploadError && (
            <div style={{ background: 'var(--color-danger-soft)', color: 'var(--color-danger)', borderRadius: 8, padding: '7px 10px', fontSize: 11.5, marginBottom: 8 }}>{uploadError}</div>
          )}
          {images.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 8 }}>
              {images.map((src, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', border: '1px solid var(--color-border)', borderRadius: 8 }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt="" width={36} height={36} style={{ objectFit: 'cover', borderRadius: 6, background: 'var(--ke-gray-50,#f2f2f2)', flexShrink: 0 }} />
                  <span style={{ flex: 1, minWidth: 0, fontSize: 11.5, color: 'var(--color-text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{src}</span>
                  {i === 0 ? (
                    <Badge tone="green">Thumbnail</Badge>
                  ) : (
                    <button type="button" onClick={() => makeThumb(i)} title="Set as thumbnail" style={miniBtn}>★</button>
                  )}
                  <button type="button" onClick={() => moveImage(i, -1)} title="Move up" style={miniBtn}>↑</button>
                  <button type="button" onClick={() => moveImage(i, 1)} title="Move down" style={miniBtn}>↓</button>
                  <button type="button" onClick={() => removeImage(i)} title="Remove" style={miniBtn}><Trash2 size={12} /></button>
                </div>
              ))}
            </div>
          )}
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              value={newImage}
              onChange={(e) => setNewImage(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addImage() } }}
              placeholder="https://… or /images/…"
              style={{ flex: 1, height: 34, padding: '0 12px', border: '1px solid var(--color-border)', borderRadius: 8, fontSize: 12.5, fontFamily: 'var(--font-body)' }}
            />
            <Button size="sm" variant="outline" onClick={addImage}>Add image</Button>
          </div>

          {/* Specifications */}
          <SectionLabel>Specifications</SectionLabel>
          {specs.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 8 }}>
              {specs.map((s, i) => (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr auto', gap: 6 }}>
                  <input value={s.label} onChange={(e) => setSpec(i, { label: e.target.value })} placeholder="Capacity" style={specInput} />
                  <input value={s.value} onChange={(e) => setSpec(i, { value: e.target.value })} placeholder="20,000mAh" style={specInput} />
                  <button type="button" onClick={() => removeSpec(i)} title="Remove" style={miniBtn}><Trash2 size={12} /></button>
                </div>
              ))}
            </div>
          )}
          <Button size="sm" variant="outline" onClick={addSpec} iconRight={<Plus size={13} />}>Add specification</Button>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 4 }}>
            <TextInput label="Weight (optional)" value={form.weight} onChange={(v) => setForm({ ...form, weight: v })} placeholder="350 g" />
            <TextInput label="Dimensions (optional)" value={form.dimensions} onChange={(v) => setForm({ ...form, dimensions: v })} placeholder="14 × 7 × 2 cm" />
            <TextInput label="Warranty (optional)" value={form.warranty} onChange={(v) => setForm({ ...form, warranty: v })} placeholder="14-day + manufacturer" />
            <TextInput label="Tags (comma-separated)" value={form.tags} onChange={(v) => setForm({ ...form, tags: v })} placeholder="fast-charge, travel" />
          </div>
          <TextInput label="Feature bullets (one per line)" value={form.features} onChange={(v) => setForm({ ...form, features: v })} multiline placeholder={'USB-C PD 20W\nDigital battery display'} />
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

const miniBtn = {
  width: 26,
  height: 26,
  borderRadius: 6,
  border: '1px solid var(--color-border)',
  background: '#fff',
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: 'var(--color-text-muted)',
  fontSize: 13,
  flexShrink: 0,
} as const

const specInput = {
  height: 34,
  padding: '0 10px',
  border: '1px solid var(--color-border)',
  borderRadius: 8,
  fontSize: 12.5,
  fontFamily: 'var(--font-body)',
  minWidth: 0,
} as const

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '.14em', color: 'var(--color-text-muted)', textTransform: 'uppercase', margin: '6px 0 -2px', paddingTop: 6, borderTop: '1px solid var(--color-border)' }}>
      {children}
    </div>
  )
}
