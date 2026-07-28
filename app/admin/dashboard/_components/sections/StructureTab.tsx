'use client'

import { useCallback, useEffect, useState } from 'react'
import { Building, Coins, Plus, AlertTriangle } from 'lucide-react'
import { cardStyle, h3Style } from '../ui/card'
import Badge from '../ui/Badge'
import Button from '../ui/Button'
import Modal from '../ui/Modal'
import Pill from '../ui/Pill'
import TextInput from '../ui/TextInput'

type View = 'branches' | 'currencies'

/**
 * Branches and currency.
 *
 * Both are foundations rather than features: a branch is a filter on the one
 * ledger, and a currency rate is something a person records so a foreign
 * transaction can be converted once, traceably, into JMD.
 */
export default function StructureTab() {
  const [view, setView] = useState<View>('branches')
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <Pill label="Branches" selected={view === 'branches'} onClick={() => setView('branches')} />
        <Pill label="Currency rates" selected={view === 'currencies'} onClick={() => setView('currencies')} />
      </div>
      {view === 'branches' ? <Branches /> : <Currencies />}
    </div>
  )
}

function Empty({ children }: { children: React.ReactNode }) {
  return <div style={{ padding: 28, textAlign: 'center', color: 'var(--color-text-muted)', fontSize: 13.5, lineHeight: 1.6 }}>{children}</div>
}

const th: React.CSSProperties = {
  textAlign: 'left',
  fontFamily: 'var(--font-mono)',
  fontSize: 9.5,
  letterSpacing: '.1em',
  textTransform: 'uppercase',
  color: 'var(--color-text-muted)',
  padding: '8px 10px',
  borderBottom: '1px solid var(--color-border)',
  whiteSpace: 'nowrap',
}
const td: React.CSSProperties = { padding: '10px', borderBottom: '1px solid var(--color-border)', fontSize: 13.5 }
const tdNum: React.CSSProperties = { ...td, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }

// ---------------------------------------------------------------------------

interface BranchRow {
  id: string
  code: string
  name: string
  isDefault: boolean
  archived: boolean
  entryCount: number
}

