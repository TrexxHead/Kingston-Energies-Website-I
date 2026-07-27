'use client'

import { useCallback, useEffect, useState } from 'react'
import { CheckCircle2, Scale, ArrowLeft } from 'lucide-react'
import { cardStyle, h3Style } from '../ui/card'
import Badge from '../ui/Badge'
import Button from '../ui/Button'
import TextInput from '../ui/TextInput'
import Pill from '../ui/Pill'
import { fmt } from '../mockData'
import BankFeedsTab from './BankFeedsTab'

interface BankAccount { id: string; code: string; name: string; bookBalance: number }
interface RecSummary {
  id: string
  accountCode: string
  accountName: string
  statementDate: string
  endingBalance: number
  status: 'IN_PROGRESS' | 'COMPLETED'
  clearedCount: number
  completedAt: string | null
}
interface RecLine {
  id: string
  entryNo: string
  date: string
  memo: string | null
  debit: number
  credit: number
  cleared: boolean
}
interface RecDetail {
  id: string
  account: { code: string; name: string }
  statementDate: string
  beginningBalance: number
  endingBalance: number
  status: 'IN_PROGRESS' | 'COMPLETED'
  clearedBalance: number
  difference: number
  balanced: boolean
  lines: RecLine[]
}

/**
 * Bank reconciliation. Ticking a line asserts the bank agrees with it — it
 * never changes the amount, so reconciling can't be used to quietly adjust the
 * books. The session only closes when the difference is exactly zero.
 */
export default function ReconcileTab() {
  // Bank feeds sit alongside reconciliation because they are the same job in
  // two halves: get the bank's version of events in, then agree it with ours.
  const [view, setView] = useState<'feeds' | 'reconcile'>('feeds')
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <Pill label="Bank feeds" selected={view === 'feeds'} onClick={() => setView('feeds')} />
        <Pill label="Reconcile" selected={view === 'reconcile'} onClick={() => setView('reconcile')} />
      </div>
      {view === 'feeds' ? <BankFeedsTab /> : <Reconcile />}
    </div>
  )
}

function Reconcile() {
  const [openId, setOpenId] = useState<string | null>(null)
  return openId ? <Session id={openId} onBack={() => setOpenId(null)} /> : <Start onOpen={setOpenId} />
}

