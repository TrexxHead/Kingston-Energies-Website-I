'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { FileText, Plus, ExternalLink, Trash2, FolderOpen, Upload, Download, Link2 } from 'lucide-react'
import { cardStyle, h3Style } from '../ui/card'
import Button from '../ui/Button'
import TextInput from '../ui/TextInput'
import Modal from '../ui/Modal'

interface Doc {
  id: string
  title: string
  url: string | null
  isFile: boolean
  fileName: string | null
  category: string | null
  date: string
}

type Mode = 'file' | 'link'

/**
 * Policies & documentation manager. Supports two kinds of entry:
 *  • Uploaded files — stored in a private Supabase Storage bucket, served via
 *    short-lived signed URLs (only when storage is configured).
 *  • Links — e.g. Google Drive share URLs, no storage needed.
 * Set NEXT_PUBLIC_DRIVE_FOLDER_URL to surface a one-click "Drive folder" link.
 */
export default function DocumentsCard() {
  const [docs, setDocs] = useState<Doc[]>([])
  const [storageEnabled, setStorageEnabled] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const [mode, setMode] = useState<Mode>('link')
  const [form, setForm] = useState({ title: '', url: '', category: '' })
  const [file, setFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const driveFolder = process.env.NEXT_PUBLIC_DRIVE_FOLDER_URL

  const load = useCallback(async () => {
    const res = await fetch('/api/admin/documents')
    if (res.ok) {
      const data = await res.json()
      setDocs(data.documents)
      setStorageEnabled(Boolean(data.storageEnabled))
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const openAdd = () => {
    setForm({ title: '', url: '', category: '' })
    setFile(null)
    setError('')
    setMode(storageEnabled ? 'file' : 'link')
    setAddOpen(true)
  }

  const submit = async () => {
    setError('')
    setBusy(true)
    let res: Response
    if (mode === 'file') {
      if (!file) {
        setBusy(false)
        setError('Choose a file to upload.')
        return
      }
      const body = new FormData()
      body.append('file', file)
      body.append('title', form.title)
      body.append('category', form.category)
      res = await fetch('/api/admin/documents', { method: 'POST', body })
    } else {
      res = await fetch('/api/admin/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: form.title, url: form.url, category: form.category || undefined }),
      })
    }
    setBusy(false)
    if (res.ok) {
      setAddOpen(false)
      load()
    } else {
      setError((await res.json().catch(() => ({}))).error ?? 'Could not save the document.')
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
          <Button size="sm" variant="primary" onClick={openAdd} iconRight={<Plus size={14} />}>Add</Button>
        </div>
      </div>
      <p style={{ fontSize: 12.5, color: 'var(--color-text-muted)', margin: '0 0 14px' }}>
        {storageEnabled
          ? 'Upload SOPs, warranty policy, manuals and staff guides — or paste a share link.'
          : 'Store links to your SOPs, warranty policy and staff guides — paste a Google Drive (or any) share URL.'}
      </p>

      {docs.length === 0 ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '18px 0', color: 'var(--color-text-muted)', fontSize: 13 }}>
          <FileText size={16} /> No documents yet. Add your first policy or guide.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {docs.map((d) => (
            <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', border: '1px solid var(--color-border)', borderRadius: 10 }}>
              {d.isFile ? <FileText size={16} style={{ color: 'var(--ke-green-600)', flexShrink: 0 }} /> : <Link2 size={16} style={{ color: 'var(--ke-green-600)', flexShrink: 0 }} />}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 13.5 }}>{d.title}</div>
                <div style={{ fontSize: 11, color: 'var(--color-text-subtle)' }}>
                  {d.category ? `${d.category} · ` : ''}{d.isFile ? 'File · ' : 'Link · '}Added {d.date}
                </div>
              </div>
              {d.url ? (
                <a href={d.url} target="_blank" rel="noopener noreferrer" aria-label={`Open ${d.title}`} style={{ color: 'var(--ke-green-700)', display: 'flex' }}>
                  {d.isFile ? <Download size={16} /> : <ExternalLink size={16} />}
                </a>
              ) : (
                <span title="File unavailable — storage not configured" style={{ color: 'var(--color-text-subtle)', display: 'flex' }}>
                  <Download size={16} />
                </span>
              )}
              <button type="button" onClick={() => remove(d.id)} aria-label={`Remove ${d.title}`} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-subtle)', display: 'flex', padding: 0 }}>
                <Trash2 size={15} />
              </button>
            </div>
          ))}
        </div>
      )}

      {addOpen && (
        <Modal
          title="Add document"
          onClose={() => setAddOpen(false)}
          footer={
            <>
              <Button size="sm" variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
              <Button size="sm" variant="primary" onClick={submit}>{busy ? 'Saving…' : 'Add'}</Button>
            </>
          }
        >
          {error && (
            <div style={{ background: 'var(--color-danger-soft)', color: 'var(--color-danger)', borderRadius: 8, padding: '8px 10px', fontSize: 12, marginBottom: 10 }}>
              {error}
            </div>
          )}

          {/* Upload / link toggle — upload only when storage is configured. */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
            <ModeTab active={mode === 'file'} disabled={!storageEnabled} onClick={() => setMode('file')} icon={<Upload size={13} />} label="Upload file" />
            <ModeTab active={mode === 'link'} onClick={() => setMode('link')} icon={<Link2 size={13} />} label="Add link" />
          </div>

          <TextInput label="Title" value={form.title} onChange={(v) => setForm({ ...form, title: v })} placeholder="Warranty policy" />

          {mode === 'file' ? (
            <div style={{ margin: '4px 0 8px' }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6, color: 'var(--color-text-muted)' }}>File (PDF, image or doc — up to 20 MB)</label>
              <input
                ref={fileRef}
                type="file"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                style={{ fontSize: 13 }}
              />
            </div>
          ) : (
            <TextInput label="Link (Google Drive or any URL)" value={form.url} onChange={(v) => setForm({ ...form, url: v })} placeholder="https://drive.google.com/…" />
          )}

          <TextInput label="Category (optional)" value={form.category} onChange={(v) => setForm({ ...form, category: v })} placeholder="SOP, Policy, Guide…" />

          {!storageEnabled && (
            <p style={{ fontSize: 11.5, color: 'var(--color-text-subtle)', marginTop: 10 }}>
              File uploads are off until Supabase Storage is configured — links work now.
            </p>
          )}
        </Modal>
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
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        padding: '8px 10px',
        borderRadius: 8,
        border: `1px solid ${active ? 'var(--ke-green-600)' : 'var(--color-border)'}`,
        background: active ? 'var(--ke-green-50, #eef7f0)' : '#fff',
        color: disabled ? 'var(--color-text-subtle)' : active ? 'var(--ke-green-700)' : 'var(--color-text-muted)',
        fontSize: 12.5,
        fontWeight: 600,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
      }}
    >
      {icon}
      {label}
    </button>
  )
}
