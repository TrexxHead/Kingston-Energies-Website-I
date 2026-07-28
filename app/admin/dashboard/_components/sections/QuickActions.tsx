'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Pin, PinOff, Settings2, X } from 'lucide-react'
import { cardStyle } from '../ui/card'
import { CHROME } from '../charts/palette'

interface Action {
  id: string
  label: string
  href: string
  /** What the reader will actually land on, so a click is never a surprise. */
  hint: string
}

/**
 * Only actions that lead somewhere real.
 *
 * Every entry here opens a screen that exists and works. A tile that opened a
 * dialog for a feature that isn't built would be worse than no tile.
 */
const ACTIONS: Action[] = [
  { id: 'expense', label: 'Record expense', href: '/admin/dashboard/finance/expenses', hint: 'Log a spend against a budget category' },
  { id: 'receipt', label: 'Upload receipt', href: '/admin/dashboard/finance/receipts', hint: 'Attach the document behind an expense' },
  { id: 'order', label: 'Add an order', href: '/admin/dashboard/orders', hint: 'Record a sale made off the website' },
  { id: 'statement', label: 'Import statement', href: '/admin/dashboard/finance/banking', hint: 'Bring in a CSV or OFX from online banking' },
  { id: 'reconcile', label: 'Reconcile', href: '/admin/dashboard/finance/banking', hint: 'Agree the books with the bank' },
  { id: 'journal', label: 'Journal entry', href: '/admin/dashboard/finance/accounting', hint: 'Post a manual double-entry' },
  { id: 'payroll', label: 'Run payroll', href: '/admin/dashboard/finance/payroll', hint: 'Draft a pay run for active staff' },
  { id: 'stock', label: 'Adjust stock', href: '/admin/dashboard/inventory', hint: 'Correct a count without touching revenue' },
  { id: 'asset', label: 'Add an asset', href: '/admin/dashboard/finance/schedules', hint: 'Start a depreciation schedule' },
  { id: 'reports', label: 'Open reports', href: '/admin/dashboard/finance/reports', hint: 'Profit and loss, balance sheet, trial balance' },
]

const STORAGE_KEY = 'ke-quick-actions'
const DEFAULT_PINNED = ['expense', 'receipt', 'order', 'statement', 'reconcile', 'payroll']

/**
 * The panel of things people do most.
 *
 * Which actions show is the user's choice and is kept locally — it's a per-person
 * layout preference, not business data, so it doesn't belong in the database or
 * on anyone else's screen.
 */
export default function QuickActions() {
  const [pinned, setPinned] = useState<string[]>(DEFAULT_PINNED)
  const [editing, setEditing] = useState(false)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw) as string[]
        // Drop ids that no longer exist rather than rendering a dead tile.
        setPinned(parsed.filter((id) => ACTIONS.some((a) => a.id === id)))
      }
    } catch {
      /* a corrupt preference just falls back to the defaults */
    }
    setLoaded(true)
  }, [])

  const persist = (next: string[]) => {
    setPinned(next)
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    } catch {
      /* private browsing — the panel still works for this session */
    }
  }

  const toggle = (id: string) => persist(pinned.includes(id) ? pinned.filter((p) => p !== id) : [...pinned, id])

  // Render nothing until the stored preference is read, so the panel doesn't
  // flash the defaults and then rearrange itself.
  if (!loaded) return null

  const shown = ACTIONS.filter((a) => pinned.includes(a.id))

  return (
    <div style={{ ...cardStyle, padding: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9.5, letterSpacing: '.1em', textTransform: 'uppercase', color: CHROME.textMuted }}>
          Quick actions
        </span>
        <button
          type="button"
          onClick={() => setEditing((v) => !v)}
          aria-pressed={editing}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            border: '1px solid var(--color-border)',
            background: 'var(--color-surface)',
            color: CHROME.textMuted,
            borderRadius: 9,
            padding: '4px 9px',
            fontSize: 11.5,
            cursor: 'pointer',
          }}
        >
          {editing ? <X size={12} /> : <Settings2 size={12} />}
          {editing ? 'Done' : 'Customise'}
        </button>
      </div>

      {editing ? (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {ACTIONS.map((a) => {
            const on = pinned.includes(a.id)
            return (
              <button
                key={a.id}
                type="button"
                onClick={() => toggle(a.id)}
                aria-pressed={on}
                title={a.hint}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  border: '1px solid var(--color-border)',
                  background: on ? 'var(--color-primary-soft)' : 'var(--color-surface)',
                  color: on ? 'var(--color-primary)' : CHROME.textMuted,
                  borderRadius: 999,
                  padding: '6px 11px',
                  fontSize: 12.5,
                  cursor: 'pointer',
                }}
              >
                {on ? <Pin size={12} /> : <PinOff size={12} />}
                {a.label}
              </button>
            )
          })}
        </div>
      ) : shown.length === 0 ? (
        <p style={{ fontSize: 12.5, color: CHROME.textMuted, margin: 0 }}>
          Nothing pinned. Choose <strong>Customise</strong> to pick the actions you use.
        </p>
      ) : (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {shown.map((a) => (
            <Link
              key={a.id}
              href={a.href}
              title={a.hint}
              style={{
                border: '1px solid var(--color-border)',
                background: 'var(--color-surface)',
                color: 'var(--color-text)',
                borderRadius: 999,
                padding: '7px 13px',
                fontSize: 12.5,
                fontWeight: 600,
                fontFamily: 'var(--font-display)',
                textDecoration: 'none',
              }}
            >
              {a.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
