'use client'

import { useCallback, useEffect, useState } from 'react'
import { Building2, CalendarClock, Receipt, Plus, Play, Trash2 } from 'lucide-react'
import { cardStyle, h3Style } from '../ui/card'
import Badge from '../ui/Badge'
import Button from '../ui/Button'
import Modal from '../ui/Modal'
import Pill from '../ui/Pill'
import TextInput from '../ui/TextInput'
import { fmt } from '../mockData'
import { EXPENSE_CATEGORIES } from '@/lib/finance'

type View = 'assets' | 'prepaid' | 'revenue'

const VIEWS: { id: View; label: string; icon: typeof Building2 }[] = [
  { id: 'assets', label: 'Fixed assets', icon: Building2 },
  { id: 'prepaid', label: 'Prepaid expenses', icon: Receipt },
  { id: 'revenue', label: 'Revenue recognition', icon: CalendarClock },
]

/**
 * Straight-line schedules: depreciation, prepaid amortization and deferred
 * revenue. All three post real journal entries, so running them moves the
 * balance sheet and P&L rather than just updating a display.
 */
export default function SchedulesTab() {
  const [view, setView] = useState<View>('assets')
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {VIEWS.map((v) => (
          <Pill key={v.id} label={v.label} selected={view === v.id} onClick={() => setView(v.id)} />
        ))}
      </div>
      {view === 'assets' && <FixedAssets />}
      {view === 'prepaid' && <Prepaid />}
      {view === 'revenue' && <RevenueRecognition />}
    </div>
  )
}

function Stat({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <div style={{ ...cardStyle, borderRadius: 14, padding: 16 }}>
      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 22, letterSpacing: '-.01em', color: warn ? 'var(--ke-sun-600,#b45309)' : undefined }}>{value}</div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9.5, letterSpacing: '.1em', color: 'var(--color-text-muted)', marginTop: 6, textTransform: 'uppercase' }}>{label}</div>
    </div>
  )
}

// ---------------------------------------------------------------------------

interface AssetRow {
  id: string
  name: string
  cost: number
  salvageValue: number
  usefulLifeMonths: number
  acquiredAt: string
  monthlyDepreciation: number
  accumulatedDepreciation: number
  netBookValue: number
  periodsPosted: number
  periodsDue: number
  fullyDepreciated: boolean
  disposedAt: string | null
  nextPeriodLabel: string | null
}

