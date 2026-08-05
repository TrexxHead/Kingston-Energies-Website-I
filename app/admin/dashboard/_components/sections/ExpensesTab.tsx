'use client'

import { useRef, useState } from 'react'
import { Plus, Trash2, Paperclip, X, Pencil, History } from 'lucide-react'
import { cardStyle, h3Style } from '../ui/card'
import Button from '../ui/Button'
import Modal from '../ui/Modal'
import TextInput from '../ui/TextInput'
import { fmt } from '../mockData'
import { EXPENSE_CATEGORIES } from '@/lib/finance'
import { useFinanceData, useExpenseCategories, type FinanceExpenseRow } from './useFinanceData'

/** Budgets against actuals, and the log of what was actually spent. */
export default function ExpensesTab() {
  const { data, reload } = useFinanceData()
  const { categories, addCategory } = useExpenseCategories()
  const [expenseOpen, setExpenseOpen] = useState(false)
  const [budgetOpen, setBudgetOpen] = useState(false)
  const [form, setForm] = useState({ category: EXPENSE_CATEGORIES[0] as string, amount: '', description: '', spentAt: '' })
  const [receipt, setReceipt] = useState<File | null>(null)
  const [budgetForm, setBudgetForm] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)
  const [addingCategory, setAddingCategory] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [editing, setEditing] = useState<FinanceExpenseRow | null>(null)
  const [attachTargetId, setAttachTargetId] = useState<string | null>(null)
  const [attaching, setAttaching] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const categoryOptions = categories.length ? categories : [...EXPENSE_CATEGORIES]

  const startAttach = (expenseId: string) => {
    setAttachTargetId(expenseId)
    fileInputRef.current?.click()
  }

  const onFileChosen = async (file: File | null) => {
    if (!file || !attachTargetId) return
    setAttaching(true)
    const body = new FormData()
    body.append('file', file)
    const res = await fetch(`/api/admin/expenses/${attachTargetId}/receipt`, { method: 'POST', body })
    setAttaching(false)
    setAttachTargetId(null)
    if (res.ok) reload()
    else {
      const d = await res.json().catch(() => ({}))
      window.alert(d.error ?? 'Could not attach that receipt.')
    }
  }

  const saveNewCategory = async () => {
    const name = newCategoryName.trim()
    if (!name) return
    const next = await addCategory(name)
    if (next) {
      setForm((f) => ({ ...f, category: name }))
      setNewCategoryName('')
      setAddingCategory(false)
    }
  }

  const addExpense = async () => {
    if (!form.amount || Number(form.amount) <= 0) return
    setBusy(true)

    let res: Response
    if (receipt) {
      const body = new FormData()
      body.append('category', form.category)
      body.append('amount', form.amount)
      if (form.description) body.append('description', form.description)
      if (form.spentAt) body.append('spentAt', form.spentAt)
      body.append('receipt', receipt)
      res = await fetch('/api/admin/expenses', { method: 'POST', body })
    } else {
      res = await fetch('/api/admin/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: form.category,
          amount: Number(form.amount),
          description: form.description || undefined,
          spentAt: form.spentAt || undefined,
        }),
      })
    }
    setBusy(false)
    if (res.ok) {
      setExpenseOpen(false)
      setForm({ category: EXPENSE_CATEGORIES[0], amount: '', description: '', spentAt: '' })
      setReceipt(null)
      reload()
    }
  }

  const removeExpense = async (id: string) => {
    await fetch(`/api/admin/expenses/${id}`, { method: 'DELETE' })
    reload()
  }

  const openReceipt = async (documentId: string) => {
    const res = await fetch(`/api/admin/finance/documents/${documentId}`)
    if (!res.ok) return
    const doc = await res.json()
    if (doc.fileUrl) window.open(doc.fileUrl, '_blank', 'noopener')
  }

  const openBudgets = () => {
    const init: Record<string, string> = {}
    categoryOptions.forEach((c) => {
      init[c] = data?.budgetMap[c] ? String(data.budgetMap[c]) : ''
    })
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
      reload()
    }
  }

  if (!data) {
    return (
      <div style={cardStyle}>
        <p style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>Loading expenses…</p>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', gap: 16, alignItems: 'start' }}>
        <div style={cardStyle}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <h3 style={{ ...h3Style, margin: 0 }}>Budget vs actual · {data.currentMonth}</h3>
            <Button size="sm" variant="outline" onClick={openBudgets}>
              Set budgets
            </Button>
          </div>
          {data.budgets.length === 0 ? (
            <p style={{ fontSize: 12.5, color: 'var(--color-text-muted)', margin: 0 }}>
              No budgets set yet. Click “Set budgets” to add monthly targets.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {data.budgets.map((b) => {
                const pct = b.budget > 0 ? Math.min(100, (b.actual / b.budget) * 100) : 0
                const over = b.actual > b.budget
                return (
                  <div key={b.category}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, marginBottom: 6 }}>
                      <span>{b.category}</span>
                      <span style={{ color: over ? 'var(--color-danger)' : 'var(--color-text-muted)' }}>
                        {fmt(b.actual)} / {fmt(b.budget)}
                      </span>
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

      <div style={cardStyle}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <h3 style={{ ...h3Style, margin: 0 }}>Expense log</h3>
          <Button size="sm" variant="primary" onClick={() => setExpenseOpen(true)} iconRight={<Plus size={14} />}>
            Log expense
          </Button>
        </div>
        {data.recentExpenses.length === 0 ? (
          <p style={{ fontSize: 12.5, color: 'var(--color-text-muted)', margin: 0 }}>
            Nothing logged yet. Record your first expense to start tracking profit.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {data.recentExpenses.map((e) => (
              <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderTop: '1px solid var(--color-border)' }}>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 13.5 }}>{e.category}</span>
                  {e.description && <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}> · {e.description}</span>}
                  {e.editCount > 0 && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 10.5, color: 'var(--ke-sun-500)', marginLeft: 6 }}>
                      <History size={10} /> edited ×{e.editCount}
                    </span>
                  )}
                  <span style={{ display: 'block', fontSize: 11, color: 'var(--color-text-subtle)' }}>{e.date}</span>
                </span>
                <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14 }}>{fmt(e.amount)}</span>
                {e.documentId ? (
                  <button
                    type="button"
                    onClick={() => openReceipt(e.documentId as string)}
                    aria-label="View receipt"
                    title="View receipt"
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ke-green-600)', display: 'flex' }}
                  >
                    <Paperclip size={15} />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => startAttach(e.id)}
                    aria-label="Attach receipt"
                    title="Attach receipt"
                    disabled={attaching && attachTargetId === e.id}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-subtle)', display: 'flex' }}
                  >
                    <Paperclip size={15} />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setEditing(e)}
                  aria-label="Edit expense"
                  title="Edit expense"
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-subtle)', display: 'flex' }}
                >
                  <Pencil size={15} />
                </button>
                <button
                  type="button"
                  onClick={() => removeExpense(e.id)}
                  aria-label="Delete expense"
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-subtle)', display: 'flex' }}
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,application/pdf"
        style={{ display: 'none' }}
        onChange={(ev) => {
          const f = ev.target.files?.[0] ?? null
          ev.target.value = ''
          onFileChosen(f)
        }}
      />

      {editing && (
        <EditExpenseModal
          expense={editing}
          categoryOptions={categoryOptions}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null)
            reload()
          }}
        />
      )}

      {expenseOpen && (
        <Modal
          title="Log an expense"
          onClose={() => setExpenseOpen(false)}
          footer={
            <>
              <Button size="sm" variant="outline" onClick={() => setExpenseOpen(false)}>
                Cancel
              </Button>
              <Button size="sm" variant="primary" onClick={addExpense}>
                {busy ? 'Saving…' : 'Save expense'}
              </Button>
            </>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div>
              <TextInput label="Category" value={form.category} onChange={(v) => setForm({ ...form, category: v })} options={categoryOptions} />
              {addingCategory ? (
                <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                  <input
                    autoFocus
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); saveNewCategory() } }}
                    placeholder="New category name"
                    style={{ flex: 1, height: 34, padding: '0 10px', border: '1.5px solid var(--ke-green-500)', borderRadius: 8, fontSize: 12.5 }}
                  />
                  <Button size="sm" variant="primary" onClick={saveNewCategory}>Add</Button>
                  <button
                    type="button"
                    onClick={() => { setAddingCategory(false); setNewCategoryName('') }}
                    aria-label="Cancel"
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', display: 'flex' }}
                  >
                    <X size={16} />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setAddingCategory(true)}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: 6, background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600, color: 'var(--ke-green-700,#15803d)', padding: 0 }}
                >
                  <Plus size={12} /> New category
                </button>
              )}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <TextInput label="Amount (J$)" value={form.amount} onChange={(v) => setForm({ ...form, amount: v })} type="number" />
              <TextInput label="Date" value={form.spentAt} onChange={(v) => setForm({ ...form, spentAt: v })} type="date" />
            </div>
            <TextInput label="Note (optional)" value={form.description} onChange={(v) => setForm({ ...form, description: v })} placeholder="e.g. Facebook ads, June rent" />
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: 6 }}>
                <Paperclip size={13} /> Receipt (optional)
              </label>
              <input
                type="file"
                accept="image/*,application/pdf"
                onChange={(e) => setReceipt(e.target.files?.[0] ?? null)}
                style={{ fontSize: 13, width: '100%' }}
              />
              {receipt && (
                <p style={{ fontSize: 12, color: 'var(--color-text-muted)', margin: '6px 0 0' }}>
                  {receipt.name}: kept as the evidence behind this expense.
                </p>
              )}
            </div>
          </div>
        </Modal>
      )}

      {budgetOpen && (
        <Modal
          title="Monthly budgets"
          onClose={() => setBudgetOpen(false)}
          footer={
            <>
              <Button size="sm" variant="outline" onClick={() => setBudgetOpen(false)}>
                Cancel
              </Button>
              <Button size="sm" variant="primary" onClick={saveBudgets}>
                {busy ? 'Saving…' : 'Save budgets'}
              </Button>
            </>
          }
        >
          <p style={{ fontSize: 12.5, color: 'var(--color-text-muted)', margin: '0 0 12px' }}>
            Set a monthly target per category (leave blank for none). Actuals are compared against these.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {categoryOptions.map((c) => (
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

function EditExpenseModal({
  expense,
  categoryOptions,
  onClose,
  onSaved,
}: {
  expense: FinanceExpenseRow
  categoryOptions: string[]
  onClose: () => void
  onSaved: () => void
}) {
  const [category, setCategory] = useState(expense.category)
  const [description, setDescription] = useState(expense.description ?? '')
  const [amount, setAmount] = useState(String(expense.amount))
  const [spentAt, setSpentAt] = useState(expense.spentAtIso)
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const save = async () => {
    if (!amount || Number(amount) <= 0) {
      setError('Enter a positive amount.')
      return
    }
    if (!reason.trim()) {
      setError('Enter a reason for this correction.')
      return
    }
    setSaving(true)
    setError(null)
    const res = await fetch(`/api/admin/expenses/${expense.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ category, description: description || undefined, amount: Number(amount), spentAt, reason }),
    })
    setSaving(false)
    if (res.ok) {
      onSaved()
    } else {
      const d = await res.json().catch(() => ({}))
      setError(d.error ?? 'Could not save that change.')
    }
  }

  return (
    <Modal
      title="Correct this expense"
      onClose={onClose}
      footer={
        <>
          <Button size="sm" variant="outline" onClick={onClose}>Cancel</Button>
          <Button size="sm" variant="primary" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save correction'}</Button>
        </>
      }
    >
      <p style={{ fontSize: 12.5, color: 'var(--color-text-muted)', margin: '0 0 14px' }}>
        If this expense already posted to the ledger, that entry is reversed and a new one posted for the corrected
        figures — nothing here is changed quietly.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <TextInput label="Category" value={category} onChange={setCategory} options={categoryOptions} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <TextInput label="Amount (J$)" value={amount} onChange={setAmount} type="number" />
          <TextInput label="Date" value={spentAt} onChange={setSpentAt} type="date" />
        </div>
        <TextInput label="Note (optional)" value={description} onChange={setDescription} placeholder="e.g. Facebook ads, June rent" />
        <TextInput label="Reason for this change" value={reason} onChange={setReason} placeholder="e.g. Amount was a typo — should be J$4,200" />
      </div>
      {error && <p style={{ fontSize: 12.5, color: 'var(--color-danger)', marginTop: 10 }}>{error}</p>}
    </Modal>
  )
}
