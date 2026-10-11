'use client'

import { useCallback, useEffect, useState } from 'react'
import { Plus, Rocket, UserCog, StickyNote, TriangleAlert } from 'lucide-react'
import { cardStyle, h3Style } from '../ui/card'
import Badge from '../ui/Badge'
import Button from '../ui/Button'
import Modal from '../ui/Modal'
import TextInput from '../ui/TextInput'
import Pill from '../ui/Pill'

type ActivityType = 'DEPLOY' | 'ADMIN_ACTION' | 'NOTE'
type LogLevel = 'INFO' | 'WARN' | 'ERROR'
type LogSource = 'SERVER' | 'CLIENT'

interface ActivityEntry {
  id: string
  type: ActivityType
  label: string
  detail: string | null
  entity: string | null
  entityId: string | null
  actorEmail: string | null
  createdAt: string
}

interface ClientLogEntry {
  id: string
  level: LogLevel
  source: LogSource
  message: string
  stack: string | null
  path: string | null
  userAgent: string | null
  createdAt: string
}

const th: React.CSSProperties = {
  textAlign: 'left',
  fontFamily: 'var(--font-mono)',
  fontSize: 9.5,
  letterSpacing: '.1em',
  textTransform: 'uppercase',
  color: 'var(--color-text-muted)',
  padding: '8px 10px',
  borderBottom: '1px solid var(--color-border)',
  whiteSpace: 'nowrap',
}
const td: React.CSSProperties = { padding: '10px', borderBottom: '1px solid var(--color-border)', fontSize: 13.5, verticalAlign: 'top' }

function Empty({ children }: { children: React.ReactNode }) {
  return <div style={{ padding: 28, textAlign: 'center', color: 'var(--color-text-muted)', fontSize: 13.5, lineHeight: 1.6 }}>{children}</div>
}

const ACTIVITY_ICON: Record<ActivityType, React.ReactNode> = {
  DEPLOY: <Rocket size={13} />,
  ADMIN_ACTION: <UserCog size={13} />,
  NOTE: <StickyNote size={13} />,
}

const ACTIVITY_LABEL: Record<ActivityType, string> = {
  DEPLOY: 'Deploy',
  ADMIN_ACTION: 'Admin action',
  NOTE: 'Note',
}

const LEVEL_TONE: Record<LogLevel, 'red' | 'orange' | 'blue'> = { ERROR: 'red', WARN: 'orange', INFO: 'blue' }

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

/**
 * Settings → Logs: a changelog of what shipped (auto-logged on every deploy,
 * plus admin-typed release notes), a trail of admin actions, and server/
 * client errors — all written by lib/activityLog.ts, lib/clientLog.ts,
 * instrumentation.ts and components/ClientLogger.tsx so nothing here has to
 * be entered by hand except the optional "Add note" entries.
 */
