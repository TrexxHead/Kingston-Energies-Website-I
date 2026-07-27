'use client'

import { useCallback, useEffect, useState } from 'react'
import { Upload, FileText, Info, Trash2, ExternalLink } from 'lucide-react'
import { cardStyle, h3Style } from '../ui/card'
import Badge from '../ui/Badge'
import Button from '../ui/Button'
import Modal from '../ui/Modal'
import TextInput from '../ui/TextInput'
import { fmt } from '../mockData'
import { EXPENSE_CATEGORIES } from '@/lib/finance'

/**
 * Receipts and bills.
 *
 * Attaching the document to the expense is the whole point — it is what turns a
 * line in the books into something you can defend. Extraction, where it's
 * available, only saves typing; the confirmation step is always a person's.
 */
export default function DocumentsTab() {
  const [data, setData] = useState<DocumentsData | null>(null)
  const [uploadOpen, setUploadOpen] = useState(false)
  const [openId, setOpenId] = useState<string | null>(null)
  const [filter, setFilter] = useState<'NEEDS_REVIEW' | 'ALL'>('NEEDS_REVIEW')

  const load = useCallback(async () => {
    const res = await fetch(`/api/admin/finance/documents?status=${filter}`)
    if (res.ok) setData(await res.json())
  }, [filter])
  useEffect(() => {
    load()
  }, [load])

  if (!data) return <Empty>Loading…</Empty>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ ...cardStyle, borderRadius: 14, padding: '12px 14px', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
        <Info size={16} style={{ color: 'var(--color-text-muted)', flexShrink: 0, marginTop: 2 }} />
        <div style={{ fontSize: 13, lineHeight: 1.55, color: 'var(--color-text-muted)' }}>{data.ocr.message}</div>
      </div>

      <div style={cardStyle}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, gap: 10, flexWrap: 'wrap' }}>
          <h3 style={{ ...h3Style, margin: 0 }}>Receipts &amp; bills</h3>
          <div style={{ display: 'flex', gap: 8 }}>
            <Button size="sm" variant={filter === 'NEEDS_REVIEW' ? 'primary' : 'outline'} onClick={() => setFilter('NEEDS_REVIEW')}>
              Needs review
            </Button>
            <Button size="sm" variant={filter === 'ALL' ? 'primary' : 'outline'} onClick={() => setFilter('ALL')}>
              All
            </Button>
            <Button size="sm" onClick={() => setUploadOpen(true)} iconRight={<Upload size={14} />} disabled={!data.storageConfigured}>
              Upload
            </Button>
          </div>
        </div>

        {!data.storageConfigured && (
          <div style={{ fontSize: 13, color: 'var(--ke-sun-600,#b45309)', marginBottom: 12, lineHeight: 1.55 }}>
            File storage is not configured, so documents cannot be kept yet. Add the Supabase storage keys and this
            starts working.
          </div>
        )}

        {data.documents.length === 0 ? (
          <Empty>
            {filter === 'NEEDS_REVIEW'
              ? 'Nothing waiting for review.'
              : 'No documents captured yet. Photograph a receipt or upload a supplier bill and it stays attached to the expense it raises.'}
          </Empty>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {data.documents.map((doc) => (
              <div
                key={doc.id}
                onClick={() => setOpenId(doc.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12,
                  padding: '12px 14px',
                  border: '1px solid var(--color-border)',
                  borderRadius: 14,
                  cursor: 'pointer',
                  flexWrap: 'wrap',
                }}
              >
                <div style={{ display: 'flex', gap: 12, alignItems: 'center', minWidth: 0 }}>
                  <FileText size={18} style={{ color: 'var(--color-text-muted)', flexShrink: 0 }} />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 600 }}>{doc.vendor || doc.filename}</div>
                    <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                      {doc.documentDate ? new Date(doc.documentDate).toLocaleDateString('en-JM', { day: 'numeric', month: 'short', year: 'numeric' }) : 'no date yet'}
                      {doc.category ? ` · ${doc.category}` : ''}
                      {doc.provider ? ` · read by ${doc.provider}` : ''}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>
                    {doc.total ? fmt(Math.round(doc.total)) : '—'}
                  </span>
                  <Badge tone={doc.status === 'CONFIRMED' ? 'green' : doc.status === 'FAILED' ? 'red' : 'orange'}>
                    {doc.status === 'CONFIRMED' ? 'Confirmed' : doc.status === 'FAILED' ? 'Failed' : 'Needs review'}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {uploadOpen && (
        <UploadModal
          onClose={() => setUploadOpen(false)}
          onDone={(id) => {
            setUploadOpen(false)
            load()
            setOpenId(id)
          }}
        />
      )}

      {openId && (
        <DocumentModal
          id={openId}
          onClose={() => setOpenId(null)}
          onChanged={() => {
            setOpenId(null)
            load()
          }}
        />
      )}
    </div>
  )
}

function Empty({ children }: { children: React.ReactNode }) {
  return <div style={{ padding: 28, textAlign: 'center', color: 'var(--color-text-muted)', fontSize: 13.5, lineHeight: 1.6 }}>{children}</div>
}

interface DocumentsData {
  ocr: { available: boolean; provider: string | null; message: string }
  storageConfigured: boolean
  lowConfidence: number
  documents: {
    id: string
    filename: string
    status: 'NEEDS_REVIEW' | 'CONFIRMED' | 'FAILED'
    provider: string | null
    vendor: string | null
    documentDate: string | null
    total: number | null
    category: string | null
  }[]
}

// ---------------------------------------------------------------------------

function UploadModal({ onClose, onDone }: { onClose: () => void; onDone: (id: string) => void }) {
  const [file, setFile] = useState<File | null>(null)
  const [kind, setKind] = useState('Receipt')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const KINDS: Record<string, string> = { Receipt: 'RECEIPT', 'Supplier bill': 'BILL', Statement: 'STATEMENT', Other: 'OTHER' }

  const upload = async () => {
    if (!file) return setError('Choose a file first.')
    setError('')
    setBusy(true)
    const body = new FormData()
    body.append('file', file)
    body.append('kind', KINDS[kind] ?? 'RECEIPT')
    const res = await fetch('/api/admin/finance/documents', { method: 'POST', body })
    setBusy(false)
    const json = await res.json().catch(() => ({}))
    if (!res.ok) return setError(json.error || 'Could not upload that document.')
    onDone(json.id)
  }

  return (
    <Modal onClose={onClose} title="Upload document">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <TextInput label="Type" value={kind} options={Object.keys(KINDS)} onChange={setKind} />
        <input type="file" accept="image/*,application/pdf" onChange={(e) => setFile(e.target.files?.[0] ?? null)} style={{ fontSize: 13 }} />
        <p style={{ fontSize: 12.5, color: 'var(--color-text-muted)', margin: 0, lineHeight: 1.5 }}>
          Photos over 5MB are compressed automatically. Files are kept in private storage and only ever opened through
          a short-lived link from this dashboard.
        </p>
        {error && <div style={{ color: 'var(--color-danger,#dc2626)', fontSize: 13 }}>{error}</div>}
        <Button onClick={upload} disabled={busy || !file}>
          {busy ? 'Uploading…' : 'Upload'}
        </Button>
      </div>
    </Modal>
  )
}

// ---------------------------------------------------------------------------

interface DocumentDetail {
  id: string
  filename: string
  status: 'NEEDS_REVIEW' | 'CONFIRMED' | 'FAILED'
  provider: string | null
  confidence: Record<string, number> | null
  vendor: string | null
  documentDate: string | null
  total: number | null
  taxAmount: number | null
  currency: string
  category: string | null
  notes: string | null
  fileUrl: string | null
  expense: { id: string; category: string; amount: number } | null
}

function DocumentModal({ id, onClose, onChanged }: { id: string; onClose: () => void; onChanged: () => void }) {
  const [doc, setDoc] = useState<DocumentDetail | null>(null)
  const [form, setForm] = useState({ vendor: '', documentDate: '', total: '', taxAmount: '', category: EXPENSE_CATEGORIES[0] as string, notes: '' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    ;(async () => {
      const res = await fetch(`/api/admin/finance/documents/${id}`)
      if (!res.ok) return
      const json: DocumentDetail = await res.json()
      setDoc(json)
      setForm({
        vendor: json.vendor ?? '',
        documentDate: json.documentDate ? json.documentDate.slice(0, 10) : '',
        total: json.total != null ? String(json.total) : '',
        taxAmount: json.taxAmount != null ? String(json.taxAmount) : '',
        category: json.category ?? (EXPENSE_CATEGORIES[0] as string),
        notes: json.notes ?? '',
      })
    })()
  }, [id])

  const save = async (confirm: boolean) => {
    setError('')
    setBusy(true)
    const res = await fetch(`/api/admin/finance/documents/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        vendor: form.vendor,
        documentDate: form.documentDate || undefined,
        total: form.total ? Number(form.total) : undefined,
        taxAmount: form.taxAmount ? Number(form.taxAmount) : undefined,
        category: form.category,
        notes: form.notes,
        confirm,
      }),
    })
    setBusy(false)
    if (!res.ok) return setError((await res.json().catch(() => ({}))).error || 'Could not save this document.')
    onChanged()
  }

  const remove = async () => {
    if (!confirm('Discard this document?')) return
    const res = await fetch(`/api/admin/finance/documents/${id}`, { method: 'DELETE' })
    if (!res.ok) return setError((await res.json().catch(() => ({}))).error || 'Could not discard this document.')
    onChanged()
  }

  if (!doc) return null
  const confirmed = doc.status === 'CONFIRMED'
  // A field the extractor was unsure about is worth pointing at rather than
  // presenting with the same confidence as the rest.
  const weak = (field: string) => doc.confidence && doc.confidence[field] != null && doc.confidence[field] < 0.75

  return (
    <Modal onClose={onClose} title={confirmed ? 'Document' : 'Confirm document'} width={520}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {doc.fileUrl && (
          <a
            href={doc.fileUrl}
            target="_blank"
            rel="noreferrer"
            style={{ fontSize: 13, color: 'var(--ke-green-700,#15803d)', display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            Open {doc.filename} <ExternalLink size={13} />
          </a>
        )}

        {confirmed ? (
          <div style={{ fontSize: 13.5, lineHeight: 1.7 }}>
            <div>
              <strong>{doc.vendor || doc.filename}</strong>
            </div>
            <div style={{ color: 'var(--color-text-muted)' }}>
              {doc.documentDate ? new Date(doc.documentDate).toLocaleDateString('en-JM', { day: 'numeric', month: 'short', year: 'numeric' }) : ''} ·{' '}
              {doc.category} · {doc.total ? fmt(Math.round(doc.total)) : ''}
            </div>
            {doc.expense && (
              <div style={{ color: 'var(--color-text-muted)', marginTop: 8 }}>
                Raised as an expense and posted to the ledger.
              </div>
            )}
          </div>
        ) : (
          <>
            {doc.provider && (
              <p style={{ fontSize: 12.5, color: 'var(--color-text-muted)', margin: 0, lineHeight: 1.5 }}>
                Fields pre-filled by {doc.provider}. Check them against the document — anything highlighted was read
                with low confidence.
              </p>
            )}
            <TextInput label={weak('vendor') ? 'Supplier (check this)' : 'Supplier'} value={form.vendor} onChange={(v) => setForm({ ...form, vendor: v })} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <TextInput label={weak('documentDate') ? 'Date (check this)' : 'Date'} type="date" value={form.documentDate} onChange={(v) => setForm({ ...form, documentDate: v })} />
              <TextInput label={weak('total') ? 'Total J$ (check this)' : 'Total J$'} value={form.total} onChange={(v) => setForm({ ...form, total: v })} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <TextInput label="GCT included J$" value={form.taxAmount} onChange={(v) => setForm({ ...form, taxAmount: v })} />
              <TextInput label="Category" value={form.category} options={[...EXPENSE_CATEGORIES]} onChange={(v) => setForm({ ...form, category: v })} />
            </div>
            <TextInput label="Notes" value={form.notes} onChange={(v) => setForm({ ...form, notes: v })} />
            <p style={{ fontSize: 12.5, color: 'var(--color-text-muted)', margin: 0, lineHeight: 1.5 }}>
              Confirming raises an expense for this amount and posts it to the ledger, with this document kept as the
              evidence behind it.
            </p>
          </>
        )}

        {error && <div style={{ color: 'var(--color-danger,#dc2626)', fontSize: 13 }}>{error}</div>}

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {!confirmed && (
            <>
              <Button onClick={() => save(true)} disabled={busy}>
                {busy ? 'Saving…' : 'Confirm & raise expense'}
              </Button>
              <Button variant="outline" onClick={() => save(false)} disabled={busy}>
                Save for later
              </Button>
            </>
          )}
          <Button variant="outline" onClick={remove} iconRight={<Trash2 size={13} />}>
            Discard
          </Button>
        </div>
      </div>
    </Modal>
  )
}