function FixedAssets() {
  const [data, setData] = useState<{ assets: AssetRow[]; totals: { cost: number; accumulatedDepreciation: number; netBookValue: number; periodsDue: number } } | null>(null)
  const [addOpen, setAddOpen] = useState(false)
  const [form, setForm] = useState({ name: '', cost: '', salvageValue: '0', usefulLifeMonths: '60', acquiredAt: '', recordPurchase: true })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [msg, setMsg] = useState('')
  const [disposing, setDisposing] = useState<AssetRow | null>(null)
  const [disposal, setDisposal] = useState({ disposedAt: '', proceeds: '0' })

  const load = useCallback(async () => {
    const res = await fetch('/api/admin/finance/assets')
    if (res.ok) setData(await res.json())
  }, [])
  useEffect(() => { load() }, [load])

  const create = async () => {
    setError('')
    if (!form.name.trim() || !form.cost || !form.acquiredAt) return setError('Enter a name, cost and acquisition date.')
    setBusy(true)
    const res = await fetch('/api/admin/finance/assets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: form.name.trim(),
        cost: Number(form.cost),
        salvageValue: Number(form.salvageValue) || 0,
        usefulLifeMonths: Number(form.usefulLifeMonths),
        acquiredAt: form.acquiredAt,
        recordPurchase: form.recordPurchase,
      }),
    })
    const d = await res.json().catch(() => ({}))
    setBusy(false)
    if (!res.ok) return setError(d.error ?? 'Could not add that asset.')
    setAddOpen(false)
    setForm({ name: '', cost: '', salvageValue: '0', usefulLifeMonths: '60', acquiredAt: '', recordPurchase: true })
    load()
  }

  const runAll = async () => {
    setBusy(true)
    const res = await fetch('/api/admin/finance/assets', { method: 'PUT' })
    const d = await res.json().catch(() => ({}))
    setBusy(false)
    setMsg(res.ok ? (d.posted ? `Posted ${d.posted} depreciation period(s).` : 'Nothing due — depreciation is up to date.') : 'Run failed.')
    load()
  }

  const dispose = async () => {
    if (!disposing || !disposal.disposedAt) return
    setBusy(true)
    const res = await fetch(`/api/admin/finance/assets/${disposing.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ disposedAt: disposal.disposedAt, proceeds: Number(disposal.proceeds) || 0 }),
    })
    const d = await res.json().catch(() => ({}))
    setBusy(false)
    if (res.ok) {
      setMsg(`Disposed. ${d.gain >= 0 ? 'Gain' : 'Loss'} of ${fmt(Math.abs(Math.round(d.gain)))} booked.`)
      setDisposing(null)
      load()
    }
  }

  const remove = async (a: AssetRow) => {
    if (!confirm(`Delete ${a.name}? Only possible because it has no posted depreciation.`)) return
    const res = await fetch(`/api/admin/finance/assets/${a.id}`, { method: 'DELETE' })
    if (!res.ok) alert((await res.json().catch(() => ({}))).error ?? 'Could not delete.')
    load()
  }

  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14 }} className="kad-kpi-grid">
        <Stat label="Asset cost" value={data ? fmt(data.totals.cost) : '—'} />
        <Stat label="Accumulated depreciation" value={data ? fmt(data.totals.accumulatedDepreciation) : '—'} />
        <Stat label="Net book value" value={data ? fmt(data.totals.netBookValue) : '—'} />
        <Stat label="Periods due" value={data ? String(data.totals.periodsDue) : '—'} warn={Boolean(data && data.totals.periodsDue > 0)} />
      </div>

      <div style={{ ...cardStyle, padding: 0, overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', gap: 12, flexWrap: 'wrap' }}>
          <div>
            <h3 style={{ ...h3Style, margin: 0 }}>Fixed asset register</h3>
            <p style={{ fontSize: 12, color: 'var(--color-text-muted)', margin: '4px 0 0' }}>
              Straight-line depreciation. Running it posts to the ledger and reduces net book value.
            </p>
            {msg && <p style={{ fontSize: 12, color: 'var(--color-text-muted)', margin: '6px 0 0' }}>{msg}</p>}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Button size="sm" variant={data && data.totals.periodsDue > 0 ? 'primary' : 'outline'} onClick={runAll} disabled={busy} iconRight={<Play size={13} />}>
              Run depreciation
            </Button>
            <Button size="sm" variant="outline" onClick={() => setAddOpen(true)} iconRight={<Plus size={14} />}>Add asset</Button>
          </div>
        </div>

        {!data ? (
          <p style={{ fontSize: 13, color: 'var(--color-text-muted)', padding: '0 18px 18px' }}>Loading…</p>
        ) : data.assets.length === 0 ? (
          <div style={{ padding: '28px 18px', textAlign: 'center' }}>
            <p style={{ fontSize: 13.5, fontWeight: 600, margin: '0 0 4px' }}>No fixed assets yet</p>
            <p style={{ fontSize: 12.5, color: 'var(--color-text-muted)', margin: 0 }}>
              Add equipment, vehicles or fit-out you own. Depreciation then posts automatically each month.
            </p>
          </div>
        ) : (
          data.assets.map((a) => (
            <div key={a.id} style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr 1fr 1fr auto', gap: 12, alignItems: 'center', padding: '13px 18px', borderTop: '1px solid var(--color-border)' }}>
              <span style={{ minWidth: 0 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 13.5 }}>{a.name}</span>
                  {a.disposedAt ? <Badge tone="grey">Disposed</Badge> : a.fullyDepreciated ? <Badge tone="blue">Fully depreciated</Badge> : a.periodsDue > 0 ? <Badge tone="orange">{a.periodsDue} due</Badge> : <Badge tone="green">Current</Badge>}
                </span>
                <span style={{ display: 'block', fontSize: 11.5, color: 'var(--color-text-muted)', marginTop: 2 }}>
                  {fmt(Math.round(a.monthlyDepreciation))}/mo · {a.periodsPosted}/{a.usefulLifeMonths} periods
                  {a.nextPeriodLabel ? ` · next ${a.nextPeriodLabel}` : ''}
                </span>
              </span>
              <span style={{ fontSize: 12.5, color: 'var(--color-text-muted)' }}>{fmt(Math.round(a.cost))}</span>
              <span style={{ fontSize: 12.5, color: 'var(--color-text-muted)' }}>−{fmt(Math.round(a.accumulatedDepreciation))}</span>
              <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13 }}>{fmt(Math.round(a.netBookValue))}</span>
              <span style={{ display: 'flex', gap: 6 }}>
                {!a.disposedAt && (
                  <Button size="sm" variant="outline" onClick={() => { setDisposing(a); setDisposal({ disposedAt: '', proceeds: '0' }) }}>Dispose</Button>
                )}
                {a.periodsPosted === 0 && (
                  <button type="button" onClick={() => remove(a)} title="Delete" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-subtle)', padding: 4 }}>
                    <Trash2 size={14} />
                  </button>
                )}
              </span>
            </div>
          ))
        )}
      </div>

      {addOpen && (
        <Modal
          title="Add a fixed asset"
          onClose={() => { setAddOpen(false); setError('') }}
          footer={<><Button size="sm" variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button><Button size="sm" variant="primary" onClick={create} disabled={busy}>{busy ? 'Adding…' : 'Add asset'}</Button></>}
        >
          <TextInput label="Name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} placeholder="Delivery van" />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <TextInput label="Cost (J$)" value={form.cost} onChange={(v) => setForm({ ...form, cost: v })} type="number" />
            <TextInput label="Salvage value (J$)" value={form.salvageValue} onChange={(v) => setForm({ ...form, salvageValue: v })} type="number" />
            <TextInput label="Useful life (months)" value={form.usefulLifeMonths} onChange={(v) => setForm({ ...form, usefulLifeMonths: v })} type="number" />
            <TextInput label="Acquired on" value={form.acquiredAt} onChange={(v) => setForm({ ...form, acquiredAt: v })} type="date" />
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, marginTop: 8 }}>
            <input type="checkbox" checked={form.recordPurchase} onChange={(e) => setForm({ ...form, recordPurchase: e.target.checked })} />
            Also record the purchase in the ledger (Equipment / Bank)
          </label>
          <p style={{ fontSize: 11.5, color: 'var(--color-text-subtle)', marginTop: 6 }}>
            Untick if you already logged this purchase as an expense or bank payment — otherwise it would be counted twice.
          </p>
          {error && <p style={{ fontSize: 12.5, color: 'var(--color-danger)', marginTop: 8 }}>{error}</p>}
        </Modal>
      )}

      {disposing && (
        <Modal
          title={`Dispose of ${disposing.name}`}
          onClose={() => setDisposing(null)}
          footer={<><Button size="sm" variant="outline" onClick={() => setDisposing(null)}>Cancel</Button><Button size="sm" variant="primary" onClick={dispose} disabled={busy || !disposal.disposedAt}>{busy ? 'Posting…' : 'Dispose'}</Button></>}
        >
          <p style={{ fontSize: 12.5, color: 'var(--color-text-muted)', margin: '0 0 12px' }}>
            Depreciation is caught up to the disposal date first, then the asset and its accumulated depreciation come off the books.
            Current net book value is <strong>{fmt(Math.round(disposing.netBookValue))}</strong> — anything above that is a gain, below is a loss.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <TextInput label="Disposal date" value={disposal.disposedAt} onChange={(v) => setDisposal({ ...disposal, disposedAt: v })} type="date" />
            <TextInput label="Proceeds (J$)" value={disposal.proceeds} onChange={(v) => setDisposal({ ...disposal, proceeds: v })} type="number" />
          </div>
        </Modal>
      )}
    </>
  )
}

// ---------------------------------------------------------------------------

interface ScheduleRow {
  id: string
  description: string
  customerName?: string | null
  totalAmount: number
  months: number
  startDate: string
  monthly: number
  recognised: number
  remaining: number
  periodsDue: number
  complete: boolean
  nextPeriodLabel: string | null
}

/** Prepaid expenses and revenue recognition share a layout — one component, two configs. */
function ScheduleList({
  endpoint,
  title,
  blurb,
  emptyTitle,
  emptyBody,
  progressLabel,
  remainingLabel,
  runLabel,
  extraFields,
}: {
  endpoint: string
  title: string
  blurb: string
  emptyTitle: string
  emptyBody: string
  progressLabel: string
  remainingLabel: string
  runLabel: string
  extraFields?: 'category' | 'customer'
}) {
  const [data, setData] = useState<{ items: ScheduleRow[]; totals: Record<string, number> } | null>(null)
  const [addOpen, setAddOpen] = useState(false)
  const [form, setForm] = useState({ description: '', totalAmount: '', months: '12', startDate: '', category: EXPENSE_CATEGORIES[0] as string, customerName: '', record: true })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [msg, setMsg] = useState('')

  const load = useCallback(async () => {
    const res = await fetch(endpoint)
    if (res.ok) setData(await res.json())
  }, [endpoint])
  useEffect(() => { load() }, [load])

  const create = async () => {
    setError('')
    if (!form.description.trim() || !form.totalAmount || !form.startDate) return setError('Fill in a description, amount and start date.')
    setBusy(true)
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        description: form.description.trim(),
        totalAmount: Number(form.totalAmount),
        months: Number(form.months),
        startDate: form.startDate,
        ...(extraFields === 'category' ? { category: form.category, recordPayment: form.record } : {}),
        ...(extraFields === 'customer' ? { customerName: form.customerName || undefined, recordReceipt: form.record } : {}),
      }),
    })
    const d = await res.json().catch(() => ({}))
    setBusy(false)
    if (!res.ok) return setError(d.error ?? 'Could not save that.')
    setAddOpen(false)
    setForm({ description: '', totalAmount: '', months: '12', startDate: '', category: EXPENSE_CATEGORIES[0] as string, customerName: '', record: true })
    load()
  }

  const runAll = async () => {
    setBusy(true)
    const res = await fetch(endpoint, { method: 'PUT' })
    const d = await res.json().catch(() => ({}))
    setBusy(false)
    setMsg(res.ok ? (d.posted ? `Posted ${d.posted} period(s).` : 'Nothing due right now.') : 'Run failed.')
    load()
  }

  const remove = async (row: ScheduleRow) => {
    if (!confirm(`Delete "${row.description}"?`)) return
    const res = await fetch(`${endpoint}/${row.id}`, { method: 'DELETE' })
    if (!res.ok) alert((await res.json().catch(() => ({}))).error ?? 'Could not delete.')
    load()
  }

  const totalDue = data ? data.items.reduce((s, i) => s + i.periodsDue, 0) : 0

  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14 }} className="kad-kpi-grid">
        <Stat label={remainingLabel} value={data ? fmt(Math.round(data.items.reduce((s, i) => s + i.remaining, 0))) : '—'} />
        <Stat label={progressLabel} value={data ? fmt(Math.round(data.items.reduce((s, i) => s + i.recognised, 0))) : '—'} />
        <Stat label="Periods due" value={data ? String(totalDue) : '—'} warn={totalDue > 0} />
      </div>

      <div style={{ ...cardStyle, padding: 0, overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', gap: 12, flexWrap: 'wrap' }}>
          <div>
            <h3 style={{ ...h3Style, margin: 0 }}>{title}</h3>
            <p style={{ fontSize: 12, color: 'var(--color-text-muted)', margin: '4px 0 0' }}>{blurb}</p>
            {msg && <p style={{ fontSize: 12, color: 'var(--color-text-muted)', margin: '6px 0 0' }}>{msg}</p>}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Button size="sm" variant={totalDue > 0 ? 'primary' : 'outline'} onClick={runAll} disabled={busy} iconRight={<Play size={13} />}>{runLabel}</Button>
            <Button size="sm" variant="outline" onClick={() => setAddOpen(true)} iconRight={<Plus size={14} />}>Add</Button>
          </div>
        </div>

        {!data ? (
          <p style={{ fontSize: 13, color: 'var(--color-text-muted)', padding: '0 18px 18px' }}>Loading…</p>
        ) : data.items.length === 0 ? (
          <div style={{ padding: '28px 18px', textAlign: 'center' }}>
            <p style={{ fontSize: 13.5, fontWeight: 600, margin: '0 0 4px' }}>{emptyTitle}</p>
            <p style={{ fontSize: 12.5, color: 'var(--color-text-muted)', margin: 0 }}>{emptyBody}</p>
          </div>
        ) : (
          data.items.map((r) => {
            const pct = r.totalAmount ? Math.min(100, Math.round((r.recognised / r.totalAmount) * 100)) : 0
            return (
              <div key={r.id} style={{ display: 'grid', gridTemplateColumns: '1.8fr 1fr 1fr auto', gap: 12, alignItems: 'center', padding: '13px 18px', borderTop: '1px solid var(--color-border)' }}>
                <span style={{ minWidth: 0 }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 13.5 }}>{r.description}</span>
                    {r.complete ? <Badge tone="green">Complete</Badge> : r.periodsDue > 0 ? <Badge tone="orange">{r.periodsDue} due</Badge> : <Badge tone="blue">On schedule</Badge>}
                  </span>
                  <span style={{ display: 'block', fontSize: 11.5, color: 'var(--color-text-muted)', marginTop: 2 }}>
                    {r.customerName ? `${r.customerName} · ` : ''}{fmt(Math.round(r.monthly))}/mo over {r.months} months
                    {r.nextPeriodLabel ? ` · next ${r.nextPeriodLabel}` : ''}
                  </span>
                  <span style={{ display: 'block', height: 4, borderRadius: 999, background: 'var(--ke-gray-100)', overflow: 'hidden', marginTop: 6, maxWidth: 260 }}>
                    <span style={{ display: 'block', width: `${pct}%`, height: '100%', background: 'var(--ke-green-500)' }} />
                  </span>
                </span>
                <span style={{ fontSize: 12.5, color: 'var(--color-text-muted)' }}>{fmt(Math.round(r.recognised))}</span>
                <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13 }}>{fmt(Math.round(r.remaining))}</span>
                <span>
                  {r.recognised === 0 && (
                    <button type="button" onClick={() => remove(r)} title="Delete" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-subtle)', padding: 4 }}>
                      <Trash2 size={14} />
                    </button>
                  )}
                </span>
              </div>
            )
          })
        )}
      </div>

      {addOpen && (
        <Modal
          title={`Add — ${title}`}
          onClose={() => { setAddOpen(false); setError('') }}
          footer={<><Button size="sm" variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button><Button size="sm" variant="primary" onClick={create} disabled={busy}>{busy ? 'Saving…' : 'Save'}</Button></>}
        >
          <TextInput label="Description" value={form.description} onChange={(v) => setForm({ ...form, description: v })} placeholder={extraFields === 'customer' ? 'Annual service plan' : 'Annual insurance premium'} />
          {extraFields === 'customer' && (
            <TextInput label="Customer (optional)" value={form.customerName} onChange={(v) => setForm({ ...form, customerName: v })} />
          )}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <TextInput label="Total amount (J$)" value={form.totalAmount} onChange={(v) => setForm({ ...form, totalAmount: v })} type="number" />
            <TextInput label="Spread over (months)" value={form.months} onChange={(v) => setForm({ ...form, months: v })} type="number" />
          </div>
          <TextInput label="Start date" value={form.startDate} onChange={(v) => setForm({ ...form, startDate: v })} type="date" />
          {extraFields === 'category' && (
            <TextInput label="Expense category" value={form.category} onChange={(v) => setForm({ ...form, category: v })} options={[...EXPENSE_CATEGORIES]} />
          )}
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, marginTop: 8 }}>
            <input type="checkbox" checked={form.record} onChange={(e) => setForm({ ...form, record: e.target.checked })} />
            {extraFields === 'customer' ? 'Also record the cash received (Bank / Deferred revenue)' : 'Also record the payment (Prepaid / Bank)'}
          </label>
          <p style={{ fontSize: 11.5, color: 'var(--color-text-subtle)', marginTop: 6 }}>
            Untick if this money has already been recorded elsewhere, so it isn&apos;t counted twice.
          </p>
          {error && <p style={{ fontSize: 12.5, color: 'var(--color-danger)', marginTop: 8 }}>{error}</p>}
        </Modal>
      )}
    </>
  )
}

function Prepaid() {
  return (
    <ScheduleList
      endpoint="/api/admin/finance/prepaid"
      title="Prepaid expenses"
      blurb="Costs paid up front and spread across the months they cover, instead of hitting one month's profit."
      emptyTitle="No prepaid expenses yet"
      emptyBody="Add things like annual insurance or a year of software paid up front."
      progressLabel="Expensed so far"
      remainingLabel="Remaining on balance sheet"
      runLabel="Run amortization"
      extraFields="category"
    />
  )
}

function RevenueRecognition() {
  return (
    <ScheduleList
      endpoint="/api/admin/finance/revenue-schedules"
      title="Revenue recognition"
      blurb="Money taken up front is held as a liability and released to revenue only as it's earned."
      emptyTitle="No deferred revenue yet"
      emptyBody="Add service plans, warranties or retainers that are paid up front but delivered over time."
      progressLabel="Recognised to date"
      remainingLabel="Deferred (still owed)"
      runLabel="Recognise revenue"
      extraFields="customer"
    />
  )
}
