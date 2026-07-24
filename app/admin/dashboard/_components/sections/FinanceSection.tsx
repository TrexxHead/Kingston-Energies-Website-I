'use client'

import { useCallback, useEffect, useState } from 'react'
import { TrendingUp, TrendingDown, Plus, Trash2 } from 'lucide-react'
import { cardStyle, h3Style } from '../ui/card'
import Button from '../ui/Button'
import Modal from '../ui/Modal'
import TextInput from '../ui/TextInput'
import { fmt } from '../mockData'
import { EXPENSE_CATEGORIES } from '@/lib/finance'
import PaymentSettingsCard from './PaymentSettingsCard'

interface Kpi { value: number; change: number | null }
interface FinanceData {
  kpis: { revenue: Kpi; expenses: Kpi; profit: Kpi; outstanding: Kpi }
  series: { month: string; revenue: number; expenses: number; profit: number }[]
  byCategory: { category: string; amount: number }[]
  budgets: { category: string; budget: number; actual: number }[]
  budgetMap: Record<string, number>
  recentExpenses: { id: string; category: string; description: string | null; amount: number; date: string }[]
  currentMonth: string
}

export default function FinanceSection() {
  const [data, setData] = useState<FinanceData | null>(null)
  const [expenseOpen, setExpenseOpen] = useState(false)
  const [budgetOpen, setBudgetOpen] = useState(false)
  const [form, setForm] = useState({ category: EXPENSE_CATEGORIES[0] as string, amount: '', description: '', spentAt: '' })
  const [budgetForm, setBudgetForm] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    const res = await fetch('/api/admin/finance')
    if (res.ok) setData(await res.json())
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const addExpense = async () => {
    if (!form.amount || Number(form.amount) <= 0) return
    setBusy(true)
    const res = await fetch('/api/admin/expenses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        category: form.category,
        amount: Number(form.amount),
        description: form.description || undefined,
        spentAt: form.spentAt || undefined,
      }),
    })
    setBusy(false)
    if (res.ok) {
      setExpenseOpen(false)
      setForm({ category: EXPENSE_CATEGORIES[0], amount: '', description: '', spentAt: '' })
      load()
    }
  }

  const removeExpense = async (id: string) => {
    await fetch(`/api/admin/expenses/${id}`, { method: 'DELETE' })
    load()
  }

  const openBudgets = () => {
    const init: Record<string, string> = {}
    EXPENSE_CATEGORIES.forEach((c) => { init[c] = data?.budgetMap[c] ? String(data.budgetMap[c]) : '' })
    setBudgetForm(init)
    setBudgetOpen(true)
  }

  const saveBudgets = async () => {
    setBusy(true)
    const budgets: Record<string, number> = {}
    for (const [c, v] of Object.entries(budgetForm)) budgets[c] = v ? Number(v) : 0
    const res = await fetch('/api/admin/budgets', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ budgets }),
    })
    setBusy(false)
    if (res.ok) {
      setBudgetOpen(false)
      load()
    }
  }

  if (!data) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <PaymentSettingsCard />
        <div style={cardStyle}><p style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>Loading finances…</p></div>
      </div>
    )
  }

  const maxBar = Math.max(1, ...data.series.map((s) => Math.max(s.revenue, s.expenses)))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* KPI row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14 }}>
        <Kpi label={`Revenue · ${data.currentMonth}`} kpi={data.kpis.revenue} goodWhenUp />
        <Kpi label={`Expenses · ${data.currentMonth}`} kpi={data.kpis.expenses} goodWhenUp={false} />
        <Kpi label={`Net profit · ${data.currentMonth}`} kpi={data.kpis.profit} goodWhenUp />
        <Kpi label="Outstanding (unpaid)" kpi={data.kpis.outstanding} goodWhenUp={false} />
      </div>

      {/* Trend chart */}
      <div style={cardStyle}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h3 style={{ ...h3Style, margin: 0 }}>Revenue vs expenses — last 6 months</h3>
          <span style={{ display: 'flex', gap: 14, fontSize: 12, color: 'var(--color-text-muted)' }}>
            <Legend color="var(--ke-green-500)" label="Revenue" />
            <Legend color="var(--ke-sun-400)" label="Expenses" />
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 18, height: 170, paddingTop: 10 }}>
          {data.series.map((s) => (
            <div key={s.month} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 5, height: 130, width: '100%', justifyContent: 'center' }}>
                <div title={`Revenue ${fmt(s.revenue)}`} style={{ width: 16, height: `${(s.revenue / maxBar) * 100}%`, minHeight: 2, background: 'var(--ke-green-500)', borderRadius: '4px 4px 0 0' }} />
                <div title={`Expenses ${fmt(s.expenses)}`} style={{ width: 16, height: `${(s.expenses / maxBar) * 100}%`, minHeight: 2, background: 'var(--ke-sun-400)', borderRadius: '4px 4px 0 0' }} />
              </div>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--color-text-subtle)' }}>{s.month.split(' ')[0]}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Budgets vs actual + expense breakdown */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, alignItems: 'start' }}>
        <div style={cardStyle}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <h3 style={{ ...h3Style, margin: 0 }}>Budget vs actual · {data.currentMonth}</h3>
            <Button size="sm" variant="outline" onClick={openBudgets}>Set budgets</Button>
          </div>
          {data.budgets.length === 0 ? (
            <p style={{ fontSize: 12.5, color: 'var(--color-text-muted)', margin: 0 }}>No budgets set yet. Click “Set budgets” to add monthly targets.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {data.budgets.map((b) => {
                const pct = b.budget > 0 ? Math.min(100, (b.actual / b.budget) * 100) : 0
                const over = b.actual > b.budget
                return (
                  <div key={b.category}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, marginBottom: 6 }}>
                      <span>{b.category}</span>
                      <span style={{ color: over ? 'var(--color-danger)' : 'var(--color-text-muted)' }}>{fmt(b.actual)} / {fmt(b.budget)}</span>
                    </div>
                    <div style={{ height: 9, borderRadius: 999, background: 'var(--ke-gray-100)', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: over ? 'var(--color-danger)' : 'var(--ke-green-500)', borderRadius: 999 }} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div style={cardStyle}>
          <h3 style={h3Style}>Expenses by category · {data.currentMonth}</h3>
          {data.byCategory.length === 0 ? (
            <p style={{ fontSize: 12.5, color: 'var(--color-text-muted)', margin: 0 }}>No expenses logged this month.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {data.byCategory.map((c) => (
                <div key={c.category} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                  <span style={{ color: 'var(--color-text-muted)' }}>{c.category}</span>
                  <span style={{ fontWeight: 700 }}>{fmt(c.amount)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Expense log */}
      <div style={cardStyle}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <h3 style={{ ...h3Style, margin: 0 }}>Expense log</h3>
          <Button size="sm" variant="primary" onClick={() => setExpenseOpen(true)} iconRight={<Plus size={14} />}>Log expense</Button>
        </div>
        {data.recentExpenses.length === 0 ? (
          <p style={{ fontSize: 12.5, color: 'var(--color-text-muted)', margin: 0 }}>Nothing logged yet — record your first expense to start tracking profit.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {data.recentExpenses.map((e) => (
              <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderTop: '1px solid var(--color-border)' }}>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 13.5 }}>{e.category}</span>
                  {e.description && <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}> · {e.description}</span>}
                  <span style={{ display: 'block', fontSize: 11, color: 'var(--color-text-subtle)' }}>{e.date}</span>
                </span>
                <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14 }}>{fmt(e.amount)}</span>
                <button type="button" onClick={() => removeExpense(e.id)} aria-label="Delete expense" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-subtle)', display: 'flex' }}>
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <PaymentSettingsCard />

      {/* Log expense modal */}
      {expenseOpen && (
        <Modal
          title="Log an expense"
          onClose={() => setExpenseOpen(false)}
          footer={
            <>
              <Button size="sm" variant="outline" onClick={() => setExpenseOpen(false)}>Cancel</Button>
              <Button size="sm" variant="primary" onClick={addExpense}>{busy ? 'Saving…' : 'Save expense'}</Button>
            </>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <TextInput label="Category" value={form.category} onChange={(v) => setForm({ ...form, category: v })} options={[...EXPENSE_CATEGORIES]} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <TextInput label="Amount (J$)" value={form.amount} onChange={(v) => setForm({ ...form, amount: v })} type="number" />
              <TextInput label="Date" value={form.spentAt} onChange={(v) => setForm({ ...form, spentAt: v })} type="date" />
            </div>
            <TextInput label="Note (optional)" value={form.description} onChange={(v) => setForm({ ...form, description: v })} placeholder="e.g. Facebook ads, June rent" />
          </div>
        </Modal>
      )}

      {/* Budgets modal */}
      {budgetOpen && (
        <Modal
          title="Monthly budgets"
          onClose={() => setBudgetOpen(false)}
          footer={
            <>
              <Button size="sm" variant="outline" onClick={() => setBudgetOpen(false)}>Cancel</Button>
              <Button size="sm" variant="primary" onClick={saveBudgets}>{busy ? 'Saving…' : 'Save budgets'}</Button>
            </>
          }
        >
          <p style={{ fontSize: 12.5, color: 'var(--color-text-muted)', margin: '0 0 12px' }}>
            Set a monthly target per category (leave blank for none). Actuals are compared against these.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {EXPENSE_CATEGORIES.map((c) => (
              <div key={c} style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 10, alignItems: 'center' }}>
                <span style={{ fontSize: 13 }}>{c}</span>
                <TextInput label="" value={budgetForm[c] ?? ''} onChange={(v) => setBudgetForm({ ...budgetForm, [c]: v })} type="number" placeholder="J$" />
              </div>
            ))}
          </div>
        </Modal>
      )}
    </div>
  )
}

function Kpi({ label, kpi, goodWhenUp }: { label: string; kpi: Kpi; goodWhenUp: boolean }) {
  const up = (kpi.change ?? 0) >= 0
  const good = kpi.change === null ? null : goodWhenUp ? up : !up
  const color = good === null ? 'var(--color-text-muted)' : good ? 'var(--ke-green-600)' : 'var(--color-danger)'
  return (
    <div style={{ ...cardStyle, borderRadius: 14, padding: 16 }}>
      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 22, letterSpacing: '-.01em' }}>{fmt(kpi.value)}</div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9.5, letterSpacing: '.1em', color: 'var(--color-text-muted)', marginTop: 6, textTransform: 'uppercase' }}>{label}</div>
      {kpi.change !== null && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11.5, color, marginTop: 6 }}>
          {up ? <TrendingUp size={13} /> : <TrendingDown size={13} />} {Math.abs(kpi.change)}% MoM
        </div>
      )}
    </div>
  )
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      <span style={{ width: 10, height: 10, borderRadius: 3, background: color }} /> {label}
    </span>
  )
}
