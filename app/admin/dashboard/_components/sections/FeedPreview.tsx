'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, AlertTriangle, AlertCircle } from 'lucide-react'
import { cardStyle, h3Style } from '../ui/card'
import { CHROME, money, STATUS } from '../charts/palette'

interface Item {
  id: string
  priority: 'ROUTINE' | 'ATTENTION' | 'URGENT'
  title: string
  detail: string | null
  amount: number | null
  href: string | null
}

/**
 * The top of the business feed, on the dashboard.
 *
 * Deliberately short and deliberately only the things that need a decision —
 * a full activity log here would bury the two items that matter under twenty
 * that don't. The feed itself is one click away.
 */
export default function FeedPreview() {
  const [items, setItems] = useState<Item[] | null>(null)
  const [counts, setCounts] = useState<{ open: number; urgent: number } | null>(null)

  useEffect(() => {
    ;(async () => {
      const res = await fetch('/api/admin/finance/feed?view=open')
      if (!res.ok) return
      const json = await res.json()
      setItems(json.items.filter((i: Item) => i.priority !== 'ROUTINE').slice(0, 4))
      setCounts(json.counts)
    })()
  }, [])

  if (!items) return null

  return (
    <div style={cardStyle}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, gap: 10, flexWrap: 'wrap' }}>
        <h3 style={{ ...h3Style, margin: 0 }}>Needs a decision</h3>
        <Link
          href="/admin/dashboard/finance/feed"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12.5, fontWeight: 600, color: 'var(--color-primary)', textDecoration: 'none' }}
        >
          Business feed{counts && counts.open > items.length ? ` (${counts.open})` : ''} <ArrowRight size={13} />
        </Link>
      </div>

      {items.length === 0 ? (
        <p style={{ fontSize: 13, color: CHROME.textMuted, margin: 0, lineHeight: 1.6 }}>
          Nothing outstanding. Unpaid orders, unmatched bank lines and unconfirmed receipts surface here on their own.
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {items.map((i) => (
            <Link
              key={i.id}
              href={i.href ?? '/admin/dashboard/finance/feed'}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '9px 6px',
                borderTop: '1px solid var(--color-border)',
                textDecoration: 'none',
                color: 'inherit',
              }}
            >
              {i.priority === 'URGENT' ? (
                <AlertTriangle size={14} style={{ color: STATUS.critical, flexShrink: 0 }} aria-label="Urgent" />
              ) : (
                <AlertCircle size={14} style={{ color: 'var(--ke-sun-600,#b45309)', flexShrink: 0 }} aria-label="Needs a look" />
              )}
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: 'block', fontSize: 13.5, fontWeight: 600, color: CHROME.text }}>{i.title}</span>
                {i.detail && (
                  <span style={{ display: 'block', fontSize: 11.5, color: CHROME.textMuted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {i.detail}
                  </span>
                )}
              </span>
              {i.amount !== null && (
                <span style={{ fontSize: 13, fontWeight: 700, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>{money(i.amount)}</span>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
