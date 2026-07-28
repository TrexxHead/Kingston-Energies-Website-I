'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { Pin, PinOff, Clock, Archive, Check, RotateCcw, AlertTriangle, AlertCircle, Circle, ArrowRight } from 'lucide-react'
import { cardStyle } from '../ui/card'
import Badge from '../ui/Badge'
import Button from '../ui/Button'
import { CHROME, money, STATUS } from '../charts/palette'

type Category = 'ALL' | 'SALES' | 'PAYMENTS' | 'EXPENSES' | 'INVENTORY' | 'PAYROLL' | 'BANKING' | 'ACCOUNTING'
type View = 'open' | 'pinned' | 'snoozed' | 'resolved' | 'archived'

interface Item {
  id: string
  category: Exclude<Category, 'ALL'>
  priority: 'ROUTINE' | 'ATTENTION' | 'URGENT'
  at: string
  title: string
  detail: string | null
  amount: number | null
  href: string | null
  actor: string | null
  pinned: boolean
  resolved: boolean
  snoozed: boolean
  snoozedUntil: string | null
  assignedTo: string | null
}

interface FeedData {
  items: Item[]
  counts: { open: number; urgent: number; attention: number; pinned: number; snoozed: number }
}

const CATEGORIES: { id: Category; label: string }[] = [
  { id: 'ALL', label: 'Everything' },
  { id: 'PAYMENTS', label: 'Payments' },
  { id: 'SALES', label: 'Sales' },
  { id: 'EXPENSES', label: 'Expenses' },
  { id: 'BANKING', label: 'Banking' },
  { id: 'INVENTORY', label: 'Inventory' },
  { id: 'PAYROLL', label: 'Payroll' },
  { id: 'ACCOUNTING', label: 'Accounting' },
]

const VIEWS: { id: View; label: string }[] = [
  { id: 'open', label: 'Needs action' },
  { id: 'pinned', label: 'Pinned' },
  { id: 'snoozed', label: 'Snoozed' },
  { id: 'resolved', label: 'Resolved' },
  { id: 'archived', label: 'Archived' },
]

/**
 * Everything happening in the business, in one stream.
 *
 * The events are derived from real records rather than written to a
 * notifications table, so nothing here can be out of step with the books —
 * and every item links to the screen where you can actually do something
 * about it.
 */
export default function BusinessFeed() {
  const [data, setData] = useState<FeedData | null>(null)
  const [view, setView] = useState<View>('open')
  const [category, setCategory] = useState<Category>('ALL')
  const [busy, setBusy] = useState<string | null>(null)

  const load = useCallback(async () => {
    const res = await fetch(`/api/admin/finance/feed?view=${view}&category=${category}`)
    if (res.ok) setData(await res.json())
  }, [view, category])

  useEffect(() => {
    load()
  }, [load])

  const act = async (itemId: string, action: string, extra: Record<string, unknown> = {}) => {
    setBusy(itemId)
    await fetch('/api/admin/finance/feed', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ itemId, action, ...extra }),
    })
    setBusy(null)
    load()
  }

  if (!data) {
    return (
      <div style={cardStyle}>
        <p style={{ fontSize: 13, color: CHROME.textMuted, margin: 0 }}>Gathering activity…</p>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 12 }}>
        <Count label="Needs action" value={data.counts.open} />
        <Count label="Urgent" value={data.counts.urgent} tone="critical" />
        <Count label="Worth a look" value={data.counts.attention} tone="warning" />
        <Count label="Pinned" value={data.counts.pinned} />
        <Count label="Snoozed" value={data.counts.snoozed} />
      </div>

      {/* Filters in one row above what they scope. */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {VIEWS.map((v) => (
            <Chip key={v.id} label={v.label} selected={view === v.id} onClick={() => setView(v.id)} />
          ))}
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {CATEGORIES.map((c) => (
            <Chip key={c.id} label={c.label} selected={category === c.id} onClick={() => setCategory(c.id)} subtle />
          ))}
        </div>
      </div>

      {data.items.length === 0 ? (
        <div style={{ ...cardStyle, padding: 36, textAlign: 'center', color: CHROME.textMuted, fontSize: 13.5, lineHeight: 1.6 }}>
          {view === 'open'
            ? 'Nothing needs your attention right now. Items appear here on their own as orders go unpaid, receipts arrive, or bank lines come in unmatched.'
            : 'Nothing in this view.'}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {data.items.map((item) => (
            <FeedRow key={item.id} item={item} busy={busy === item.id} onAct={act} />
          ))}
        </div>
      )}
    </div>
  )
}

function Count({ label, value, tone }: { label: string; value: number; tone?: 'critical' | 'warning' }) {
  return (
    <div style={{ ...cardStyle, borderRadius: 14, padding: 14 }}>
      <div
        style={{
          fontFamily: 'var(--font-display)',
          fontWeight: 800,
          fontSize: 21,
          color: value > 0 && tone ? (tone === 'critical' ? STATUS.critical : STATUS.warning) : CHROME.text,
        }}
      >
        {value}
      </div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9.5, letterSpacing: '.1em', color: CHROME.textMuted, marginTop: 6, textTransform: 'uppercase' }}>
        {label}
      </div>
    </div>
  )
}

