'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cardStyle, h3Style } from '../ui/card'
import IconButton from '../ui/IconButton'
import { fmt } from '../mockData'

interface CalendarData {
  month: string
  monthLabel: string
  totals: { income: number; expense: number; balance: number }
  days: Record<string, { income: number; expense: number }>
  transactions: { id: string; type: 'in' | 'out'; label: string; detail: string; amount: number; date: string }[]
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function todayKey(): string {
  return new Date().toISOString().slice(0, 10)
}

function monthShift(monthKey: string, delta: number): string {
  const [y, m] = monthKey.split('-').map(Number)
  const d = new Date(Date.UTC(y, m - 1 + delta, 1))
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`
}

/**
 * Money in and money out, laid out by day.
 *
 * A day's totals are a summary, not the full story — clicking one filters the
 * list below to exactly what happened on it, same rows the Transactions tab
 * would show, just scoped to that date.
 */
export default function CalendarTab() {
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7))
  const [data, setData] = useState<CalendarData | null>(null)
  const [selected, setSelected] = useState<string>(todayKey())

  const load = useCallback(async () => {
    const res = await fetch(`/api/admin/finance/calendar?month=${month}`)
    if (res.ok) setData(await res.json())
  }, [month])

  useEffect(() => {
    load()
  }, [load])

  // Build the 6-row grid: leading/trailing days from neighbouring months fill
  // out full weeks, so the layout never jumps between short and long months.
  const grid = useMemo(() => {
    const [y, m] = month.split('-').map(Number)
    const first = new Date(Date.UTC(y, m - 1, 1))
    const startOffset = first.getUTCDay()
    const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate()
    const cells: { key: string; day: number; inMonth: boolean }[] = []
    for (let i = 0; i < startOffset; i++) {
      const d = new Date(Date.UTC(y, m - 1, -startOffset + i + 1))
      cells.push({ key: d.toISOString().slice(0, 10), day: d.getUTCDate(), inMonth: false })
    }
    for (let day = 1; day <= daysInMonth; day++) {
      const d = new Date(Date.UTC(y, m - 1, day))
      cells.push({ key: d.toISOString().slice(0, 10), day, inMonth: true })
    }
    while (cells.length % 7 !== 0) {
      const last = new Date(cells[cells.length - 1].key)
      const d = new Date(last.getTime() + 86_400_000)
      cells.push({ key: d.toISOString().slice(0, 10), day: d.getUTCDate(), inMonth: false })
    }
    return cells
  }, [month])

  const dayTransactions = data?.transactions.filter((t) => t.date === selected) ?? []

  if (!data) {
    return (
      <div style={cardStyle}>
        <p style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>Loading calendar…</p>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={cardStyle}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <IconButton label="Previous month" onClick={() => setMonth((m) => monthShift(m, -1))}>
            <ChevronLeft size={16} />
          </IconButton>
          <h3 style={{ ...h3Style, margin: 0 }}>{data.monthLabel}</h3>
          <IconButton label="Next month" onClick={() => setMonth((m) => monthShift(m, 1))}>
            <ChevronRight size={16} />
          </IconButton>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 4, marginBottom: 6 }}>
          {WEEKDAYS.map((w) => (
            <div key={w} style={{ textAlign: 'center', fontSize: 11, fontWeight: 600, color: 'var(--color-text-subtle)', padding: '4px 0' }}>
              {w}
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 4 }}>
          {grid.map((cell) => {
            const d = data.days[cell.key]
            const isSelected = cell.key === selected
            const isToday = cell.key === todayKey()
            return (
              <button
                key={cell.key}
                type="button"
                onClick={() => setSelected(cell.key)}
                style={{
                  minHeight: 62,
                  padding: '6px 4px',
                  borderRadius: 10,
                  border: isSelected ? '1.5px solid var(--ke-green-500)' : '1px solid transparent',
                  background: isSelected ? 'var(--ke-green-50, #eef7ee)' : 'transparent',
                  opacity: cell.inMonth ? 1 : 0.35,
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 2,
                  textAlign: 'center',
                }}
              >
                <span
                  style={{
                    fontSize: 12.5,
                    fontWeight: isToday ? 800 : 500,
                    color: isToday ? 'var(--ke-green-700)' : 'var(--color-text)',
                  }}
                >
                  {cell.day}
                </span>
                {d?.income ? (
                  <span style={{ fontSize: 9.5, fontWeight: 700, color: 'var(--ke-green-600)', lineHeight: 1.2 }}>
                    +{fmt(d.income)}
                  </span>
                ) : null}
                {d?.expense ? (
                  <span style={{ fontSize: 9.5, fontWeight: 700, color: 'var(--color-danger,#dc2626)', lineHeight: 1.2 }}>
                    -{fmt(d.expense)}
                  </span>
                ) : null}
              </button>
            )
          })}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-around', marginTop: 18, paddingTop: 16, borderTop: '1px solid var(--color-border)' }}>
          <Totals label="Income" value={data.totals.income} color="var(--ke-green-600)" />
          <Totals label="Expense" value={data.totals.expense} color="var(--color-danger,#dc2626)" />
          <Totals label="Balance" value={data.totals.balance} color="var(--color-text)" />
        </div>
      </div>

      <div style={cardStyle}>
        <h3 style={h3Style}>
          {new Date(selected).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' })}
        </h3>
        {dayTransactions.length === 0 ? (
          <p style={{ fontSize: 12.5, color: 'var(--color-text-muted)', margin: 0 }}>Nothing moved on this day.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {dayTransactions.map((t) => (
              <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderTop: '1px solid var(--color-border)' }}>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 13.5 }}>{t.label}</span>
                  {t.detail && <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}> · {t.detail}</span>}
                </span>
                <span
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontWeight: 700,
                    fontSize: 14,
                    color: t.type === 'in' ? 'var(--ke-green-600)' : 'var(--color-danger,#dc2626)',
                  }}
                >
                  {t.type === 'in' ? '+' : '-'}
                  {fmt(t.amount)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function Totals({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 2 }}>{label}</div>
      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 15, color }}>{fmt(value)}</div>
    </div>
  )
}