function Start({ onOpen }: { onOpen: (id: string) => void }) {
  const [data, setData] = useState<{ accounts: BankAccount[]; reconciliations: RecSummary[] } | null>(null)
  const [form, setForm] = useState({ accountId: '', statementDate: '', endingBalance: '', beginningBalance: '0' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    const res = await fetch('/api/admin/finance/reconcile')
    if (res.ok) {
      const d = await res.json()
      setData(d)
      if (!form.accountId && d.accounts[0]) setForm((f) => ({ ...f, accountId: d.accounts[0].id }))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  useEffect(() => { load() }, [load])

  const start = async () => {
    setError('')
    if (!form.accountId || !form.statementDate || form.endingBalance === '') return setError('Choose an account, statement date and closing balance.')
    setBusy(true)
    const res = await fetch('/api/admin/finance/reconcile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        accountId: form.accountId,
        statementDate: form.statementDate,
        endingBalance: Number(form.endingBalance),
        beginningBalance: Number(form.beginningBalance) || 0,
      }),
    })
    const d = await res.json().catch(() => ({}))
    setBusy(false)
    if (!res.ok) {
      setError(d.error ?? 'Could not start.')
      if (d.id) onOpen(d.id)
      return
    }
    onOpen(d.id)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={cardStyle}>
        <h3 style={h3Style}>Reconcile an account</h3>
        <p style={{ fontSize: 12.5, color: 'var(--color-text-muted)', margin: '-4px 0 14px' }}>
          Match what the ledger says against a real bank or cash statement. Tick off what the statement shows until the difference is zero.
        </p>

        {!data ? (
          <p style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>Loading…</p>
        ) : data.accounts.length === 0 ? (
          <p style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>
            No bank or cash accounts found. Mark an account as a bank account in the chart of accounts first.
          </p>
        ) : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr 1fr', gap: 10, alignItems: 'end' }}>
              <label style={{ display: 'block' }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '.14em', color: 'var(--color-text-muted)', display: 'block', marginBottom: 6 }}>ACCOUNT</span>
                <select
                  value={form.accountId}
                  onChange={(e) => setForm({ ...form, accountId: e.target.value })}
                  style={{ width: '100%', height: 36, padding: '0 10px', border: '1.5px solid var(--color-border)', borderRadius: 9, fontSize: 13, background: 'var(--color-surface)', fontFamily: 'var(--font-body)' }}
                >
                  {data.accounts.map((a) => (
                    <option key={a.id} value={a.id}>{a.code} · {a.name} — book {fmt(a.bookBalance)}</option>
                  ))}
                </select>
              </label>
              <TextInput label="Statement date" value={form.statementDate} onChange={(v) => setForm({ ...form, statementDate: v })} type="date" />
              <TextInput label="Opening balance" value={form.beginningBalance} onChange={(v) => setForm({ ...form, beginningBalance: v })} type="number" />
              <TextInput label="Closing balance" value={form.endingBalance} onChange={(v) => setForm({ ...form, endingBalance: v })} type="number" />
            </div>
            <div style={{ marginTop: 12 }}>
              <Button size="sm" variant="primary" onClick={start} disabled={busy}>{busy ? 'Starting…' : 'Start reconciling'}</Button>
            </div>
            {error && <p style={{ fontSize: 12.5, color: 'var(--color-danger)', marginTop: 10 }}>{error}</p>}
          </>
        )}
      </div>

      <div style={{ ...cardStyle, padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '14px 18px' }}>
          <h3 style={{ ...h3Style, margin: 0 }}>History</h3>
        </div>
        {!data || data.reconciliations.length === 0 ? (
          <p style={{ fontSize: 12.5, color: 'var(--color-text-muted)', padding: '0 18px 18px' }}>No reconciliations yet.</p>
        ) : (
          data.reconciliations.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => onOpen(r.id)}
              style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr auto', gap: 12, alignItems: 'center', width: '100%', padding: '12px 18px', borderTop: '1px solid var(--color-border)', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left' }}
            >
              <span style={{ fontSize: 13, fontWeight: 500 }}>{r.accountCode} · {r.accountName}</span>
              <span style={{ fontSize: 12.5, color: 'var(--color-text-muted)' }}>
                {new Date(r.statementDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
              </span>
              <span style={{ fontSize: 12.5 }}>{fmt(Math.round(r.endingBalance))}</span>
              {r.status === 'COMPLETED' ? <Badge tone="green" dot>Reconciled</Badge> : <Badge tone="orange" dot>In progress</Badge>}
            </button>
          ))
        )}
      </div>
    </div>
  )
}

