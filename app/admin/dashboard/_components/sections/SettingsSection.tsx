'use client'

import { useEffect, useState } from 'react'
import { ShieldCheck, Wallet, Megaphone, FileText, Table2, ChevronRight } from 'lucide-react'
import { cardStyle, h3Style } from '../ui/card'
import Badge from '../ui/Badge'
import { initials, type SectionId } from '../mockData'

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

const CONFIG_LINKS: { tab: SectionId; icon: typeof Wallet; label: string; desc: string }[] = [
  { tab: 'finance', icon: Wallet, label: 'Payment methods', desc: 'Bank, Lynk, PayPal, card, cash' },
  { tab: 'marketing2', icon: Megaphone, label: 'Site announcement & promos', desc: 'Billboard bar, banners, codes' },
  { tab: 'inventory', icon: FileText, label: 'Policies & documents', desc: 'Upload and organise files' },
  { tab: 'exec', icon: Table2, label: 'Live spreadsheet sync', desc: 'Google Sheets export' },
]

export default function SettingsSection({ onNavigate }: { onNavigate?: (tab: SectionId) => void }) {
  const [admins, setAdmins] = useState<Admin[]>([])

  useEffect(() => {
    fetch('/api/admin/admins')
      .then((r) => (r.ok ? r.json() : { admins: [] }))
      .then((d) => setAdmins(d.admins ?? []))
      .catch(() => {})
  }, [])

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: 16, alignItems: 'start' }}>
      {/* Admin users + status */}
      <div style={cardStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 6 }}>
          <ShieldCheck size={17} color="var(--ke-green-600)" />
          <h3 style={{ ...h3Style, margin: 0 }}>Administrators</h3>
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
              </div>
            )
          })}
        </div>
        <p style={{ fontSize: 11.5, color: 'var(--color-text-subtle)', marginTop: 12 }}>
          To add or remove an admin, update the user&apos;s role in the database (or re-run the admin seed with a new email).
        </p>
      </div>

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
    </div>
  )
}