function Branches() {
  const [data, setData] = useState<{ branches: BranchRow[]; unassignedEntries: number } | null>(null)
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ code: '', name: '', isDefault: false })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    const res = await fetch('/api/admin/finance/branches')
    if (res.ok) setData(await res.json())
  }, [])
  useEffect(() => {
    load()
  }, [load])

  const create = async () => {
    setError('')
    if (!form.code.trim() || !form.name.trim()) return setError('Enter a code and a name.')
    setBusy(true)
    const res = await fetch('/api/admin/finance/branches', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    setBusy(false)
    if (!res.ok) return setError((await res.json().catch(() => ({}))).error || 'Could not add this branch.')
    setOpen(false)
    setForm({ code: '', name: '', isDefault: false })
    load()
  }

  const update = async (id: string, changes: Record<string, unknown>) => {
    await fetch('/api/admin/finance/branches', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...changes }),
    })
    load()
  }

  if (!data) return <Empty>Loading…</Empty>

  const assigned = data.branches.reduce((s, b) => s + b.entryCount, 0)
  const total = assigned + data.unassignedEntries
  // Per-branch reporting is only worth reading when most of the ledger is
  // actually attributed, so say where things stand rather than letting a
  // half-tagged ledger look complete.
  const coverage = total > 0 ? Math.round((assigned / total) * 100) : 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {data.branches.length > 0 && coverage < 80 && (
        <div
          style={{
            ...cardStyle,
            borderRadius: 14,
            padding: '12px 14px',
            display: 'flex',
            gap: 10,
            alignItems: 'flex-start',
            borderColor: 'var(--ke-sun-300,#fcd34d)',
            background: 'var(--ke-sun-50,#fffbeb)',
          }}
        >
          <AlertTriangle size={16} style={{ color: 'var(--ke-sun-600,#b45309)', flexShrink: 0, marginTop: 2 }} />
          <div style={{ fontSize: 13, lineHeight: 1.55 }}>
            Only {coverage}% of journal entries are attributed to a branch, so per-branch figures will be missing most
            of the business. Group totals are unaffected — they always cover everything.
          </div>
        </div>
      )}

      <div style={cardStyle}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
          <h3 style={{ ...h3Style, margin: 0 }}>Branches</h3>
          <Button size="sm" onClick={() => setOpen(true)} iconRight={<Plus size={14} />}>
            Add branch
          </Button>
        </div>
        <p style={{ fontSize: 13, color: 'var(--color-text-muted)', margin: '0 0 12px', lineHeight: 1.55 }}>
          A branch is a label on entries in the one ledger, not a second set of books — so reports can be filtered by
          location while the group figures still add up.
        </p>

        {data.branches.length === 0 ? (
          <Empty>
            No branches yet. Add one only when you actually need to see a location separately; until then everything
            reports as a single business, which is simpler and just as correct.
          </Empty>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 520 }}>
              <thead>
                <tr>
                  <th style={th}>Code</th>
                  <th style={th}>Name</th>
                  <th style={{ ...th, textAlign: 'right' }}>Entries</th>
                  <th style={th} />
                </tr>
              </thead>
              <tbody>
                {data.branches.map((b) => (
                  <tr key={b.id} style={{ opacity: b.archived ? 0.55 : 1 }}>
                    <td style={{ ...td, fontFamily: 'var(--font-mono)', fontSize: 12.5 }}>{b.code}</td>
                    <td style={td}>
                      {b.name} {b.isDefault && <Badge tone="green">Default</Badge>}
                      {b.archived && <Badge tone="neutral">Archived</Badge>}
                    </td>
                    <td style={tdNum}>{b.entryCount}</td>
                    <td style={{ ...td, textAlign: 'right', whiteSpace: 'nowrap' }}>
                      {!b.isDefault && !b.archived && (
                        <Button size="sm" variant="outline" onClick={() => update(b.id, { isDefault: true })}>
                          Make default
                        </Button>
                      )}{' '}
                      <Button size="sm" variant="outline" onClick={() => update(b.id, { archived: !b.archived })}>
                        {b.archived ? 'Restore' : 'Archive'}
                      </Button>
                    </td>
                  </tr>
                ))}
                {data.unassignedEntries > 0 && (
                  <tr>
                    <td style={{ ...td, color: 'var(--color-text-muted)' }}>—</td>
                    <td style={{ ...td, color: 'var(--color-text-muted)' }}>Unassigned</td>
                    <td style={{ ...tdNum, color: 'var(--color-text-muted)' }}>{data.unassignedEntries}</td>
                    <td style={td} />
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {open && (
        <Modal onClose={() => setOpen(false)} title="Add branch">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <TextInput label="Code" value={form.code} onChange={(v) => setForm({ ...form, code: v })} placeholder="KGN" />
            <TextInput label="Name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} placeholder="Kingston" />
            <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13.5 }}>
              <input type="checkbox" checked={form.isDefault} onChange={(e) => setForm({ ...form, isDefault: e.target.checked })} />
              Use as the default for new entries
            </label>
            {error && <div style={{ color: 'var(--color-danger,#dc2626)', fontSize: 13 }}>{error}</div>}
            <Button onClick={create} disabled={busy}>
              {busy ? 'Adding…' : 'Add branch'}
            </Button>
          </div>
        </Modal>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------

interface CurrencyRow {
  currency: string
  rate: number | null
  asOf: string | null
  source: string | null
  ageDays: number | null
  stale: boolean
  usable: boolean
}

interface CurrencyData {
  functionalCurrency: string
  maxRateAgeDays: number
  currencies: CurrencyRow[]
  history: { id: string; currency: string; rate: number; asOf: string; source: string | null; enteredBy: string | null }[]
}

const day = (iso: string) => new Date(iso).toLocaleDateString('en-JM', { day: 'numeric', month: 'short', year: 'numeric' })

function Currencies() {
  const [data, setData] = useState<CurrencyData | null>(null)
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ currency: 'USD', rate: '', asOf: '', source: '' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    const res = await fetch('/api/admin/finance/currencies')
    if (res.ok) setData(await res.json())
  }, [])
  useEffect(() => {
    load()
  }, [load])

  const save = async () => {
    setError('')
    if (!Number(form.rate)) return setError('Enter the rate.')
    if (!form.asOf) return setError('Enter the date this rate applies from.')
    setBusy(true)
    const res = await fetch('/api/admin/finance/currencies', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, rate: Number(form.rate) }),
    })
    setBusy(false)
    if (!res.ok) return setError((await res.json().catch(() => ({}))).error || 'Could not save that rate.')
    setOpen(false)
    setForm({ currency: 'USD', rate: '', asOf: '', source: '' })
    load()
  }

  if (!data) return <Empty>Loading…</Empty>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={cardStyle}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
          <h3 style={{ ...h3Style, margin: 0 }}>Exchange rates</h3>
          <Button size="sm" onClick={() => setOpen(true)} iconRight={<Plus size={14} />}>
            Record rate
          </Button>
        </div>
        <p style={{ fontSize: 13, color: 'var(--color-text-muted)', margin: '0 0 12px', lineHeight: 1.55 }}>
          The books are kept in {data.functionalCurrency}. A foreign transaction is converted once, at a rate you
          entered, and the entry records both. Nothing fetches a rate automatically, and a rate older than{' '}
          {data.maxRateAgeDays} days stops being usable rather than quietly producing a wrong number.
        </p>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 520 }}>
            <thead>
              <tr>
                <th style={th}>Currency</th>
                <th style={{ ...th, textAlign: 'right' }}>Rate to {data.functionalCurrency}</th>
                <th style={th}>As of</th>
                <th style={th}>Source</th>
                <th style={th}>Status</th>
              </tr>
            </thead>
            <tbody>
              {data.currencies.map((c) => (
                <tr key={c.currency}>
                  <td style={{ ...td, fontFamily: 'var(--font-mono)', fontSize: 12.5 }}>{c.currency}</td>
                  <td style={tdNum}>{c.rate != null ? c.rate.toFixed(4) : '—'}</td>
                  <td style={{ ...td, color: 'var(--color-text-muted)' }}>{c.asOf ? day(c.asOf) : '—'}</td>
                  <td style={{ ...td, color: 'var(--color-text-muted)' }}>{c.source || '—'}</td>
                  <td style={td}>
                    {c.rate == null ? (
                      <Badge tone="neutral">No rate</Badge>
                    ) : c.stale ? (
                      <Badge tone="orange">Too old to use</Badge>
                    ) : (
                      <Badge tone="green">Usable</Badge>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {data.history.length > 0 && (
        <div style={cardStyle}>
          <h3 style={{ ...h3Style, margin: '0 0 12px' }}>Rate history</h3>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 520 }}>
              <thead>
                <tr>
                  <th style={th}>Date</th>
                  <th style={th}>Currency</th>
                  <th style={{ ...th, textAlign: 'right' }}>Rate</th>
                  <th style={th}>Source</th>
                  <th style={th}>Entered by</th>
                </tr>
              </thead>
              <tbody>
                {data.history.map((h) => (
                  <tr key={h.id}>
                    <td style={{ ...td, whiteSpace: 'nowrap' }}>{day(h.asOf)}</td>
                    <td style={{ ...td, fontFamily: 'var(--font-mono)', fontSize: 12.5 }}>{h.currency}</td>
                    <td style={tdNum}>{h.rate.toFixed(4)}</td>
                    <td style={{ ...td, color: 'var(--color-text-muted)' }}>{h.source || '—'}</td>
                    <td style={{ ...td, color: 'var(--color-text-muted)' }}>{h.enteredBy || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {open && (
        <Modal onClose={() => setOpen(false)} title="Record exchange rate">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <TextInput
              label="Currency"
              value={form.currency}
              options={data.currencies.map((c) => c.currency)}
              onChange={(v) => setForm({ ...form, currency: v })}
            />
            <TextInput
              label={`How many ${data.functionalCurrency} one unit buys`}
              value={form.rate}
              onChange={(v) => setForm({ ...form, rate: v })}
              placeholder="158.4200"
            />
            <TextInput label="Applies from" type="date" value={form.asOf} onChange={(v) => setForm({ ...form, asOf: v })} />
            <TextInput label="Source" value={form.source} onChange={(v) => setForm({ ...form, source: v })} placeholder="BOJ selling rate" />
            <p style={{ fontSize: 12.5, color: 'var(--color-text-muted)', margin: 0, lineHeight: 1.5 }}>
              The source matters: &ldquo;which rate did you use&rdquo; is the first question asked about a foreign
              transaction, and this is where the answer lives.
            </p>
            {error && <div style={{ color: 'var(--color-danger,#dc2626)', fontSize: 13 }}>{error}</div>}
            <Button onClick={save} disabled={busy}>
              {busy ? 'Saving…' : 'Record rate'}
            </Button>
          </div>
        </Modal>
      )}
    </div>
  )
}
