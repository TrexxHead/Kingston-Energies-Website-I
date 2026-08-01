'use client'

import { useCallback, useEffect, useState } from 'react'
import { BookOpen, Plus, RefreshCw, Scale, Landmark, ListTree, AlertTriangle, CheckCircle2, ChevronRight } from 'lucide-react'
import { cardStyle, h3Style } from '../ui/card'
import Badge from '../ui/Badge'
import Button from '../ui/Button'
import Modal from '../ui/Modal'
import Pill from '../ui/Pill'
import TextInput from '../ui/TextInput'
import { fmt } from '../mockData'
import OpeningBalancesCard from './OpeningBalancesCard'

type View = 'accounts' | 'journal' | 'trial' | 'balance'
type AccountType = 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE'

const VIEWS: { id: View; label: string; icon: typeof BookOpen }[] = [
  { id: 'accounts', label: 'Chart of accounts', icon: ListTree },
  { id: 'journal', label: 'Journal', icon: BookOpen },
  { id: 'trial', label: 'Trial balance', icon: Scale },
  { id: 'balance', label: 'Balance sheet', icon: Landmark },
]

const TYPE_LABEL: Record<AccountType, string> = {
  ASSET: 'Assets',
  LIABILITY: 'Liabilities',
  EQUITY: 'Equity',
  REVENUE: 'Revenue',
  EXPENSE: 'Expenses',
}
const TYPE_ORDER: AccountType[] = ['ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE']

interface LedgerAccount {
  id: string
  code: string
  name: string
  type: AccountType
  subtype: string | null
  isBank: boolean
  isSystem: boolean
  balance: number
}

interface Status {
  accounts: number
  entries: number
  orders: number
  postedOrders: number
  expenses: number
  postedExpenses: number
  upToDate: boolean
  balanced: boolean
}

/**
 * The double-entry accounting workspace. Everything here reads from the general
 * ledger, so the Trial Balance, Balance Sheet and P&L are guaranteed to agree —
 * they're all derived from the same journal lines.
 */
export default function AccountingTab() {
  const [view, setView] = useState<View>('accounts')
  const [status, setStatus] = useState<Status | null>(null)
  const [syncing, setSyncing] = useState(false)
  const [syncMsg, setSyncMsg] = useState('')

  const loadStatus = useCallback(async () => {
    const res = await fetch('/api/admin/finance/ledger/backfill')
    if (res.ok) setStatus(await res.json())
  }, [])

  useEffect(() => {
    loadStatus()
  }, [loadStatus])

  const runBackfill = async () => {
    setSyncing(true)
    setSyncMsg('')
    const res = await fetch('/api/admin/finance/ledger/backfill', { method: 'POST' })
    const data = await res.json().catch(() => ({}))
    setSyncing(false)
    if (res.ok) {
      const posted = (data.orders ?? 0) + (data.payments ?? 0) + (data.cogs ?? 0) + (data.expenses ?? 0) + (data.stockAdjustments ?? 0)
      setSyncMsg(posted === 0 ? 'Already up to date. Nothing new to post.' : `Posted ${posted} new journal entries.`)
      loadStatus()
    } else {
      setSyncMsg(data.error ?? 'Sync failed.')
    }
  }

  const unposted = status ? status.orders - status.postedOrders + (status.expenses - status.postedExpenses) : 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Ledger health */}
      <div style={{ ...cardStyle, display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 220 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {status && status.balanced ? (
              <CheckCircle2 size={16} color="var(--ke-green-600)" />
            ) : (
              <AlertTriangle size={16} color="var(--ke-sun-500)" />
            )}
            <h3 style={{ ...h3Style, margin: 0 }}>General ledger</h3>
          </div>
          <p style={{ fontSize: 12.5, color: 'var(--color-text-muted)', margin: '6px 0 0' }}>
            {status
              ? `${status.entries} journal entries across ${status.accounts} accounts. ${
                  status.balanced ? 'Debits equal credits.' : 'Out of balance. Review the trial balance.'
                }`
              : 'Loading…'}
          </p>
          {status && unposted > 0 && (
            <p style={{ fontSize: 12.5, color: 'var(--ke-sun-600, #b45309)', margin: '6px 0 0', fontWeight: 600 }}>
              {unposted} operational record{unposted === 1 ? '' : 's'} not yet journalled. Run Sync to bring the books current.
            </p>
          )}
          {syncMsg && <p style={{ fontSize: 12.5, color: 'var(--color-text-muted)', margin: '6px 0 0' }}>{syncMsg}</p>}
        </div>
        <Button size="sm" variant={unposted > 0 ? 'primary' : 'outline'} onClick={runBackfill} disabled={syncing} iconRight={<RefreshCw size={14} />}>
          {syncing ? 'Syncing…' : 'Sync ledger'}
        </Button>
      </div>

      <OpeningBalancesCard onDone={loadStatus} />

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {VIEWS.map((v) => (
          <Pill key={v.id} label={v.label} selected={view === v.id} onClick={() => setView(v.id)} />
        ))}
      </div>

      {view === 'accounts' && <ChartOfAccounts onChanged={loadStatus} />}
      {view === 'journal' && <Journal />}
      {view === 'trial' && <TrialBalance />}
      {view === 'balance' && <BalanceSheet />}
    </div>
  )
}