function Session({ id, onBack }: { id: string; onBack: () => void }) {
  const [data, setData] = useState<RecDetail | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    const res = await fetch(`/api/admin/finance/reconcile/${id}`)
    if (res.ok) setData(await res.json())
  }, [id])
  useEffect(() => { load() }, [load])

  const toggle = async (line: RecLine) => {
    if (data?.status === 'COMPLETED') return
    // Optimistic — the difference recomputes on reload.
    setData((d) => (d ? { ...d, lines: d.lines.map((l) => (l.id === line.id ? { ...l, cleared: !l.cleared } : l)) } : d))
    await fetch(`/api/admin/finance/reconcile/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(line.cleared ? { unclear: [line.id] } : { clear: [line.id] }),
    })
    load()
  }

  const complete = async () => {
    setBusy(true)
    setError('')
    const res = await fetch(`/api/admin/finance/reconcile/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ complete: true }),
    })
    const d = await res.json().catch(() => ({}))
    setBusy(false)
    if (!res.ok) setError(d.error ?? 'Could not complete.')
    load()
  }

  if (!data) return <div style={cardStyle}><p style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>Loading…</p></div>

  const done = data.status === 'COMPLETED'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <Button size="sm" variant="outline" onClick={onBack} iconRight={<ArrowLeft size={13} />}>Back</Button>
        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15 }}>
          {data.account.code} · {data.account.name}
        </span>
        {done && <Badge tone="green" dot>Reconciled</Badge>}
      </div>

      <div style={{ ...cardStyle, display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16 }} className="kad-kpi-grid">
        <Metric label="Statement closing" value={fmt(Math.round(data.endingBalance))} />
        <Metric label="Cleared balance" value={fmt(Math.round(data.clearedBalance))} />
        <Metric label="Difference" value={fmt(Math.round(data.difference))} tone={data.balanced ? 'good' : 'warn'} />
        <div style={{ display: 'flex', alignItems: 'center' }}>
          {done ? (
            <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--ke-green-700)' }}>
              <CheckCircle2 size={16} /> Complete
            </span>
          ) : (
            <Button size="sm" variant={data.balanced ? 'primary' : 'outline'} onClick={complete} disabled={busy || !data.balanced} iconRight={<Scale size={13} />}>
              {busy ? 'Finishing…' : 'Finish'}
            </Button>
          )}
        </div>
      </div>

      {!data.balanced && !done && (
        <p style={{ fontSize: 12.5, color: 'var(--ke-sun-600,#b45309)', margin: 0, fontWeight: 600 }}>
          Out by {fmt(Math.round(Math.abs(data.difference)))} — tick off the transactions that appear on the statement until this reaches zero.
        </p>
      )}
      {error && <p style={{ fontSize: 12.5, color: 'var(--color-danger)', margin: 0 }}>{error}</p>}

      <div style={{ ...cardStyle, padding: 0, overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '40px 90px 1fr 100px 100px', gap: 10, padding: '10px 18px', background: 'var(--ke-gray-50,#f5f7f5)', fontFamily: 'var(--font-mono)', fontSize: 9.5, letterSpacing: '.1em', color: 'var(--color-text-muted)' }}>
          <span>✓</span><span>DATE</span><span>DETAIL</span>
          <span style={{ textAlign: 'right' }}>IN</span>
          <span style={{ textAlign: 'right' }}>OUT</span>
        </div>
        {data.lines.length === 0 ? (
          <p style={{ fontSize: 12.5, color: 'var(--color-text-muted)', padding: 18 }}>
            No transactions on this account up to the statement date.
          </p>
        ) : (
          data.lines.map((l) => (
            <label
              key={l.id}
              style={{ display: 'grid', gridTemplateColumns: '40px 90px 1fr 100px 100px', gap: 10, alignItems: 'center', padding: '11px 18px', borderTop: '1px solid var(--color-border)', cursor: done ? 'default' : 'pointer', background: l.cleared ? 'var(--ke-green-50)' : 'transparent' }}
            >
              <input type="checkbox" checked={l.cleared} disabled={done} onChange={() => toggle(l)} />
              <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                {new Date(l.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
              </span>
              <span style={{ minWidth: 0 }}>
                <span style={{ display: 'block', fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.memo ?? '—'}</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--color-text-subtle)' }}>{l.entryNo}</span>
              </span>
              <span style={{ textAlign: 'right', fontSize: 12.5 }}>{l.debit ? fmt(Math.round(l.debit)) : ''}</span>
              <span style={{ textAlign: 'right', fontSize: 12.5, color: 'var(--color-text-muted)' }}>{l.credit ? fmt(Math.round(l.credit)) : ''}</span>
            </label>
          ))
        )}
      </div>
    </div>
  )
}

function Metric({ label, value, tone }: { label: string; value: string; tone?: 'good' | 'warn' }) {
  const color = tone === 'good' ? 'var(--ke-green-700)' : tone === 'warn' ? 'var(--ke-sun-600,#b45309)' : undefined
  return (
    <div>
      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 20, color }}>{value}</div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9.5, letterSpacing: '.1em', color: 'var(--color-text-muted)', marginTop: 5, textTransform: 'uppercase' }}>{label}</div>
    </div>
  )
}
