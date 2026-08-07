'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Folder, FileText, Upload, FolderPlus, ChevronRight, HardDrive, Download } from 'lucide-react'
import { cardStyle, h3Style } from '../ui/card'
import Badge from '../ui/Badge'
import Button from '../ui/Button'
import Modal from '../ui/Modal'
import TextInput from '../ui/TextInput'
import { initials } from '@/lib/initials'

interface FolderRow {
  id: string
  name: string
  itemCount: number
  sharedWith: { id: string; name: string; photoUrl: string | null }[]
}

interface FileRow {
  id: string
  name: string
  fileName: string
  contentType: string
  sizeBytes: number
  ownerId: string | null
  ownerName: string | null
  uploadedBy: string | null
  createdAt: string
  url: string | null
}

interface Listing {
  folder: { id: string; breadcrumb: { id: string; name: string }[] } | null
  folders: FolderRow[]
  files: FileRow[]
  storage: { usedBytes: number; quotaBytes: number }
  storageEnabled: boolean
}

interface Person { id: string; firstName: string; lastName: string }

function fileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
}

export default function HrDocuments() {
  const [currentFolder, setCurrentFolder] = useState<string | null>(null)
  const [data, setData] = useState<Listing | null>(null)
  const [people, setPeople] = useState<Person[]>([])
  const [newFolderOpen, setNewFolderOpen] = useState(false)
  const [folderName, setFolderName] = useState('')
  const [shareIds, setShareIds] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const load = useCallback(async () => {
    const res = await fetch(`/api/admin/hr/documents${currentFolder ? `?folderId=${currentFolder}` : ''}`)
    if (res.ok) setData(await res.json())
  }, [currentFolder])

  useEffect(() => { load() }, [load])
  useEffect(() => {
    fetch('/api/admin/hr/people').then((r) => (r.ok ? r.json() : null)).then((d) => setPeople(d?.people ?? [])).catch(() => {})
  }, [])

  const createFolder = async () => {
    if (!folderName.trim()) return
    setBusy(true)
    await fetch('/api/admin/hr/documents/folders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: folderName, parentId: currentFolder || undefined, sharedWith: shareIds }),
    })
    setBusy(false)
    setNewFolderOpen(false)
    setFolderName('')
    setShareIds([])
    load()
  }

  const uploadFile = async (file: File) => {
    const fd = new FormData()
    fd.append('file', file)
    if (currentFolder) fd.append('folderId', currentFolder)
    await fetch('/api/admin/hr/documents/upload', { method: 'POST', body: fd })
    load()
  }

  const deleteFile = async (id: string) => {
    if (!confirm('Delete this file?')) return
    await fetch(`/api/admin/hr/documents/${id}`, { method: 'DELETE' })
    load()
  }

  const usedPct = data ? Math.min(100, (data.storage.usedBytes / data.storage.quotaBytes) * 100) : 0
  const quickAccess = (data?.folders ?? []).filter((f) => f.sharedWith.length > 0).slice(0, 4)

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 20 }} className="kp-2col">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={cardStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <HardDrive size={15} color="var(--color-primary)" />
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13 }}>Storage</span>
          </div>
          {data ? (
            <>
              <div style={{ height: 8, borderRadius: 999, background: 'var(--color-surface-sunk)', overflow: 'hidden', marginBottom: 8 }}>
                <div style={{ height: '100%', width: `${usedPct}%`, background: usedPct > 90 ? 'var(--viz-critical)' : 'var(--color-primary)', borderRadius: 999 }} />
              </div>
              <div style={{ fontSize: 11.5, color: 'var(--color-text-muted)' }}>
                {fileSize(data.storage.usedBytes)} of {fileSize(data.storage.quotaBytes)} used
              </div>
              {!data.storageEnabled && (
                <div style={{ fontSize: 11, color: 'var(--ke-sun-500)', marginTop: 8 }}>File storage isn't configured yet — uploads are disabled.</div>
              )}
            </>
          ) : (
            <div style={{ fontSize: 11.5, color: 'var(--color-text-muted)' }}>Loading…</div>
          )}
        </div>

        {quickAccess.length > 0 && (
          <div style={cardStyle}>
            <h3 style={{ ...h3Style, fontSize: 13, margin: '0 0 10px' }}>Shared with someone</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {quickAccess.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setCurrentFolder(f.id)}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 8px', borderRadius: 8, border: 'none', background: 'none', cursor: 'pointer', textAlign: 'left' }}
                >
                  <Folder size={14} color="var(--ke-sun-400)" style={{ flexShrink: 0 }} />
                  <span style={{ fontSize: 12, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12.5, flexWrap: 'wrap' }}>
            <button type="button" onClick={() => setCurrentFolder(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: currentFolder ? 'var(--color-text-muted)' : 'var(--color-text)', fontWeight: currentFolder ? 500 : 700, fontFamily: 'var(--font-display)' }}>
              My Drive
            </button>
            {(data?.folder?.breadcrumb ?? []).map((b, i, arr) => (
              <span key={b.id} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <ChevronRight size={13} color="var(--color-text-subtle)" />
                <button type="button" onClick={() => setCurrentFolder(b.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: i === arr.length - 1 ? 'var(--color-text)' : 'var(--color-text-muted)', fontWeight: i === arr.length - 1 ? 700 : 500, fontFamily: 'var(--font-display)' }}>
                  {b.name}
                </button>
              </span>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Button size="sm" variant="outline" onClick={() => setNewFolderOpen(true)} iconRight={<FolderPlus size={13} />}>New folder</Button>
            <Button size="sm" variant="primary" onClick={() => fileInputRef.current?.click()} iconRight={<Upload size={13} />}>Upload</Button>
            <input ref={fileInputRef} type="file" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadFile(f); e.target.value = '' }} />
          </div>
        </div>

        {(data?.folders?.length ?? 0) > 0 && (
          <div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9.5, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--color-text-subtle)', marginBottom: 8 }}>Folders</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', gap: 10 }}>
              {data!.folders.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setCurrentFolder(f.id)}
                  style={{ ...cardStyle, borderRadius: 14, padding: 14, textAlign: 'left', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 10 }}
                >
                  <Folder size={20} color="var(--ke-sun-400)" fill="var(--ke-sun-50)" />
                  <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 11, color: 'var(--color-text-subtle)' }}>{f.itemCount} item{f.itemCount === 1 ? '' : 's'}</span>
                    {f.sharedWith.length > 0 && (
                      <div style={{ display: 'flex' }}>
                        {f.sharedWith.slice(0, 3).map((m, i) => (
                          <div key={m.id} title={m.name} style={{ width: 20, height: 20, borderRadius: '50%', marginLeft: i === 0 ? 0 : -6, border: '1.5px solid var(--color-surface)', background: 'var(--color-primary-soft)', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, fontWeight: 700, fontFamily: 'var(--font-display)' }}>
                            {initials(m.name)}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        <div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9.5, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--color-text-subtle)', marginBottom: 8 }}>Files</div>
          <div style={{ ...cardStyle, padding: 0, overflow: 'hidden' }}>
            {!data ? (
              <div style={{ padding: 20, fontSize: 12.5, color: 'var(--color-text-muted)' }}>Loading…</div>
            ) : data.files.length === 0 ? (
              <div style={{ padding: 20, fontSize: 12.5, color: 'var(--color-text-muted)' }}>No files in this folder yet.</div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
                  <thead>
                    <tr>
                      {['Name', 'Owner', 'Modified', 'Size', ''].map((c) => (
                        <th key={c} style={{ textAlign: 'left', fontFamily: 'var(--font-mono)', fontSize: 9.5, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--color-text-subtle)', padding: '10px 16px', borderBottom: '1px solid var(--color-border)' }}>{c}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.files.map((f) => (
                      <tr key={f.id}>
                        <td style={{ padding: '10px 16px', borderBottom: '1px solid var(--color-border)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <FileText size={14} color="var(--color-text-subtle)" />
                            {f.name}
                          </div>
                        </td>
                        <td style={{ padding: '10px 16px', borderBottom: '1px solid var(--color-border)', color: 'var(--color-text-muted)' }}>{f.ownerName ?? '—'}</td>
                        <td style={{ padding: '10px 16px', borderBottom: '1px solid var(--color-border)', color: 'var(--color-text-muted)' }}>{new Date(f.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                        <td style={{ padding: '10px 16px', borderBottom: '1px solid var(--color-border)', color: 'var(--color-text-muted)', fontVariantNumeric: 'tabular-nums' }}>{fileSize(f.sizeBytes)}</td>
                        <td style={{ padding: '10px 16px', borderBottom: '1px solid var(--color-border)', textAlign: 'right', whiteSpace: 'nowrap' }}>
                          {f.url && (
                            <a href={f.url} target="_blank" rel="noopener noreferrer" aria-label="Download" style={{ color: 'var(--color-text-subtle)', marginRight: 10, display: 'inline-flex' }}>
                              <Download size={14} />
                            </a>
                          )}
                          <button type="button" onClick={() => deleteFile(f.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-danger)', fontSize: 11.5, fontFamily: 'var(--font-display)', fontWeight: 600 }}>Delete</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {newFolderOpen && (
        <Modal
          title="New folder"
          onClose={() => setNewFolderOpen(false)}
          footer={
            <>
              <Button size="sm" variant="outline" onClick={() => setNewFolderOpen(false)}>Cancel</Button>
              <Button size="sm" variant="primary" onClick={createFolder}>{busy ? 'Creating…' : 'Create'}</Button>
            </>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <TextInput label="Folder name" value={folderName} onChange={setFolderName} placeholder="Contracts" />
            <div>
              <span style={{ display: 'block', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 12.5, marginBottom: 6 }}>Share with (optional)</span>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {people.map((p) => (
                  <Badge
                    key={p.id}
                    tone={shareIds.includes(p.id) ? 'green' : 'neutral'}
                    onClick={() => setShareIds((s) => (s.includes(p.id) ? s.filter((x) => x !== p.id) : [...s, p.id]))}
                  >
                    {p.firstName} {p.lastName}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