// ---------------------------------------------------------------------------

function ChartOfAccounts({ onChanged }: { onChanged: () => void }) {
  const [accounts, setAccounts] = useState<LedgerAccount[] | null>(null)
  const [addOpen, setAddOpen] = useState(false)
  const [form, setForm] = useState({ code: '', name: '', type: 'EXPENSE', subtype: '' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [openAccount, setOpenAccount] = useState<LedgerAccount | null>(null)

  const load = useCallback(async () => {
    const res = await fetch('/api/admin/finance/ledger/accounts')
    if (res.ok) setAccounts((await res.json()).accounts)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const create = async () => {
    setError('')
    if (!form.code.trim() || !form.name.trim()) return setError('Enter a code and a name.')
    setBusy(true)
    const res = await fetch('/api/admin/finance/ledger/accounts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, subtype: form.subtype || null }),
    })
    const data = await res.json().catch(() => ({}))
    setBusy(false)
    if (!res.ok) return setError(data.error ?? 'Could not create that account.')
    setAddOpen(false)
    setForm({ code: '', name: '', type: 'EXPENSE', subtype: '' })
    load()
    onChanged()
  }

  return (
    <>
      <div style={{ ...cardStyle, padding: 0, overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', gap: 12, flexWrap: 'wrap' }}>
          <div>
            <h3 style={{ ...h3Style, margin: 0 }}>Chart of accounts</h3>
            <p style={{ fontSize: 12, color: 'var(--color-text-muted)', margin: '4px 0 0' }}>
              Balances shown in each account&apos;s natural direction. System accounts are used by automatic posting.
            </p>
          </div>
          <Button size="sm" variant="primary" onClick={() => setAddOpen(true)} iconRight={<Plus size={14} />}>Add account</Button>
        </div>

        {!accounts ? (
          <p style={{ fontSize: 13, color: 'var(--color-text-muted)', padding: '0 18px 18px' }}>Loading…</p>
        ) : (
          TYPE_ORDER.map((type) => {
            const rows = accounts.filter((a) => a.type === type)
            if (rows.length === 0) return null
            const subtotal = rows.reduce((s, r) => s + r.balance, 0)
            return (
              <div key={type}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 18px', background: 'var(--ke-gray-50,#f5f7f5)', borderTop: '1px solid var(--color-border)' }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '.12em', color: 'var(--color-text-muted)' }}>
                    {TYPE_LABEL[type].toUpperCase()}
                  </span>
                  <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 12 }}>{fmt(Math.round(subtotal))}</span>
                </div>
                {rows.map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => setOpenAccount(a)}
                    style={{
                      display: 'grid', gridTemplateColumns: '70px 1fr auto 20px', gap: 12, alignItems: 'center', width: '100%',
                      padding: '11px 18px', borderTop: '1px solid var(--color-border)', background: 'transparent',
                      border: 'none', borderTopStyle: 'solid', cursor: 'pointer', textAlign: 'left',
                    }}
                  >
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--color-text-muted)' }}>{a.code}</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                      <span style={{ fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.name}</span>
                      {a.isBank && <Badge tone="blue">Bank</Badge>}
                      {a.isSystem && <Badge tone="grey">System</Badge>}
                    </span>
                    <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13, whiteSpace: 'nowrap' }}>{fmt(Math.round(a.balance))}</span>
                    <ChevronRight size={14} color="var(--color-text-subtle)" />
                  </button>
                ))}
              </div>
            )
          })
        )}
      </div>

      {addOpen && (
        <Modal
          title="Add a ledger account"
          onClose={() => { setAddOpen(false); setError('') }}
          footer={
            <>
              <Button size="sm" variant="outline" onClick={() => { setAddOpen(false); setError('') }}>Cancel</Button>
              <Button size="sm" variant="primary" onClick={create} disabled={busy}>{busy ? 'Creating…' : 'Create'}</Button>
            </>
          }
        >
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 10 }}>
            <TextInput label="Code" value={form.code} onChange={(v) => setForm({ ...form, code: v })} placeholder="6800" />
            <TextInput label="Name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} placeholder="Vehicle expenses" />
          </div>
          <TextInput label="Type" value={form.type} onChange={(v) => setForm({ ...form, type: v })} options={TYPE_ORDER} />
          <TextInput label="Subtype (optional)" value={form.subtype} onChange={(v) => setForm({ ...form, subtype: v })} placeholder="Operating expense" />
          <p style={{ fontSize: 11.5, color: 'var(--color-text-subtle)', marginTop: 4 }}>
            Codes are conventionally 1000s assets, 2000s liabilities, 3000s equity, 4000s revenue, 5000s cost of sales, 6000s expenses.
          </p>
          {error && <p style={{ fontSize: 12.5, color: 'var(--color-danger)', marginTop: 8 }}>{error}</p>}
        </Modal>
      )}

      {openAccount && <AccountLedgerModal account={openAccount} onClose={() => setOpenAccount(null)} />}
    </>
  )
}

