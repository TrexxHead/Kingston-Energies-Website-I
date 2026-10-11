'use client'

import { useState } from 'react'
import Modal from '../ui/Modal'
import Button from '../ui/Button'
import TextInput from '../ui/TextInput'
import { EXPENSE_CATEGORIES } from '@/lib/finance'
import { useExpenseCategories } from './useFinanceData'

/**
 * A focused "log expense" form scoped to the Finance → Calendar view — the
 * expense counterpart to CalendarOrderModal, reached via the same "New
 * transaction" entry point once the admin picks "Expense" over "Order".
 * Posts through the same /api/admin/expenses endpoint ExpensesTab uses.
 */
export default function CalendarExpenseModal({ defaultDate, onClose, onCreated }: { defaultDate: string; onClose: () => void; onCreated: () => void }) {
  const { categories } = useExpenseCategories()
  const categoryOptions = categories.length ? categories : [...EXPENSE_CATEGORIES]
  const [category, setCategory] = useState(categoryOptions[0])
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [spentAt, setSpentAt] = useState(defaultDate)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const submit = async () => {
    setError('')
    if (!amount || Number(amount) <= 0) return setError('Enter a positive amount.')

    setBusy(true)
    const res = await fetch('/api/admin/expenses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ category, amount: Number(amount), description: description.trim() || undefined, spentAt }),
    })
    setBusy(false)
    if (!res.ok) return setError((await res.json().catch(() => ({}))).error || 'Could not log this expense.')
    onCreated()
  }

  return (
    <Modal
      title="Log an expense"
      onClose={onClose}
      footer={
        <>
          <Button size="sm" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button size="sm" variant="primary" onClick={submit} disabled={busy}>
            {busy ? 'Saving…' : 'Save expense'}
          </Button>
        </>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <TextInput label="Category" value={category} onChange={setCategory} options={categoryOptions} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <TextInput label="Amount (J$)" value={amount} onChange={setAmount} type="number" />
          <TextInput label="Date" value={spentAt} onChange={setSpentAt} type="date" />
        </div>
        <TextInput label="Note (optional)" value={description} onChange={setDescription} placeholder="e.g. Facebook ads, June rent" />
      </div>
      {error && <div style={{ color: 'var(--color-danger,#dc2626)', fontSize: 13, marginTop: 10 }}>{error}</div>}
    </Modal>
  )
}