function Chip({ label, selected, onClick, subtle }: { label: string; selected: boolean; onClick: () => void; subtle?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      style={{
        border: '1px solid var(--color-border)',
        background: selected ? 'var(--color-primary-soft)' : 'var(--color-surface)',
        color: selected ? 'var(--color-primary)' : CHROME.textMuted,
        borderRadius: 999,
        padding: subtle ? '4px 10px' : '6px 12px',
        fontSize: subtle ? 11.5 : 12.5,
        fontWeight: selected ? 700 : 500,
        cursor: 'pointer',
      }}
    >
      {label}
    </button>
  )
}

const when = (iso: string) => {
  const diff = Date.now() - new Date(iso).getTime()
  const days = Math.floor(diff / 86_400_000)
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 14) return `${days} days ago`
  return new Date(iso).toLocaleDateString('en-JM', { day: 'numeric', month: 'short', year: 'numeric' })
}

/** Priority carries an icon and a word, never colour alone. */
function PriorityMark({ priority }: { priority: Item['priority'] }) {
  if (priority === 'URGENT') {
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: STATUS.critical, fontSize: 11.5, fontWeight: 700 }}>
        <AlertTriangle size={13} aria-hidden /> Urgent
      </span>
    )
  }
  if (priority === 'ATTENTION') {
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: 'var(--ke-sun-600,#b45309)', fontSize: 11.5, fontWeight: 700 }}>
        <AlertCircle size={13} aria-hidden /> Needs a look
      </span>
    )
  }
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: CHROME.textSubtle, fontSize: 11.5 }}>
      <Circle size={9} aria-hidden /> Routine
    </span>
  )
}

function FeedRow({ item, busy, onAct }: { item: Item; busy: boolean; onAct: (id: string, action: string, extra?: Record<string, unknown>) => void }) {
  return (
    <div style={{ ...cardStyle, padding: '13px 15px', opacity: busy ? 0.6 : 1, transition: 'opacity .15s ease' }}>
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap' }}>
        <div style={{ minWidth: 240, flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 3 }}>
            <PriorityMark priority={item.priority} />
            <Badge tone="neutral">{item.category.charAt(0) + item.category.slice(1).toLowerCase()}</Badge>
            <span style={{ fontSize: 11.5, color: CHROME.textSubtle }}>{when(item.at)}</span>
            {item.pinned && <Badge tone="green">Pinned</Badge>}
            {item.snoozed && item.snoozedUntil && (
              <Badge tone="orange">Back {new Date(item.snoozedUntil).toLocaleDateString('en-JM', { day: 'numeric', month: 'short' })}</Badge>
            )}
            {item.assignedTo && <Badge tone="blue">{item.assignedTo}</Badge>}
          </div>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 14, color: CHROME.text }}>{item.title}</div>
          {item.detail && <div style={{ fontSize: 12.5, color: CHROME.textMuted, marginTop: 3, lineHeight: 1.5 }}>{item.detail}</div>}
          {item.actor && <div style={{ fontSize: 11.5, color: CHROME.textSubtle, marginTop: 3 }}>by {item.actor}</div>}
        </div>

        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          {item.amount !== null && (
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15, fontVariantNumeric: 'tabular-nums', color: CHROME.text }}>
              {money(item.amount)}
            </span>
          )}
          {item.href && (
            <Link
              href={item.href}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                fontSize: 12.5,
                fontWeight: 600,
                color: 'var(--color-primary)',
                textDecoration: 'none',
                whiteSpace: 'nowrap',
              }}
            >
              Open <ArrowRight size={13} />
            </Link>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
        <Button size="sm" variant="outline" onClick={() => onAct(item.id, item.pinned ? 'unpin' : 'pin')} iconRight={item.pinned ? <PinOff size={12} /> : <Pin size={12} />}>
          {item.pinned ? 'Unpin' : 'Pin'}
        </Button>
        {!item.resolved && (
          <Button size="sm" variant="outline" onClick={() => onAct(item.id, item.snoozed ? 'unsnooze' : 'snooze', { days: 7 })} iconRight={<Clock size={12} />}>
            {item.snoozed ? 'Bring back' : 'Snooze a week'}
          </Button>
        )}
        <Button
          size="sm"
          variant="outline"
          onClick={() => onAct(item.id, item.resolved ? 'reopen' : 'resolve')}
          iconRight={item.resolved ? <RotateCcw size={12} /> : <Check size={12} />}
        >
          {item.resolved ? 'Reopen' : 'Mark resolved'}
        </Button>
        <Button size="sm" variant="outline" onClick={() => onAct(item.id, 'archive')} iconRight={<Archive size={12} />}>
          Archive
        </Button>
      </div>
    </div>
  )
}