// ---------------------------------------------------------------------------

interface LedgerRow {
  id: string
  entryNo: string
  date: string
  memo: string | null
  source: string
  debit: number
  credit: number
  balance: number
}

function AccountLedgerModal({ account, onClose }: { account: LedgerAccount; onClose: () => void }) {
  const [data, setData] = useState<{ openingBalance: number; closingBalance: number; rows: LedgerRow[] } | null>(null)

  useEffect(() => {
    fetch(`/api/admin/finance/ledger/accounts/${account.id}`)
      .then((r) => (r.ok ? r.json() : null))
      .then(setData)
      .catch(() => {})
  }, [account.id])

  return (
    <Modal title={`${account.code} · ${account.name}`} onClose={onClose}>
      {!data ? (
        <p style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>Loading…</p>
      ) : data.rows.length === 0 ? (
        <p style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>No postings to this account yet.</p>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr 80px 80px 90px', gap: 8, padding: '8px 0', fontFamily: 'var(--font-mono)', fontSize: 9.5, letterSpacing: '.1em', color: 'var(--color-text-muted)', borderBottom: '1px solid var(--color-border)' }}>
            <span>DATE</span><span>DETAIL</span>
            <span style={{ textAlign: 'right' }}>DEBIT</span>
            <span style={{ textAlign: 'right' }}>CREDIT</span>
            <span style={{ textAlign: 'right' }}>BALANCE</span>
          </div>
          <div style={{ maxHeight: 380, overflowY: 'auto' }}>
            {data.rows.map((r) => (
              <div key={r.id} style={{ display: 'grid', gridTemplateColumns: '80px 1fr 80px 80px 90px', gap: 8, padding: '9px 0', borderBottom: '1px solid var(--color-border)', fontSize: 12.5, alignItems: 'baseline' }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-text-muted)' }}>
                  {new Date(r.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                </span>
                <span style={{ minWidth: 0 }}>
                  <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.memo ?? 'N/A'}</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--color-text-subtle)' }}>{r.entryNo}</span>
                </span>
                <span style={{ textAlign: 'right' }}>{r.debit ? fmt(Math.round(r.debit)) : ''}</span>
                <span style={{ textAlign: 'right' }}>{r.credit ? fmt(Math.round(r.credit)) : ''}</span>
                <span style={{ textAlign: 'right', fontWeight: 600 }}>{fmt(Math.round(r.balance))}</span>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 12, fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14 }}>
            <span>Closing balance</span>
            <span>{fmt(Math.round(data.closingBalance))}</span>
          </div>
        </>
      )}
    </Modal>
  )
}

// ---------------------------------------------------------------------------

interface JournalEntryRow {
  id: string
  entryNo: string
  date: string
  memo: string | null
  source: string
  totalDebit: number
  lines: { id: string; code: string; name: string; debit: number; credit: number }[]
}

const SOURCE_LABEL: Record<string, string> = {
  ORDER: 'Order', PAYMENT: 'Payment', EXPENSE: 'Expense', COGS: 'Cost of sales',
  STOCK_ADJUSTMENT: 'Stock', MANUAL: 'Manual', OPENING: 'Opening',
}

function Journal() {
  const [entries, setEntries] = useState<JournalEntryRow[] | null>(null)
  const [total, setTotal] = useState(0)
  const [offset, setOffset] = useState(0)
  const [expanded, setExpanded] = useState<string | null>(null)
  const PAGE = 25

  const load = useCallback(async (off: number) => {
    setEntries(null)
    const res = await fetch(`/api/admin/finance/ledger/journal?offset=${off}&pageSize=${PAGE}`)
    if (res.ok) {
      const d = await res.json()
      setEntries(d.entries)
      setTotal(d.total)
    }
  }, [])

  useEffect(() => {
    load(offset)
  }, [offset, load])

  return (
    <div style={{ ...cardStyle, padding: 0, overflow: 'hidden' }}>
      <div style={{ padding: '14px 18px' }}>
        <h3 style={{ ...h3Style, margin: 0 }}>Journal</h3>
        <p style={{ fontSize: 12, color: 'var(--color-text-muted)', margin: '4px 0 0' }}>
          Every posting, newest first. {total} entries. Click one to see its debits and credits.
        </p>
      </div>

      {!entries ? (
        <p style={{ fontSize: 13, color: 'var(--color-text-muted)', padding: '0 18px 18px' }}>Loading…</p>
      ) : entries.length === 0 ? (
        <p style={{ fontSize: 13, color: 'var(--color-text-muted)', padding: '0 18px 18px' }}>
          Nothing posted yet. Run Sync ledger above to journal your existing orders and expenses.
        </p>
      ) : (
        <>
          {entries.map((e) => (
            <div key={e.id} style={{ borderTop: '1px solid var(--color-border)' }}>
              <button
                type="button"
                onClick={() => setExpanded(expanded === e.id ? null : e.id)}
                style={{ display: 'grid', gridTemplateColumns: '90px 90px 1fr auto', gap: 12, alignItems: 'center', width: '100%', padding: '11px 18px', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left' }}
              >
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-text-muted)' }}>{e.entryNo}</span>
                <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                  {new Date(e.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' })}
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                  <Badge tone="grey">{SOURCE_LABEL[e.source] ?? e.source}</Badge>
                  <span style={{ fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.memo ?? 'N/A'}</span>
                </span>
                <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13 }}>{fmt(Math.round(e.totalDebit))}</span>
              </button>
              {expanded === e.id && (
                <div style={{ padding: '0 18px 14px 18px', background: 'var(--ke-gray-50,#fafafa)' }}>
                  {e.lines.map((l) => (
                    <div key={l.id} style={{ display: 'grid', gridTemplateColumns: '70px 1fr 90px 90px', gap: 10, padding: '6px 0', fontSize: 12.5 }}>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-text-muted)' }}>{l.code}</span>
                      <span>{l.name}</span>
                      <span style={{ textAlign: 'right' }}>{l.debit ? fmt(Math.round(l.debit)) : ''}</span>
                      <span style={{ textAlign: 'right', color: 'var(--color-text-muted)' }}>{l.credit ? fmt(Math.round(l.credit)) : ''}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
          {total > PAGE && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 18px', borderTop: '1px solid var(--color-border)' }}>
              <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                {offset + 1}–{Math.min(offset + PAGE, total)} of {total}
              </span>
              <div style={{ display: 'flex', gap: 8 }}>
                <Button size="sm" variant="outline" onClick={() => setOffset(Math.max(0, offset - PAGE))} disabled={offset === 0}>Previous</Button>
                <Button size="sm" variant="outline" onClick={() => setOffset(offset + PAGE)} disabled={offset + PAGE >= total}>Next</Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------

/** Trial-balance rows carry raw debit/credit totals, not just a net balance. */
interface TrialRow extends LedgerAccount {
  debit: number
  credit: number
}

function TrialBalance() {
  const [data, setData] = useState<{ rows: TrialRow[]; totalDebit: number; totalCredit: number; balanced: boolean } | null>(null)
  const [period, setPeriod] = useState('all')

  useEffect(() => {
    fetch(`/api/admin/finance/ledger/reports?report=trial-balance&period=${period}`)
      .then((r) => (r.ok ? r.json() : null))
      .then(setData)
      .catch(() => {})
  }, [period])

  return (
    <div style={{ ...cardStyle, padding: 0, overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h3 style={{ ...h3Style, margin: 0 }}>Trial balance</h3>
          <p style={{ fontSize: 12, color: 'var(--color-text-muted)', margin: '4px 0 0' }}>Proof the books balance: total debits must equal total credits.</p>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {['month', 'quarter', 'year', 'all'].map((p) => (
            <Pill key={p} label={p === 'all' ? 'All time' : `This ${p}`} selected={period === p} onClick={() => setPeriod(p)} />
          ))}
        </div>
      </div>

      {!data ? (
        <p style={{ fontSize: 13, color: 'var(--color-text-muted)', padding: '0 18px 18px' }}>Loading…</p>
      ) : data.rows.length === 0 ? (
        <p style={{ fontSize: 13, color: 'var(--color-text-muted)', padding: '0 18px 18px' }}>No postings in this period.</p>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '70px 1fr 110px 110px', gap: 10, padding: '9px 18px', background: 'var(--ke-gray-50,#f5f7f5)', borderTop: '1px solid var(--color-border)', fontFamily: 'var(--font-mono)', fontSize: 9.5, letterSpacing: '.1em', color: 'var(--color-text-muted)' }}>
            <span>CODE</span><span>ACCOUNT</span>
            <span style={{ textAlign: 'right' }}>DEBIT</span>
            <span style={{ textAlign: 'right' }}>CREDIT</span>
          </div>
          {data.rows.map((r) => (
            <div key={r.id} style={{ display: 'grid', gridTemplateColumns: '70px 1fr 110px 110px', gap: 10, padding: '10px 18px', borderTop: '1px solid var(--color-border)', fontSize: 13 }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--color-text-muted)' }}>{r.code}</span>
              <span>{r.name}</span>
              <span style={{ textAlign: 'right' }}>{r.debit ? fmt(Math.round(r.debit)) : ''}</span>
              <span style={{ textAlign: 'right' }}>{r.credit ? fmt(Math.round(r.credit)) : ''}</span>
            </div>
          ))}
          <div style={{ display: 'grid', gridTemplateColumns: '70px 1fr 110px 110px', gap: 10, padding: '13px 18px', borderTop: '2px solid var(--color-border-strong,#c9d2cb)', fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 13.5 }}>
            <span />
            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              Total
              {data.balanced ? <Badge tone="green" dot>Balanced</Badge> : <Badge tone="orange" dot>Out of balance</Badge>}
            </span>
            <span style={{ textAlign: 'right' }}>{fmt(Math.round(data.totalDebit))}</span>
            <span style={{ textAlign: 'right' }}>{fmt(Math.round(data.totalCredit))}</span>
          </div>
        </>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------

interface BalanceSheetData {
  assets: LedgerAccount[]
  liabilities: LedgerAccount[]
  equityAccounts: LedgerAccount[]
  currentEarnings: number
  totalAssets: number
  totalLiabilities: number
  totalEquity: number
  outOfBalance: number
  workingCapital: number
  currentRatio: number | null
}

function BalanceSheet() {
  const [data, setData] = useState<BalanceSheetData | null>(null)

  useEffect(() => {
    fetch('/api/admin/finance/ledger/reports?report=balance-sheet')
      .then((r) => (r.ok ? r.json() : null))
      .then(setData)
      .catch(() => {})
  }, [])

  if (!data) return <div style={cardStyle}><p style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>Loading…</p></div>

  const Section = ({ title, rows, total }: { title: string; rows: LedgerAccount[]; total: number }) => (
    <div style={{ marginBottom: 18 }}>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '.12em', color: 'var(--color-text-muted)', marginBottom: 8 }}>{title.toUpperCase()}</div>
      {rows.length === 0 && <p style={{ fontSize: 12.5, color: 'var(--color-text-subtle)', margin: 0 }}>None</p>}
      {rows.map((r) => (
        <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', fontSize: 13 }}>
          <span style={{ color: 'var(--color-text-muted)' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, marginRight: 8 }}>{r.code}</span>
            {r.name}
          </span>
          <span>{fmt(Math.round(r.balance))}</span>
        </div>
      ))}
      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0 0', marginTop: 4, borderTop: '1px solid var(--color-border)', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13.5 }}>
        <span>Total {title.toLowerCase()}</span>
        <span>{fmt(Math.round(total))}</span>
      </div>
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14 }} className="kad-kpi-grid">
        <Stat label="Total assets" value={fmt(Math.round(data.totalAssets))} />
        <Stat label="Working capital" value={fmt(Math.round(data.workingCapital))} />
        <Stat label="Current ratio" value={data.currentRatio != null ? `${data.currentRatio}` : 'N/A'} />
      </div>

      <div style={{ ...cardStyle }}>
        <h3 style={h3Style}>Balance sheet</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 28 }} className="kad-two-col">
          <div>
            <Section title="Assets" rows={data.assets} total={data.totalAssets} />
          </div>
          <div>
            <Section title="Liabilities" rows={data.liabilities} total={data.totalLiabilities} />
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '.12em', color: 'var(--color-text-muted)', marginBottom: 8 }}>EQUITY</div>
            {data.equityAccounts.map((r) => (
              <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', fontSize: 13 }}>
                <span style={{ color: 'var(--color-text-muted)' }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, marginRight: 8 }}>{r.code}</span>
                  {r.name}
                </span>
                <span>{fmt(Math.round(r.balance))}</span>
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', fontSize: 13 }}>
              <span style={{ color: 'var(--color-text-muted)' }}>Current period earnings</span>
              <span>{fmt(Math.round(data.currentEarnings))}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0 0', marginTop: 4, borderTop: '1px solid var(--color-border)', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13.5 }}>
              <span>Total equity</span>
              <span>{fmt(Math.round(data.totalEquity))}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0 0', marginTop: 10, borderTop: '2px solid var(--color-border-strong,#c9d2cb)', fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 14 }}>
              <span>Liabilities + equity</span>
              <span>{fmt(Math.round(data.totalLiabilities + data.totalEquity))}</span>
            </div>
          </div>
        </div>

        {Math.abs(data.outOfBalance) >= 1 && (
          <p style={{ fontSize: 12.5, color: 'var(--ke-sun-600,#b45309)', fontWeight: 600, marginTop: 14 }}>
            Out of balance by {fmt(Math.round(data.outOfBalance))}. Check the trial balance for an unbalanced entry.
          </p>
        )}
      </div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ ...cardStyle, borderRadius: 14, padding: 16 }}>
      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 22, letterSpacing: '-.01em' }}>{value}</div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9.5, letterSpacing: '.1em', color: 'var(--color-text-muted)', marginTop: 6, textTransform: 'uppercase' }}>{label}</div>
    </div>
  )
}
