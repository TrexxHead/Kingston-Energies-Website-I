'use client'

import { useEffect, useState } from 'react'
import { Bell, CheckCircle2, ChevronRight, Package, Truck, TriangleAlert, LifeBuoy, PackageCheck, Frown, RefreshCw, type LucideIcon } from 'lucide-react'
import { cardStyle, h3Style } from '../ui/card'
import type { SectionId } from '../mockData'

type Tone = 'red' | 'orange' | 'blue' | 'green'

interface Alert {
  key: string
  tone: Tone
  title: string
  count: number
  tab: 'orders' | 'inventory' | 'customers'
  items: string[]
}

const ICONS: Record<string, LucideIcon> = {
  orders_pending: Package,
  orders_out: Truck,
  low_stock: TriangleAlert,
  tickets: LifeBuoy,
  po_open: PackageCheck,
  nps_detractors: Frown,
}

const TONE: Record<Tone, { bg: string; fg: string; border: string }> = {
  red: { bg: 'var(--color-danger-soft)', fg: 'var(--color-danger)', border: 'var(--color-danger)' },
  orange: { bg: 'var(--ke-sun-50)', fg: 'var(--ke-sun-500)', border: 'var(--ke-sun-400)' },
  blue: { bg: 'var(--ke-blue-50)', fg: 'var(--ke-blue-600)', border: 'var(--ke-blue-400, #7fb3d5)' },
  green: { bg: 'var(--ke-green-50)', fg: 'var(--ke-green-700)', border: 'var(--ke-green-600)' },
}

/**
 * "Needs attention" — a live roll-up of everything outstanding (orders to pack,
 * deliveries out, low stock, open tickets, incoming POs, unhappy customers).
 * Each row jumps to the tab where the work gets done.
 */
export default function AlertsCard({ onNavigate }: { onNavigate?: (tab: SectionId) => void }) {
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/alerts')
      if (res.ok) {
        const data = await res.json()
        setAlerts(data.alerts ?? [])
        setTotal(data.totalOutstanding ?? 0)
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const allClear = !loading && alerts.length === 0

  return (
    <div style={{ ...cardStyle, borderLeft: `3px solid ${allClear ? 'var(--ke-green-600)' : 'var(--ke-sun-400)'}` }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: alerts.length ? 14 : 4 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <Bell size={16} color="var(--ke-sun-500)" />
          <h3 style={{ ...h3Style, margin: 0 }}>Needs attention</h3>
          {total > 0 && (
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 11, color: 'var(--color-danger)', background: 'var(--color-danger-soft)', borderRadius: 999, padding: '2px 9px' }}>
              {total} outstanding
            </span>
          )}
        </div>
        <button type="button" onClick={load} aria-label="Refresh" title="Refresh" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-subtle)', display: 'flex', padding: 4 }}>
          <RefreshCw size={14} style={loading ? { animation: 'keSpin 1s linear infinite' } : undefined} />
        </button>
      </div>

      {loading && alerts.length === 0 ? (
        <p style={{ fontSize: 13, color: 'var(--color-text-muted)', margin: 0 }}>Checking for outstanding items…</p>
      ) : allClear ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--ke-green-700)', fontSize: 13.5 }}>
          <CheckCircle2 size={17} /> All clear — no orders, deliveries, stock or tickets need action right now.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 10 }}>
          {alerts.map((a) => {
            const Icon = ICONS[a.key] ?? Bell
            const t = TONE[a.tone]
            const clickable = Boolean(onNavigate)
            return (
              <button
                key={a.key}
                type="button"
                onClick={() => onNavigate?.(a.tab)}
                style={{
                  textAlign: 'left',
                  display: 'flex',
                  gap: 11,
                  padding: '12px 13px',
                  borderRadius: 12,
                  border: `1px solid var(--color-border)`,
                  borderLeft: `3px solid ${t.border}`,
                  background: '#fff',
                  cursor: clickable ? 'pointer' : 'default',
                  width: '100%',
                }}
              >
                <span style={{ width: 30, height: 30, borderRadius: 9, background: t.bg, color: t.fg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Icon size={16} color={t.fg} />
                </span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13 }}>{a.title}</span>
                    <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 10.5, color: t.fg, background: t.bg, borderRadius: 999, padding: '1px 7px' }}>{a.count}</span>
                    {clickable && <ChevronRight size={13} style={{ marginLeft: 'auto', color: 'var(--color-text-subtle)' }} />}
                  </span>
                  <span style={{ display: 'block', marginTop: 5, fontSize: 11.5, color: 'var(--color-text-muted)', lineHeight: 1.5 }}>
                    {a.items.slice(0, 3).map((it, i) => (
                      <span key={i} style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{it}</span>
                    ))}
                    {a.count > 3 && <span style={{ color: 'var(--color-text-subtle)' }}>+{a.count - 3} more</span>}
                  </span>
                </span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
