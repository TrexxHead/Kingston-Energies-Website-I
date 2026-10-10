'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, Palette, Plus, ShoppingBag } from 'lucide-react'
import { cardStyle, h3Style } from '../ui/card'
import Button from '../ui/Button'
import IconButton from '../ui/IconButton'
import Modal from '../ui/Modal'
import { fmt } from '../mockData'
import { EXPENSE_CATEGORIES, DEFAULT_CATEGORY_COLORS } from '@/lib/finance'
import { useExpenseCategories } from './useFinanceData'
import CalendarOrderModal from './CalendarOrderModal'

interface CalendarData {
  month: string
  monthLabel: string
  totals: { income: number; expense: number; balance: number }
  days: Record<string, { income: number; expense: number }>
  transactions: { id: string; type: 'in' | 'out'; label: string; detail: string; amount: number; date: string }[]
}

interface OrderEntry {
  id: string
  orderNo: string
  customerName: string
  status: string
  total: number
  estimatedDelivery: string | null
  createdAt: string
}

const ORDER_CHIP_COLOR: Record<string, string> = {
  PENDING: '#d97706',
  CONFIRMED: 'var(--ke-green-600)',
  OUT_FOR_DELIVERY: '#2563eb',
  DELIVERED: 'var(--color-text-muted)',
  CANCELLED: 'var(--color-danger,#dc2626)',
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
  const [colors, setColors] = useState<Record<string, string>>(DEFAULT_CATEGORY_COLORS)
  const [colorsOpen, setColorsOpen] = useState(false)
  const [orders, setOrders] = useState<OrderEntry[]>([])
  const [orderModalDate, setOrderModalDate] = useState<string | null>(null)
  const [hoverDay, setHoverDay] = useState<string | null>(null)
  const { categories } = useExpenseCategories()
  const categoryOptions = categories.length ? categories : [...EXPENSE_CATEGORIES]

  const load = useCallback(async () => {
    const res = await fetch(`/api/admin/finance/calendar?month=${month}`)
    if (res.ok) setData(await res.json())
  }, [month])

  const loadColors = useCallback(async () => {
    const res = await fetch('/api/admin/finance/category-colors')
    if (res.ok) setColors((await res.json()).colors)
  }, [])

  const loadOrders = useCallback(async () => {
    const res = await fetch('/api/admin/orders')
    if (res.ok) setOrders((await res.json()).orders)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    loadColors()
  }, [loadColors])

  useEffect(() => {
    loadOrders()
  }, [loadOrders])

  // Orders scheduled to a day via estimatedDelivery show up there; everything
  // else falls back to when it was actually placed, so nothing is dropped.
  const ordersByDay = useMemo(() => {
    const map: Record<string, OrderEntry[]> = {}
    for (const o of orders) {
      const key = (o.estimatedDelivery ?? o.createdAt).slice(0, 10)
      if (!map[key]) map[key] = []
      map[key].push(o)
    }
    return map
  }, [orders])

  // Which expense categories touched each day — used to dot-mark cells and
  // color the day's transaction list, without changing what the aggregate
  // income/expense figures mean.
  const categoriesByDay = useMemo(() => {
    const map: Record<string, string[]> = {}
    for (const t of data?.transactions ?? []) {
      if (t.type !== 'out') continue
      if (!map[t.date]) map[t.date] = []
      if (!map[t.date].includes(t.label)) map[t.date].push(t.label)
    }
    return map
  }, [data])

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
  const dayOrders = ordersByDay[selected] ?? []

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
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <IconButton label="Next month" onClick={() => setMonth((m) => monthShift(m, 1))}>
              <ChevronRight size={16} />
            </IconButton>
            <Button size="sm" variant="primary" onClick={() => setOrderModalDate(selected)} iconRight={<Plus size={14} />}>
              New order
            </Button>
          </div>
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
            const cellOrders = ordersByDay[cell.key] ?? []
            return (
              <button
                key={cell.key}
                type="button"
                onClick={() => setSelected(cell.key)}
                onMouseEnter={() => setHoverDay(cell.key)}
                onMouseLeave={() => setHoverDay((h) => (h === cell.key ? null : h))}
                style={{
                  position: 'relative',
                  minHeight: 68,
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
                {hoverDay === cell.key && cell.inMonth && (
                  <span
                    role="button"
                    aria-label="New order on this day"
                    onClick={(e) => {
                      e.stopPropagation()
                      setOrderModalDate(cell.key)
                    }}
                    style={{
                      position: 'absolute',
                      top: 3,
                      right: 3,
                      width: 16,
                      height: 16,
                      borderRadius: 5,
                      background: 'var(--ke-green-600)',
                      color: '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Plus size={11} />
                  </span>
                )}
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
                {cellOrders.length > 0 && (
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 2,
                      fontSize: 9,
                      fontWeight: 700,
                      color: '#fff',
                      background: ORDER_CHIP_COLOR[cellOrders[0].status] ?? 'var(--color-text-muted)',
                      borderRadius: 999,
                      padding: '1px 5px',
                      lineHeight: 1.3,
                      maxWidth: '100%',
                    }}
                  >
                    <ShoppingBag size={8} />
                    {cellOrders.length > 1 ? `${cellOrders.length} orders` : cellOrders[0].customerName}
                  </span>
                )}
                {categoriesByDay[cell.key]?.length ? (
                  <span style={{ display: 'flex', gap: 2, marginTop: 1 }}>
                    {categoriesByDay[cell.key].slice(0, 5).map((cat) => (
                      <span
                        key={cat}
                        style={{ width: 5, height: 5, borderRadius: '50%', background: colors[cat] ?? DEFAULT_CATEGORY_COLORS[cat] ?? '#9ca3af' }}
                      />
                    ))}
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

        <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--color-border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-muted)', letterSpacing: '.04em', textTransform: 'uppercase' }}>
              Expense categories
            </span>
            <button
              type="button"
              onClick={() => setColorsOpen(true)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600, color: 'var(--ke-green-700,#15803d)', padding: 0 }}
            >
              <Palette size={13} /> Customize colors
            </button>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 16px' }}>
            {categoryOptions.map((cat) => (
              <span key={cat} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--color-text-muted)' }}>
                <span style={{ width: 9, height: 9, borderRadius: '50%', background: colors[cat] ?? DEFAULT_CATEGORY_COLORS[cat] ?? '#9ca3af' }} />
                {cat}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div style={cardStyle}>
        <h3 style={h3Style}>
          {new Date(selected).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' })}
        </h3>
        {dayOrders.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', marginBottom: 6 }}>
            {dayOrders.map((o) => (
              <a
                key={o.id}
                href="/admin/dashboard/orders"
                style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderTop: '1px solid var(--color-border)', textDecoration: 'none', color: 'inherit' }}
              >
                <span style={{ width: 9, height: 9, borderRadius: '50%', background: ORDER_CHIP_COLOR[o.status] ?? 'var(--color-text-muted)', flexShrink: 0 }} />
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 13.5 }}>{o.customerName}</span>
                  <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}> · {o.orderNo} · {o.status.replace(/_/g, ' ').toLowerCase()}</span>
                </span>
                <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14 }}>{fmt(o.total)}</span>
              </a>
            ))}
          </div>
        )}
        {dayTransactions.length === 0 ? (
          dayOrders.length === 0 && <p style={{ fontSize: 12.5, color: 'var(--color-text-muted)', margin: 0 }}>Nothing moved on this day.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {dayTransactions.map((t) => (
              <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderTop: '1px solid var(--color-border)' }}>
                {t.type === 'out' && (
                  <span style={{ width: 9, height: 9, borderRadius: '50%', background: colors[t.label] ?? DEFAULT_CATEGORY_COLORS[t.label] ?? '#9ca3af', flexShrink: 0 }} />
                )}
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

      {colorsOpen && (
        <ColorsModal
          categories={categoryOptions}
          colors={colors}
          onClose={() => setColorsOpen(false)}
          onSaved={(next) => {
            setColors(next)
            setColorsOpen(false)
          }}
        />
      )}

      {orderModalDate && (
        <CalendarOrderModal
          defaultDate={orderModalDate}
          onClose={() => setOrderModalDate(null)}
          onCreated={() => {
            setOrderModalDate(null)
            loadOrders()
          }}
        />
      )}
    </div>
  )
}

function ColorsModal({
  categories,
  colors,
  onClose,
  onSaved,
}: {
  categories: string[]
  colors: Record<string, string>
  onClose: () => void
  onSaved: (colors: Record<string, string>) => void
}) {
  const [form, setForm] = useState<Record<string, string>>({ ...DEFAULT_CATEGORY_COLORS, ...colors })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const save = async () => {
    setBusy(true)
    setError('')
    const res = await fetch('/api/admin/finance/category-colors', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ colors: form }),
    })
    setBusy(false)
    if (!res.ok) return setError((await res.json().catch(() => ({}))).error || 'Could not save colors.')
    onSaved(form)
  }

  return (
    <Modal
      title="Category colors"
      onClose={onClose}
      footer={
        <>
          <Button size="sm" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button size="sm" variant="primary" onClick={save}>
            {busy ? 'Saving…' : 'Save colors'}
          </Button>
        </>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {categories.map((cat) => (
          <div key={cat} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <span style={{ fontSize: 13.5, color: 'var(--color-text)' }}>{cat}</span>
            <input
              type="color"
              value={form[cat] ?? DEFAULT_CATEGORY_COLORS[cat] ?? '#9ca3af'}
              onChange={(e) => setForm({ ...form, [cat]: e.target.value })}
              style={{ width: 40, height: 30, borderRadius: 8, border: '1px solid var(--color-border)', padding: 2, cursor: 'pointer', background: 'none' }}
            />
          </div>
        ))}
        {error && <div style={{ color: 'var(--color-danger,#dc2626)', fontSize: 13 }}>{error}</div>}
      </div>
    </Modal>
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