export default function LogsSection() {
  const [tab, setTab] = useState<'changelog' | 'activity' | 'errors'>('changelog')
  const [activity, setActivity] = useState<ActivityEntry[] | null>(null)
  const [clientLogs, setClientLogs] = useState<ClientLogEntry[] | null>(null)
  const [noteOpen, setNoteOpen] = useState(false)

  const loadActivity = useCallback(async () => {
    const res = await fetch('/api/admin/logs?kind=activity&pageSize=100')
    if (res.ok) setActivity((await res.json()).entries)
  }, [])

  const loadClient = useCallback(async () => {
    const res = await fetch('/api/admin/logs?kind=client&pageSize=100')
    if (res.ok) setClientLogs((await res.json()).entries)
  }, [])

  useEffect(() => {
    loadActivity()
    loadClient()
  }, [loadActivity, loadClient])

  const changelogRows = (activity ?? []).filter((a) => a.type === 'DEPLOY' || a.type === 'NOTE')
  const activityRows = (activity ?? []).filter((a) => a.type === 'ADMIN_ACTION')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Pill label="Changelog" selected={tab === 'changelog'} onClick={() => setTab('changelog')} />
          <Pill label="Admin activity" selected={tab === 'activity'} onClick={() => setTab('activity')} />
          <Pill label="Errors & health" selected={tab === 'errors'} onClick={() => setTab('errors')} />
        </div>
        {tab === 'changelog' && (
          <Button size="sm" variant="primary" onClick={() => setNoteOpen(true)} iconRight={<Plus size={14} />}>
            Add note
          </Button>
        )}
      </div>

      {tab === 'changelog' && (
        <div style={cardStyle}>
          <h3 style={h3Style}>What's changed</h3>
          {activity === null ? (
            <Empty>Loading…</Empty>
          ) : changelogRows.length === 0 ? (
            <Empty>Nothing logged yet — a deploy entry appears here automatically the next time the site ships.</Empty>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {changelogRows.map((a) => (
                <div key={a.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 0', borderTop: '1px solid var(--color-border)' }}>
                  <span style={{ width: 28, height: 28, borderRadius: 9, background: 'var(--ke-green-50,#eef7ee)', color: 'var(--ke-green-600)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>
                    {ACTIVITY_ICON[a.type]}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 13.5 }}>{a.label}</span>
                      <Badge tone={a.type === 'DEPLOY' ? 'green' : 'neutral'}>{ACTIVITY_LABEL[a.type]}</Badge>
                    </div>
                    {a.detail && <div style={{ fontSize: 12.5, color: 'var(--color-text-muted)', marginTop: 4, whiteSpace: 'pre-line' }}>{a.detail}</div>}
                    <div style={{ fontSize: 11, color: 'var(--color-text-subtle)', marginTop: 4 }}>
                      {fmtDate(a.createdAt)}
                      {a.actorEmail ? ` · ${a.actorEmail}` : ''}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'activity' && (
        <div style={cardStyle}>
          <h3 style={h3Style}>Admin activity</h3>
          {activity === null ? (
            <Empty>Loading…</Empty>
          ) : activityRows.length === 0 ? (
            <Empty>No admin actions logged yet.</Empty>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={th}>When</th>
                    <th style={th}>Action</th>
                    <th style={th}>Entity</th>
                    <th style={th}>Admin</th>
                  </tr>
                </thead>
                <tbody>
                  {activityRows.map((a) => (
                    <tr key={a.id}>
                      <td style={{ ...td, whiteSpace: 'nowrap', color: 'var(--color-text-muted)' }}>{fmtDate(a.createdAt)}</td>
                      <td style={td}>
                        <div style={{ fontWeight: 600 }}>{a.label}</div>
                        {a.detail && <div style={{ fontSize: 11.5, color: 'var(--color-text-muted)' }}>{a.detail}</div>}
                      </td>
                      <td style={{ ...td, color: 'var(--color-text-muted)' }}>{a.entity ?? '—'}</td>
                      <td style={{ ...td, color: 'var(--color-text-muted)' }}>{a.actorEmail ?? 'System'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === 'errors' && (
        <div style={cardStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <TriangleAlert size={15} style={{ color: 'var(--color-danger,#dc2626)' }} />
            <h3 style={{ ...h3Style, margin: 0 }}>Errors & health</h3>
          </div>
          <p style={{ fontSize: 12.5, color: 'var(--color-text-muted)', margin: '4px 0 12px' }}>
            Unhandled errors from the server and from visitors' browsers, captured automatically.
          </p>
          {clientLogs === null ? (
            <Empty>Loading…</Empty>
          ) : clientLogs.length === 0 ? (
            <Empty>No errors recorded. That's a good sign.</Empty>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={th}>When</th>
                    <th style={th}>Level</th>
                    <th style={th}>Source</th>
                    <th style={th}>Message</th>
                    <th style={th}>Path</th>
                  </tr>
                </thead>
                <tbody>
                  {clientLogs.map((c) => (
                    <tr key={c.id}>
                      <td style={{ ...td, whiteSpace: 'nowrap', color: 'var(--color-text-muted)' }}>{fmtDate(c.createdAt)}</td>
                      <td style={td}>
                        <Badge tone={LEVEL_TONE[c.level]}>{c.level}</Badge>
                      </td>
                      <td style={{ ...td, color: 'var(--color-text-muted)' }}>{c.source}</td>
                      <td style={{ ...td, maxWidth: 420 }}>{c.message}</td>
                      <td style={{ ...td, color: 'var(--color-text-muted)' }}>{c.path ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {noteOpen && (
        <AddNoteModal
          onClose={() => setNoteOpen(false)}
          onSaved={() => {
            setNoteOpen(false)
            loadActivity()
          }}
        />
      )}
    </div>
  )
}

function AddNoteModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [label, setLabel] = useState('')
  const [detail, setDetail] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const submit = async () => {
    setError('')
    if (!label.trim()) return setError('A short summary is required.')
    setBusy(true)
    const res = await fetch('/api/admin/logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ label: label.trim(), detail: detail.trim() || undefined }),
    })
    setBusy(false)
    if (!res.ok) return setError((await res.json().catch(() => ({}))).error || 'Could not save this note.')
    onSaved()
  }

  return (
    <Modal
      title="Add a changelog note"
      onClose={onClose}
      footer={
        <>
          <Button size="sm" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button size="sm" variant="primary" onClick={submit} disabled={busy}>
            {busy ? 'Saving…' : 'Save note'}
          </Button>
        </>
      }
    >
      <TextInput label="Summary" value={label} onChange={setLabel} placeholder="e.g. Fixed checkout address bug" />
      <TextInput label="Detail (optional)" value={detail} onChange={setDetail} multiline placeholder="Anything worth remembering about this change" />
      {error && <div style={{ color: 'var(--color-danger,#dc2626)', fontSize: 13 }}>{error}</div>}
    </Modal>
  )
}
