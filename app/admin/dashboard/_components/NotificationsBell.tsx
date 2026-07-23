'use client'

import { useEffect, useRef, useState } from 'react'
import { Bell, CheckCircle2, ChevronDown, ChevronRight, Package, Truck, TriangleAlert, LifeBuoy, PackageCheck, Frown, RefreshCw, ArrowRight, type LucideIcon } from 'lucide-react'
import type { SectionId } from './mockData'

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

const TONE: Record<Tone, { bg: string; fg: string }> = {
  red: { bg: 'var(--color-danger-soft)', fg: 'var(--color-danger)' },
  orange: { bg: 'var(--ke-sun-50)', fg: 'var(--ke-sun-500)' },
  blue: { bg: 'var(--ke-blue-50)', fg: 'var(--ke-blue-600)' },
  green: { bg: 'var(--ke-green-50)', fg: 'var(--ke-green-700)' },
}

const TAB_LABEL: Record<string, string> = { orders: 'Orders', inventory: 'Inventory', customers: 'Customers' }

/**
 * Notifications cluster for the admin header: a live status pill + a bell that
 * toggles the "needs attention" feed. When the feed is closed, a superscript
 * badge on the bell shows the outstanding count. Each alert is a sleek summary
 * that expands to the full breakdown with a one-click jump to where it's fixed.
 */
export default function NotificationsBell({ onNavigate }: { onNavigate?: (tab: SectionId) => void }) {
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [total, setTotal] = useState(0)
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)
  const ref = useRef<HTMLDivElement>(null)

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

  // Close when clicking outside the cluster.
  useEffect(() => {
    if (!open) return
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [open])

  const clear = total === 0

  const resolve = (tab: SectionId) => {
    onNavigate?.(tab)
    setOpen(false)
  }

  return (
    <div ref={ref} style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 12 }}>
      {/* Live status pill */}
      <div
        className="kad-hide-sm"
        style={{ display: 'flex', alignItems: 'center', gap: 8, background: clear ? 'var(--ke-green-50)' : 'var(--ke-sun-50)', borderRadius: 999, padding: '6px 12px' }}
      >
        <span style={{ width: 7, height: 7, borderRadius: '50%', background: clear ? 'var(--ke-green-500)' : 'var(--ke-sun-400)' }} />
        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 12.5, color: clear ? 'var(--ke-green-700)' : 'var(--ke-sun-500)' }}>
          {clear ? 'All systems normal' : `${total} need${total === 1 ? 's' : ''} attention`}
        </span>
      </div>

      {/* Bell button with superscript count */}
      <button
        type="button"
        aria-label={`Notifications${total ? ` (${total})` : ''}`}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        style={{ position: 'relative', width: 38, height: 38, borderRadius: 10, border: '1px solid var(--color-border)', background: open ? 'var(--ke-gray-50, #f5f7f5)' : '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text)' }}
      >
        <Bell size={17} />
        {total > 0 && (
          <span
            aria-hidden
            style={{ position: 'absolute', top: -6, right: -6, minWidth: 18, height: 18, padding: '0 5px', borderRadius: 999, background: 'var(--color-danger)', color: '#fff', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 10.5, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #fff' }}
          >
            {total > 99 ? '99+' : total}
          </span>
        )}
      </button>

      {/* Dropdown feed */}
      {open && (
        <div
          role="menu"
          style={{ position: 'absolute', top: 'calc(100% + 10px)', right: 0, width: 360, maxWidth: '92vw', maxHeight: '70vh', overflowY: 'auto', background: '#fff', borderRadius: 16, border: '1px solid var(--color-border)', boxShadow: '0 16px 44px rgba(0,0,0,.18)', zIndex: 70, padding: 10 }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 8px 10px' }}>
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14 }}>Needs attention</span>
            <button type="button" onClick={load} aria-label="Refresh" title="Refresh" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-subtle)', display: 'flex', padding: 4 }}>
              <RefreshCw size={13} style={loading ? { animation: 'keSpin 1s linear infinite' } : undefined} />
            </button>
          </div>

          {loading && alerts.length === 0 ? (
            <p style={{ fontSize: 13, color: 'var(--color-text-muted)', padding: '10px 8px' }}>Checking…</p>
          ) : clear ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 9, color: 'var(--ke-green-700)', fontSize: 13, padding: '14px 8px' }}>
              <CheckCircle2 size={16} /> All clear — nothing needs action.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {alerts.map((a) => {
                const Icon = ICONS[a.key] ?? Bell
                const t = TONE[a.tone]
                const isOpen = expanded === a.key
                return (
                  <div key={a.key} style={{ border: '1px solid var(--color-border)', borderRadius: 11, overflow: 'hidden' }}>
                    {/* Summary row (click to expand) */}
                    <button
                      type="button"
                      onClick={() => setExpanded(isOpen ? null : a.key)}
                      style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '10px 11px', background: '#fff', border: 'none', cursor: 'pointer', textAlign: 'left' }}
                    >
                      <span style={{ width: 28, height: 28, borderRadius: 8, background: t.bg, color: t.fg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Icon size={15} color={t.fg} />
                      </span>
                      <span style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ display: 'block', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13 }}>{a.title}</span>
                        <span style={{ display: 'block', fontSize: 11.5, color: 'var(--color-text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {a.count} item{a.count === 1 ? '' : 's'} · {a.items[0] ?? ''}
                        </span>
                      </span>
                      <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 10.5, color: t.fg, background: t.bg, borderRadius: 999, padding: '1px 7px', flexShrink: 0 }}>{a.count}</span>
                      {isOpen ? <ChevronDown size={14} style={{ color: 'var(--color-text-subtle)', flexShrink: 0 }} /> : <ChevronRight size={14} style={{ color: 'var(--color-text-subtle)', flexShrink: 0 }} />}
                    </button>

                    {/* Expanded breakdown + resolve */}
                    {isOpen && (
                      <div style={{ padding: '0 12px 12px 49px', borderTop: '1px solid var(--color-border)' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, margin: '10px 0', fontSize: 12, color: 'var(--color-text-muted)' }}>
                          {a.items.map((it, i) => (
                            <div key={i} style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>• {it}</div>
                          ))}
                        </div>
                        <button
                          type="button"
                          onClick={() => resolve(a.tab)}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 12px', borderRadius: 8, border: 'none', background: 'var(--color-primary)', color: '#fff', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 12, cursor: 'pointer' }}
                        >
                          Go to {TAB_LABEL[a.tab] ?? a.tab} <ArrowRight size={13} />
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
