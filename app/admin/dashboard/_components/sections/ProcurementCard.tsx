'use client'

import { useCallback, useEffect, useState } from 'react'
import { Plus, ChevronDown, ChevronRight, Pencil, Trash2, Paperclip, Download, ExternalLink, Upload, Link2 } from 'lucide-react'
import { cardStyle, h3Style } from '../ui/card'
import Button from '../ui/Button'
import Modal from '../ui/Modal'
import TextInput from '../ui/TextInput'
import { fmt } from '../mockData'

interface PFile {
  id: string
  label: string
  kind: string
  isFile: boolean
  fileName: string | null
  url: string | null
}
interface PO {
  id: string
  reference: string
  status: string
  amount: number | null
  files: PFile[]
}
interface Supplier {
  id: string
  name: string
  contactEmail: string | null
  contactPhone: string | null
  website: string | null
  address: string | null
  notes: string | null
  openPOs: number
  files: PFile[]
  purchaseOrders: PO[]
}

const KIND_OPTIONS = ['INVOICE', 'QUOTE', 'PRICE_LIST', 'CONTRACT', 'LINK', 'OTHER']
const KIND_LABEL: Record<string, string> = {
  INVOICE: 'Invoice', QUOTE: 'Quote', PRICE_LIST: 'Price list', CONTRACT: 'Contract', LINK: 'Link', OTHER: 'Doc',
}

const emptySupplier = { name: '', contactEmail: '', contactPhone: '', website: '', address: '', notes: '' }

/** Attach target: either a supplier's own files, or a specific PO's files. */
type AttachTarget = { supplierId?: string; purchaseOrderId?: string; name: string }

