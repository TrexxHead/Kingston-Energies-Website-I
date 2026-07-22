'use client'

import { useCallback, useEffect, useState } from 'react'
import { FileText, Plus, ExternalLink, Trash2, FolderOpen } from 'lucide-react'
import { cardStyle, h3Style } from '../ui/card'
import Button from '../ui/Button'
import TextInput from '../ui/TextInput'
import Modal from '../ui/Modal'

interface Doc {
  id: string
  title: string
  url: string
  category: string | null
  date: string
}

/**
 * Policies & documentation manager. Stores links (e.g. Google Drive share URLs)
 * to SOPs, warranty policy and staff guides — no Drive API needed. Set
 * NEXT_PUBLIC_DRIVE_FOLDER_URL to surface a one-click "Open Drive folder" link.
 */
export default function DocumentsCard() {
  const [docs, setDocs] = useState<Doc[]>([])
  const [addOpen, setAddOpen] = useState(false)
  const [form, setForm] = useState({ title: '', url: '', category: '' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const driveFolder = process.env.NEXT_PUBLIC_DRIVE_FOLDER_URL

  const load = useCallback(async () => {
    const res = await fetch('/api/admin/documents')
    if (res.ok) setDocs((await res.json()).documents)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const add = async () => {
    setError('')
    setBusy(true)
    const res = await fetch('/api/admin/documents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: form.title,
        url: form.url,
        category: form.category || undefined,
      }),
    })
    setBusy(false)
    if (res.ok) {
      setForm({ title: '', url: '', category: '' })
      setAddOpen(false)
      load()
    } else {
      setError((await res.json().catch(() => ({}))).error ?? 'Could not add the document.')
    }
  }

  const remove = async (id: string) => {
    await fetch(`/api/admin/documents/${id}`, { method: 'DELETE' })
    load()
  }

  return (
    <div style={cardStyle}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
        <h3 style={{ ...h3Style, margin: 0 }}>Policies &amp; documentation</h3>
        <div style={{ display: 'flex', gap: 8 }}>
          {driveFolder && (
            <a href={driveFolder} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
              <Button size="sm" variant="outline" iconRight={<FolderOpen size={14} />}>Drive folder</Button>
            </a>
          )}
          <Button size="sm" variant="primary" onClick={() => setAddOpen(true)} iconRight={<Plus size={14} />}>Add link</Button>
        </div>
      </div>
      <p style={{ fontSize: 12.5, color: 'var(--color-text-muted)', margin: '0 0 14px' }}>
        Store links to your SOPs, warranty policy and staff guides — paste a Google Drive (or any) share URL.
      </p>

      {docs.length === 0 ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '18px 0', color: 'var(--color-text-muted)', fontSize: 13 }}>
          <FileText size={16} /> No documents yet. Add your first policy or guide link.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {docs.map((d) => (
            <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', border: '1px solid var(--color-border)', borderRadius: 10 }}>
              <FileText size={16} style={{ color: 'var(--ke-green-600)', flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 13.5 }}>{d.title}</div>
                <div style={{ fontSize: 11, color: 'var(--color-text-subtle)' }}>
                  {d.category ? `${d.category} · ` : ''}Added {d.date}
                </div>
              </div>
              <a href={d.url} target="_blank" rel="noopener noreferrer" aria-label={`Open ${d.title}`} style={{ color: 'var(--ke-green-700)', display: 'flex' }}>
                <ExternalLink size={16} />
              </a>
              <button type="button" onClick={() => remove(d.id)} aria-label={`Remove ${d.title}`} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-subtle)', display: 'flex', padding: 0 }}>
                <Trash2 size={15} />
              </button>
            </div>
          ))}
        </div>
      )}

      {addOpen && (
        <Modal
          title="Add document link"
          onClose={() => setAddOpen(false)}
          footer={
            <>
              <Button size="sm" variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
              <Button size="sm" variant="primary" onClick={add}>{busy ? 'Saving…' : 'Add'}</Button>
            </>
          }
        >
          {error && (
            <div style={{ background: 'var(--color-danger-soft)', color: 'var(--color-danger)', borderRadius: 8, padding: '8px 10px', fontSize: 12, marginBottom: 10 }}>
              {error}
            </div>
          )}
          <TextInput label="Title" value={form.title} onChange={(v) => setForm({ ...form, title: v })} placeholder="Warranty policy" />
          <TextInput label="Link (Google Drive or any URL)" value={form.url} onChange={(v) => setForm({ ...form, url: v })} placeholder="https://drive.google.com/…" />
          <TextInput label="Category (optional)" value={form.category} onChange={(v) => setForm({ ...form, category: v })} placeholder="SOP, Policy, Guide…" />
        </Modal>
      )}
    </div>
  )
}
