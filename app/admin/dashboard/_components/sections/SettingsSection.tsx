'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { ShieldCheck, Megaphone, FileText, Table2, ChevronRight, Plus, X } from 'lucide-react'
import { cardStyle, h3Style } from '../ui/card'
import Badge from '../ui/Badge'
import Button from '../ui/Button'
import Modal from '../ui/Modal'
import TextInput from '../ui/TextInput'
import { initials, type SectionId } from '../mockData'
import PaymentSettingsCard from './PaymentSettingsCard'

interface Admin {
  id: string
  name: string | null
  email: string
  role: string
  status: 'active' | 'dormant' | 'offline'
  lastActive: string
}

const STATUS: Record<Admin['status'], { label: string; color: string }> = {
  active: { label: 'Active', color: 'var(--ke-green-500)' },
  dormant: { label: 'Dormant', color: 'var(--ke-sun-400)' },
  offline: { label: 'Offline', color: 'var(--ke-gray-400, #9aa39d)' },
}

const CONFIG_LINKS: { tab: SectionId; icon: typeof Megaphone; label: string; desc: string }[] = [
  { tab: 'marketing2', icon: Megaphone, label: 'Site announcement & promos', desc: 'Billboard bar, banners, codes' },
  { tab: 'inventory', icon: FileText, label: 'Policies & documents', desc: 'Upload and organise files' },
  { tab: 'exec', icon: Table2, label: 'Live spreadsheet sync', desc: 'Google Sheets export' },
]

export default function SettingsSection({ onNavigate }: { onNavigate?: (tab: SectionId) => void }) {
  const { data: session } = useSession()
  const isSuperAdmin = session?.user?.role === 'SUPER_ADMIN'
  const [admins, setAdmins] = useState<Admin[]>([])
  const [addOpen, setAddOpen] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'ADMIN' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const loadAdmins = () => {
    fetch('/api/admin/admins')
      .then((r) => (r.ok ? r.json() : { admins: [] }))
      .then((d) => setAdmins(d.admins ?? []))
      .catch(() => {})
  }

  useEffect(() => {
    loadAdmins()
  }, [])

  const createAdmin = async () => {
    setError('')
    if (!form.name.trim() || !form.email.trim() || form.password.length < 8) {
      setError('Fill in a name, email, and a password of at least 8 characters.')
      return
    }
    setBusy(true)
    const res = await fetch('/api/admin/admins', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const data = await res.json().catch(() => ({}))
    setBusy(false)
    if (!res.ok) {
      setError(data.error ?? 'Could not create that admin.')
      return
    }
    setAddOpen(false)
    setForm({ name: '', email: '', password: '', role: 'ADMIN' })
    loadAdmins()
  }

  const removeAdmin = async (id: string, label: string) => {
    if (!confirm(`Remove ${label}'s admin access? They'll become a regular customer account.`)) return
    const res = await fetch(`/api/admin/admins/${id}`, { method: 'DELETE' })
    if (res.ok) loadAdmins()
    else {
      const data = await res.json().catch(() => ({}))
      alert(data.error ?? 'Could not remove that admin.')
    }
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: 16, alignItems: 'start' }}>
      {/* Admin users + status */}
      <div style={cardStyle}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 9, marginBottom: 6 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <ShieldCheck size={17} color="var(--ke-green-600)" />
            <h3 style={{ ...h3Style, margin: 0 }}>Administrators</h3>
          </div>
          {isSuperAdmin && (
            <Button size="sm" variant="primary" onClick={() => setAddOpen(true)} iconRight={<Plus size={14} />}>Add admin</Button>
          )}
        </div>
        <p style={{ fontSize: 12.5, color: 'var(--color-text-muted)', margin: '0 0 14px' }}>
          Everyone with dashboard access. Status reflects their recent activity on the site.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {admins.length === 0 && <p style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>Loading…</p>}
          {admins.map((a) => {
            const s = STATUS[a.status]
            return (
              <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', border: '1px solid var(--color-border)', borderRadius: 12 }}>
                <span style={{ position: 'relative', width: 36, height: 36, borderRadius: 999, background: 'var(--gradient-brand)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13, flexShrink: 0 }}>
                  {initials(a.name ?? a.email)}
                  <span title={s.label} style={{ position: 'absolute', bottom: -1, right: -1, width: 11, height: 11, borderRadius: 999, background: s.color, border: '2px solid #fff' }} />
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 13.5 }}>{a.name ?? a.email}</div>
                  <div style={{ fontSize: 11.5, color: 'var(--color-text-subtle)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.email}</div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <Badge tone={a.role === 'SUPER_ADMIN' ? 'green' : 'neutral'}>{a.role === 'SUPER_ADMIN' ? 'Super admin' : 'Admin'}</Badge>
                  <div style={{ fontSize: 10.5, color: 'var(--color-text-subtle)', marginTop: 4 }}>
                    <span style={{ color: s.color, fontWeight: 600 }}>{s.label}</span> · {a.lastActive}
                  </div>
                </div>
                {isSuperAdmin && a.id !== session?.user?.id && (
                  <button
                    type="button"
                    onClick={() => removeAdmin(a.id, a.name ?? a.email)}
                    title="Remove admin access"
                    style={{ background: 'none', border: 'none', color: 'var(--color-text-subtle)', cursor: 'pointer', padding: 4, flexShrink: 0 }}
                  >
                    <X size={15} />
                  </button>
                )}
              </div>
            )
          })}
        </div>
        {!isSuperAdmin && (
          <p style={{ fontSize: 11.5, color: 'var(--color-text-subtle)', marginTop: 12 }}>
            Only a super admin can add or remove administrators.
          </p>
        )}
      </div>

      <PaymentSettingsCard />

      {/* Site configuration quick links */}
      <div style={cardStyle}>
        <h3 style={h3Style}>Site configuration</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
          {CONFIG_LINKS.map((c) => (
            <button
              key={c.label}
              type="button"
              onClick={() => onNavigate?.(c.tab)}
              style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 12px', border: '1px solid var(--color-border)', borderRadius: 12, background: '#fff', cursor: 'pointer', textAlign: 'left', width: '100%' }}
            >
              <span style={{ width: 32, height: 32, borderRadius: 9, background: 'var(--ke-green-50)', color: 'var(--ke-green-700)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <c.icon size={16} />
              </span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: 'block', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 13.5 }}>{c.label}</span>
                <span style={{ display: 'block', fontSize: 11.5, color: 'var(--color-text-muted)' }}>{c.desc}</span>
              </span>
              <ChevronRight size={15} style={{ color: 'var(--color-text-subtle)' }} />
            </button>
          ))}
        </div>
      </div>

      {addOpen && (
        <Modal
          title="Add an admin"
          onClose={() => { setAddOpen(false); setError('') }}
          footer={
            <>
              <Button size="sm" variant="outline" onClick={() => { setAddOpen(false); setError('') }}>Cancel</Button>
              <Button size="sm" variant="primary" onClick={createAdmin} disabled={busy}>{busy ? 'Creating…' : 'Create admin'}</Button>
            </>
          }
        >
          <TextInput label="Name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
          <TextInput label="Email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} type="email" />
          <TextInput label="Password" value={form.password} onChange={(v) => setForm({ ...form, password: v })} type="password" />
          <TextInput label="Role" value={form.role} onChange={(v) => setForm({ ...form, role: v })} options={['ADMIN', 'SUPER_ADMIN']} />
          {error && <p style={{ fontSize: 12.5, color: 'var(--color-danger)', marginTop: 8 }}>{error}</p>}
        </Modal>
      )}
    </div>
  )
}