export default function ProcurementCard() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [storageEnabled, setStorageEnabled] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  // Supplier add/edit modal
  const [supForm, setSupForm] = useState(emptySupplier)
  const [supModal, setSupModal] = useState<'add' | 'edit' | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)

  // PO modal
  const [poFor, setPoFor] = useState<Supplier | null>(null)
  const [poForm, setPoForm] = useState({ reference: '', amount: '' })

  // Attach modal
  const [attach, setAttach] = useState<AttachTarget | null>(null)
  const [attForm, setAttForm] = useState({ label: '', url: '', kind: 'INVOICE' })
  const [attFile, setAttFile] = useState<File | null>(null)
  const [attMode, setAttMode] = useState<'file' | 'link'>('link')
  const [attError, setAttError] = useState('')

  const load = useCallback(async () => {
    const res = await fetch('/api/admin/suppliers')
    if (res.ok) {
      const data = await res.json()
      setSuppliers(data.suppliers)
      setStorageEnabled(Boolean(data.storageEnabled))
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  /* ---- Suppliers ---- */
  const openAddSupplier = () => {
    setSupForm(emptySupplier)
    setEditingId(null)
    setSupModal('add')
  }
  const openEditSupplier = (s: Supplier) => {
    setSupForm({
      name: s.name,
      contactEmail: s.contactEmail ?? '',
      contactPhone: s.contactPhone ?? '',
      website: s.website ?? '',
      address: s.address ?? '',
      notes: s.notes ?? '',
    })
    setEditingId(s.id)
    setSupModal('edit')
  }
  const saveSupplier = async () => {
    setBusy(true)
    const url = editingId ? `/api/admin/suppliers/${editingId}` : '/api/admin/suppliers'
    const res = await fetch(url, {
      method: editingId ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(supForm),
    })
    setBusy(false)
    if (res.ok) {
      setSupModal(null)
      load()
    }
  }
  const deleteSupplier = async (s: Supplier) => {
    if (!confirm(`Delete ${s.name} and all its POs and files? This can't be undone.`)) return
    await fetch(`/api/admin/suppliers/${s.id}`, { method: 'DELETE' })
    load()
  }

  /* ---- Purchase orders ---- */
  const createPO = async () => {
    if (!poFor) return
    setBusy(true)
    const res = await fetch('/api/admin/purchase-orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        supplierId: poFor.id,
        reference: poForm.reference,
        amount: poForm.amount ? Number(poForm.amount) : undefined,
      }),
    })
    setBusy(false)
    if (res.ok) {
      setPoFor(null)
      setPoForm({ reference: '', amount: '' })
      load()
    }
  }
  const receivePO = async (poId: string) => {
    await fetch(`/api/admin/purchase-orders/${poId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'RECEIVED' }),
    })
    load()
  }

  /* ---- Attachments ---- */
  const openAttach = (target: AttachTarget) => {
    setAttach(target)
    setAttForm({ label: '', url: '', kind: 'INVOICE' })
    setAttFile(null)
    setAttError('')
    setAttMode(storageEnabled ? 'file' : 'link')
  }
  const saveAttach = async () => {
    if (!attach) return
    setAttError('')
    setBusy(true)
    let res: Response
    if (attMode === 'file') {
      if (!attFile) {
        setBusy(false)
        setAttError('Choose a file to upload.')
        return
      }
      const body = new FormData()
      body.append('file', attFile)
      body.append('label', attForm.label)
      body.append('kind', attForm.kind)
      if (attach.supplierId) body.append('supplierId', attach.supplierId)
      if (attach.purchaseOrderId) body.append('purchaseOrderId', attach.purchaseOrderId)
      res = await fetch('/api/admin/procurement-files', { method: 'POST', body })
    } else {
      res = await fetch('/api/admin/procurement-files', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          label: attForm.label,
          url: attForm.url,
          kind: attForm.kind,
          supplierId: attach.supplierId,
          purchaseOrderId: attach.purchaseOrderId,
        }),
      })
    }
    setBusy(false)
    if (res.ok) {
      setAttach(null)
      load()
    } else {
      setAttError((await res.json().catch(() => ({}))).error ?? 'Could not save the attachment.')
    }
  }
  const deleteFile = async (id: string) => {
    await fetch(`/api/admin/procurement-files/${id}`, { method: 'DELETE' })
    load()
  }

  return (
    <div style={cardStyle}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <h3 style={{ ...h3Style, margin: 0 }}>Suppliers &amp; procurement</h3>
        <Button size="sm" variant="outline" onClick={openAddSupplier} iconRight={<Plus size={13} />}>Supplier</Button>
      </div>

      {suppliers.length === 0 && (
        <p style={{ fontSize: 12.5, color: 'var(--color-text-muted)' }}>No suppliers yet. Add one to start tracking POs, invoices and contacts.</p>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {suppliers.map((s) => {
          const open = expanded === s.id
          return (
            <div key={s.id} style={{ border: '1px solid var(--color-border)', borderRadius: 12, overflow: 'hidden' }}>
              {/* Header row */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px' }}>
                <button type="button" onClick={() => setExpanded(open ? null : s.id)} aria-label={open ? 'Collapse' : 'Expand'} style={plainBtn}>
                  {open ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
                </button>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{s.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--color-text-subtle)' }}>
                    {s.openPOs} open PO{s.openPOs === 1 ? '' : 's'} · {s.files.length} file{s.files.length === 1 ? '' : 's'}
                  </div>
                </div>
                <button type="button" onClick={() => openEditSupplier(s)} aria-label="Edit supplier" style={iconBtn}><Pencil size={13} /></button>
                <button type="button" onClick={() => deleteSupplier(s)} aria-label="Delete supplier" style={iconBtn}><Trash2 size={13} /></button>
              </div>

              {open && (
                <div style={{ padding: '4px 14px 14px', borderTop: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {/* Contact block */}
                  <div style={{ fontSize: 12, color: 'var(--color-text-muted)', display: 'flex', flexDirection: 'column', gap: 3, marginTop: 10 }}>
                    {s.contactEmail && <span>✉ {s.contactEmail}</span>}
                    {s.contactPhone && <span>☎ {s.contactPhone}</span>}
                    {s.website && <span>🔗 <a href={hrefFor(s.website)} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--ke-green-700)' }}>{s.website}</a></span>}
                    {s.address && <span>📍 {s.address}</span>}
                    {s.notes && <span style={{ color: 'var(--color-text-subtle)', fontStyle: 'italic' }}>{s.notes}</span>}
                  </div>

                  {/* Supplier-level files */}
                  <FileList
                    files={s.files}
                    onAttach={() => openAttach({ supplierId: s.id, name: s.name })}
                    onDelete={deleteFile}
                    heading="Documents &amp; links"
                  />

                  {/* Purchase orders */}
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '.1em', color: 'var(--color-text-muted)' }}>PURCHASE ORDERS</span>
                      <button type="button" onClick={() => { setPoFor(s); setPoForm({ reference: '', amount: '' }) }} style={{ ...plainBtn, fontSize: 11.5, color: 'var(--ke-green-700)', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                        <Plus size={12} /> New PO
                      </button>
                    </div>
                    {s.purchaseOrders.length === 0 ? (
                      <p style={{ fontSize: 12, color: 'var(--color-text-subtle)', margin: 0 }}>No POs yet.</p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {s.purchaseOrders.map((po) => (
                          <div key={po.id} style={{ border: '1px solid var(--color-border)', borderRadius: 10, padding: '8px 10px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 600 }}>{po.reference}</span>
                              {po.amount != null && <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{fmt(po.amount)}</span>}
                              <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
                                {po.status === 'OPEN' ? (
                                  <button type="button" onClick={() => receivePO(po.id)} style={{ ...plainBtn, fontSize: 11, color: 'var(--ke-green-700)' }}>Receive</button>
                                ) : (
                                  <span style={{ fontSize: 11, color: 'var(--ke-green-700)' }}>{po.status}</span>
                                )}
                                <button type="button" onClick={() => openAttach({ purchaseOrderId: po.id, name: po.reference })} aria-label="Attach to PO" style={iconBtn}><Paperclip size={12} /></button>
                              </span>
                            </div>
                            {po.files.length > 0 && (
                              <div style={{ marginTop: 6 }}>
                                <FileList files={po.files} onDelete={deleteFile} compact />
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Supplier add/edit modal */}
      {supModal && (
        <Modal
          title={supModal === 'edit' ? 'Edit supplier' : 'Add supplier'}
          onClose={() => setSupModal(null)}
          footer={
            <>
              <Button size="sm" variant="outline" onClick={() => setSupModal(null)}>Cancel</Button>
              <Button size="sm" variant="primary" onClick={saveSupplier}>{busy ? 'Saving…' : 'Save'}</Button>
            </>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <TextInput label="Name" value={supForm.name} onChange={(v) => setSupForm({ ...supForm, name: v })} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <TextInput label="Contact email" value={supForm.contactEmail} onChange={(v) => setSupForm({ ...supForm, contactEmail: v })} type="email" />
              <TextInput label="Phone" value={supForm.contactPhone} onChange={(v) => setSupForm({ ...supForm, contactPhone: v })} />
            </div>
            <TextInput label="Website" value={supForm.website} onChange={(v) => setSupForm({ ...supForm, website: v })} placeholder="https://…" />
            <TextInput label="Address" value={supForm.address} onChange={(v) => setSupForm({ ...supForm, address: v })} />
            <TextInput label="Notes" value={supForm.notes} onChange={(v) => setSupForm({ ...supForm, notes: v })} placeholder="Lead time, payment terms…" />
          </div>
        </Modal>
      )}

      {/* New PO modal */}
      {poFor && (
        <Modal
          title={`New PO — ${poFor.name}`}
          onClose={() => setPoFor(null)}
          footer={
            <>
              <Button size="sm" variant="outline" onClick={() => setPoFor(null)}>Cancel</Button>
              <Button size="sm" variant="primary" onClick={createPO}>{busy ? 'Saving…' : 'Create PO'}</Button>
            </>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <TextInput label="Reference" value={poForm.reference} onChange={(v) => setPoForm({ ...poForm, reference: v })} placeholder="PO-0000" />
            <TextInput label="Amount (J$, optional)" value={poForm.amount} onChange={(v) => setPoForm({ ...poForm, amount: v })} type="number" />
          </div>
        </Modal>
      )}

      {/* Attach file/link modal */}
      {attach && (
        <Modal
          title={`Attach to ${attach.name}`}
          onClose={() => setAttach(null)}
          footer={
            <>
              <Button size="sm" variant="outline" onClick={() => setAttach(null)}>Cancel</Button>
              <Button size="sm" variant="primary" onClick={saveAttach}>{busy ? 'Saving…' : 'Attach'}</Button>
            </>
          }
        >
          {attError && (
            <div style={{ background: 'var(--color-danger-soft)', color: 'var(--color-danger)', borderRadius: 8, padding: '8px 10px', fontSize: 12, marginBottom: 10 }}>
              {attError}
            </div>
          )}
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <ModeTab active={attMode === 'file'} disabled={!storageEnabled} onClick={() => setAttMode('file')} icon={<Upload size={13} />} label="Upload file" />
            <ModeTab active={attMode === 'link'} onClick={() => setAttMode('link')} icon={<Link2 size={13} />} label="Add link" />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <TextInput label="Type" value={attForm.kind} onChange={(v) => setAttForm({ ...attForm, kind: v })} options={KIND_OPTIONS} />
            <TextInput label="Label" value={attForm.label} onChange={(v) => setAttForm({ ...attForm, label: v })} placeholder="e.g. April invoice" />
            {attMode === 'file' ? (
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6, color: 'var(--color-text-muted)' }}>File (up to 20 MB)</label>
                <input type="file" onChange={(e) => setAttFile(e.target.files?.[0] ?? null)} style={{ fontSize: 13 }} />
              </div>
            ) : (
              <TextInput label="Link (URL)" value={attForm.url} onChange={(v) => setAttForm({ ...attForm, url: v })} placeholder="https://…" />
            )}
            {!storageEnabled && (
              <p style={{ fontSize: 11.5, color: 'var(--color-text-subtle)', margin: 0 }}>
                File uploads are off until Supabase Storage is configured — links work now.
              </p>
            )}
          </div>
        </Modal>
      )}
    </div>
  )
}

function FileList({ files, onAttach, onDelete, heading, compact }: { files: PFile[]; onAttach?: () => void; onDelete: (id: string) => void; heading?: string; compact?: boolean }) {
  return (
    <div>
      {heading && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '.1em', color: 'var(--color-text-muted)' }} dangerouslySetInnerHTML={{ __html: heading }} />
          {onAttach && (
            <button type="button" onClick={onAttach} style={{ ...plainBtn, fontSize: 11.5, color: 'var(--ke-green-700)', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
              <Paperclip size={12} /> Attach
            </button>
          )}
        </div>
      )}
      {files.length === 0 ? (
        !compact && <p style={{ fontSize: 12, color: 'var(--color-text-subtle)', margin: 0 }}>Nothing attached yet.</p>
      ) : (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {files.map((f) => (
            <span key={f.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, border: '1px solid var(--color-border)', borderRadius: 999, padding: '3px 8px 3px 10px', fontSize: 11.5 }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9.5, color: 'var(--color-text-subtle)' }}>{KIND_LABEL[f.kind] ?? f.kind}</span>
              {f.url ? (
                <a href={f.url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--color-text)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  {f.label}
                  {f.isFile ? <Download size={12} /> : <ExternalLink size={12} />}
                </a>
              ) : (
                <span style={{ color: 'var(--color-text-subtle)' }} title="File unavailable — storage not configured">{f.label}</span>
              )}
              <button type="button" onClick={() => onDelete(f.id)} aria-label="Remove" style={{ ...plainBtn, color: 'var(--color-text-subtle)' }}><Trash2 size={12} /></button>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

function ModeTab({ active, disabled, onClick, icon, label }: { active: boolean; disabled?: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        padding: '8px 10px', borderRadius: 8,
        border: `1px solid ${active ? 'var(--ke-green-600)' : 'var(--color-border)'}`,
        background: active ? 'var(--ke-green-50, #eef7f0)' : '#fff',
        color: disabled ? 'var(--color-text-subtle)' : active ? 'var(--ke-green-700)' : 'var(--color-text-muted)',
        fontSize: 12.5, fontWeight: 600, cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.5 : 1,
      }}
    >
      {icon}
      {label}
    </button>
  )
}

function hrefFor(url: string): string {
  return /^https?:\/\//i.test(url) ? url : `https://${url}`
}

const plainBtn = { background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'inline-flex', color: 'var(--color-text-muted)' } as const
const iconBtn = {
  width: 26, height: 26, borderRadius: 7, border: '1px solid var(--color-border)', background: '#fff',
  cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)', flexShrink: 0,
} as const
