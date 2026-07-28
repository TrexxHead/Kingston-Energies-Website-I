'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Upload, Plus, Landmark, Link2, Ban, ArrowLeft, Info } from 'lucide-react'
import { cardStyle, h3Style } from '../ui/card'
import Badge from '../ui/Badge'
import Button from '../ui/Button'
import Modal from '../ui/Modal'
import TextInput from '../ui/TextInput'
import { fmt } from '../mockData'

/**
 * Bank feeds: import what the bank says happened, then decide what each line
 * means.
 *
 * Statement lines never post on their own. They sit as the bank's version of
 * events until someone matches them to an existing entry, categorises them into
 * a new one, or excludes them — which is what makes the reconciliation
 * afterwards worth anything.
 */
export default function BankFeedsTab() {
  const [openId, setOpenId] = useState<string | null>(null)
  return openId ? <Lines connectionId={openId} onBack={() => setOpenId(null)} /> : <Connections onOpen={setOpenId} />
}

const d = (iso: string) => new Date(iso).toLocaleDateString('en-JM', { day: 'numeric', month: 'short', year: 'numeric' })

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
const td: React.CSSProperties = { padding: '10px', borderBottom: '1px solid var(--color-border)', fontSize: 13.5, verticalAlign: 'top' }
const tdNum: React.CSSProperties = { ...td, textAlign: 'right', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }

function Empty({ children }: { children: React.ReactNode }) {
  return <div style={{ padding: 28, textAlign: 'center', color: 'var(--color-text-muted)', fontSize: 13.5, lineHeight: 1.6 }}>{children}</div>
}

// ---------------------------------------------------------------------------

interface Connection {
  id: string
  name: string
  institution: string | null
  maskedNumber: string | null
  provider: string
  status: string
  currency: string
  accountCode: string
  accountName: string
  lastImportAt: string | null
  lineCount: number
  unmatched: number
}

interface ConnectionsData {
  connections: Connection[]
  accounts: { id: string; code: string; name: string }[]
  liveFeed: { available: boolean; providers: string[]; message: string }
}

function Connections({ onOpen }: { onOpen: (id: string) => void }) {
  const [data, setData] = useState<ConnectionsData | null>(null)
  const [addOpen, setAddOpen] = useState(false)
  const [form, setForm] = useState({ name: '', institution: '', maskedNumber: '', accountId: '' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [importFor, setImportFor] = useState<Connection | null>(null)

  const load = useCallback(async () => {
    const res = await fetch('/api/admin/finance/banking/connections')
    if (res.ok) setData(await res.json())
  }, [])
  useEffect(() => {
    load()
  }, [load])

  const create = async () => {
    setError('')
    if (!form.name.trim()) return setError('Give the account a name you will recognise.')
    const accountId = form.accountId || data?.accounts[0]?.id
    if (!accountId) return setError('There is no bank account in the chart of accounts to attach this to.')
    setBusy(true)
    const res = await fetch('/api/admin/finance/banking/connections', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, accountId, currency: 'JMD' }),
    })
    setBusy(false)
    if (!res.ok) return setError((await res.json().catch(() => ({}))).error || 'Could not add this account.')
    setAddOpen(false)
    setForm({ name: '', institution: '', maskedNumber: '', accountId: '' })
    load()
  }

  if (!data) return <Empty>Loading…</Empty>

  const accountLabel = (id: string) => {
    const a = data.accounts.find((x) => x.id === id)
    return a ? `${a.code} · ${a.name}` : ''
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {!data.liveFeed.available && (
        <div
          style={{
            ...cardStyle,
            borderRadius: 14,
            padding: '12px 14px',
            display: 'flex',
            gap: 10,
            alignItems: 'flex-start',
          }}
        >
          <Info size={16} style={{ color: 'var(--color-text-muted)', flexShrink: 0, marginTop: 2 }} />
          <div style={{ fontSize: 13, lineHeight: 1.55, color: 'var(--color-text-muted)' }}>{data.liveFeed.message}</div>
        </div>
      )}

      <div style={cardStyle}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <h3 style={{ ...h3Style, margin: 0 }}>Bank accounts</h3>
          <Button size="sm" onClick={() => setAddOpen(true)} iconRight={<Plus size={14} />}>
            Add account
          </Button>
        </div>

        {data.connections.length === 0 ? (
          <Empty>
            No bank accounts set up yet. Add one, then import a CSV or OFX statement from your online banking — every
            line lands here waiting to be matched against the books.
          </Empty>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {data.connections.map((c) => (
              <div
                key={c.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12,
                  padding: '12px 14px',
                  border: '1px solid var(--color-border)',
                  borderRadius: 14,
                  flexWrap: 'wrap',
                }}
              >
                <div style={{ display: 'flex', gap: 12, alignItems: 'center', minWidth: 0 }}>
                  <Landmark size={18} style={{ color: 'var(--color-text-muted)', flexShrink: 0 }} />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 600 }}>
                      {c.name}
                      {c.maskedNumber && <span style={{ color: 'var(--color-text-muted)', fontWeight: 400 }}> ····{c.maskedNumber}</span>}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                      {c.institution ? `${c.institution} · ` : ''}
                      {c.accountCode} {c.accountName} ·{' '}
                      {c.lastImportAt ? `last import ${d(c.lastImportAt)}` : 'nothing imported yet'}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  {c.unmatched > 0 ? (
                    <Badge tone="orange">{c.unmatched} to review</Badge>
                  ) : c.lineCount > 0 ? (
                    <Badge tone="green">All reviewed</Badge>
                  ) : null}
                  <Button size="sm" variant="outline" onClick={() => setImportFor(c)} iconRight={<Upload size={13} />}>
                    Import
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => onOpen(c.id)}>
                    Review {c.lineCount > 0 ? `(${c.lineCount})` : ''}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {addOpen && (
        <Modal onClose={() => setAddOpen(false)} title="Add bank account">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <TextInput label="Account name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} placeholder="NCB Business Chequing" />
            <TextInput label="Bank" value={form.institution} onChange={(v) => setForm({ ...form, institution: v })} placeholder="NCB" />
            <TextInput
              label="Last 4 digits"
              value={form.maskedNumber}
              onChange={(v) => setForm({ ...form, maskedNumber: v })}
              placeholder="4821"
            />
            <TextInput
              label="Posts to ledger account"
              value={form.accountId ? accountLabel(form.accountId) : accountLabel(data.accounts[0]?.id ?? '')}
              options={data.accounts.map((a) => `${a.code} · ${a.name}`)}
              onChange={(v) => setForm({ ...form, accountId: data.accounts.find((a) => `${a.code} · ${a.name}` === v)?.id ?? '' })}
            />
            <p style={{ fontSize: 12.5, color: 'var(--color-text-muted)', margin: 0, lineHeight: 1.5 }}>
              Only the last four digits are stored. Nothing here gives the system access to your bank.
            </p>
            {error && <div style={{ color: 'var(--color-danger,#dc2626)', fontSize: 13 }}>{error}</div>}
            <Button onClick={create} disabled={busy}>
              {busy ? 'Adding…' : 'Add account'}
            </Button>
          </div>
        </Modal>
      )}

      {importFor && (
        <ImportModal
          connection={importFor}
          onClose={() => setImportFor(null)}
          onDone={() => {
            setImportFor(null)
            load()
          }}
        />
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------

interface ImportResult {
  format: string
  read: number
  imported: number
  duplicates: number
  skipped: { row: number; reason: string }[]
}

function ImportModal({ connection, onClose, onDone }: { connection: Connection; onClose: () => void; onDone: () => void }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<ImportResult | null>(null)

  const upload = async () => {
    if (!file) return setError('Choose a statement file first.')
    setError('')
    setBusy(true)
    const body = new FormData()
    body.append('file', file)
    body.append('connectionId', connection.id)
    const res = await fetch('/api/admin/finance/banking/import', { method: 'POST', body })
    setBusy(false)
    const json = await res.json().catch(() => ({}))
    if (!res.ok) return setError(json.error || 'Could not import that statement.')
    setResult(json)
  }

  return (
    <Modal onClose={result ? onDone : onClose} title={`Import statement — ${connection.name}`} width={520}>
      {result ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ fontSize: 14, lineHeight: 1.6 }}>
            Read <strong>{result.read}</strong> transaction{result.read === 1 ? '' : 's'} from the {result.format.toUpperCase()} file.
            <br />
            <strong>{result.imported}</strong> new.{' '}
            {result.duplicates > 0 && (
              <span style={{ color: 'var(--color-text-muted)' }}>
                {result.duplicates} already imported, so {result.duplicates === 1 ? 'it was' : 'they were'} skipped.
              </span>
            )}
          </div>
          {result.skipped.length > 0 && (
            <div style={{ fontSize: 13, color: 'var(--ke-sun-600,#b45309)', lineHeight: 1.6 }}>
              {result.skipped.length} row{result.skipped.length === 1 ? '' : 's'} could not be read:
              <ul style={{ margin: '6px 0 0', paddingLeft: 18 }}>
                {result.skipped.slice(0, 5).map((s) => (
                  <li key={s.row}>
                    Row {s.row} — {s.reason}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <Button onClick={onDone}>Done</Button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <p style={{ fontSize: 13, color: 'var(--color-text-muted)', margin: 0, lineHeight: 1.55 }}>
            Export a CSV or OFX/QFX statement from your online banking and attach it. Importing an overlapping date
            range is safe — anything already here is recognised and skipped rather than duplicated.
          </p>
          <input
            ref={inputRef}
            type="file"
            accept=".csv,.ofx,.qfx,.txt,text/csv"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            style={{ fontSize: 13 }}
          />
          {error && <div style={{ color: 'var(--color-danger,#dc2626)', fontSize: 13 }}>{error}</div>}
          <Button onClick={upload} disabled={busy || !file}>
            {busy ? 'Reading…' : 'Import statement'}
          </Button>
        </div>
      )}
    </Modal>
  )
}

// ---------------------------------------------------------------------------

interface StatementLine {
  id: string
  postedAt: string
  description: string
  reference: string | null
  amount: number
  status: 'UNMATCHED' | 'MATCHED' | 'POSTED' | 'EXCLUDED'
  note: string | null
  suggestions: { journalLineId: string; score: number; confident: boolean; reasons: string[]; entryNo: string; date: string; memo: string }[]
}

interface LinesData {
  account: { code: string; name: string }
  categories: { id: string; code: string; name: string; type: string }[]
  lines: StatementLine[]
}

const STATUS_TONE = { UNMATCHED: 'orange', MATCHED: 'green', POSTED: 'blue', EXCLUDED: 'neutral' } as const
const STATUS_LABEL = { UNMATCHED: 'Needs review', MATCHED: 'Matched', POSTED: 'Posted', EXCLUDED: 'Excluded' } as const

function Lines({ connectionId, onBack }: { connectionId: string; onBack: () => void }) {
  const [data, setData] = useState<LinesData | null>(null)
  const [filter, setFilter] = useState<'UNMATCHED' | 'ALL'>('UNMATCHED')
  const [error, setError] = useState('')
  const [categorising, setCategorising] = useState<StatementLine | null>(null)

  const load = useCallback(async () => {
    const res = await fetch(`/api/admin/finance/banking/lines?connectionId=${connectionId}&status=${filter}`)
    if (res.ok) setData(await res.json())
  }, [connectionId, filter])
  useEffect(() => {
    load()
  }, [load])

  const act = async (body: Record<string, unknown>) => {
    setError('')
    const res = await fetch('/api/admin/finance/banking/lines', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!res.ok) return setError((await res.json().catch(() => ({}))).error || 'That did not go through.')
    load()
  }

  if (!data) return <Empty>Loading…</Empty>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <Button size="sm" variant="outline" onClick={onBack}>
          <ArrowLeft size={14} style={{ marginRight: 6, verticalAlign: -2 }} />
          All accounts
        </Button>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button size="sm" variant={filter === 'UNMATCHED' ? 'primary' : 'outline'} onClick={() => setFilter('UNMATCHED')}>
            Needs review
          </Button>
          <Button size="sm" variant={filter === 'ALL' ? 'primary' : 'outline'} onClick={() => setFilter('ALL')}>
            Everything
          </Button>
        </div>
      </div>

      <div style={cardStyle}>
        <h3 style={{ ...h3Style, margin: '0 0 4px' }}>
          {data.account.code} · {data.account.name}
        </h3>
        <p style={{ fontSize: 13, color: 'var(--color-text-muted)', margin: '0 0 12px', lineHeight: 1.55 }}>
          Each line is what the bank says happened. Match it to an entry the books already have, categorise it into a
          new entry, or exclude it. Nothing affects the ledger until you choose.
        </p>

        {data.lines.length === 0 ? (
          <Empty>{filter === 'UNMATCHED' ? 'Nothing left to review here.' : 'No statement lines imported yet.'}</Empty>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 720 }}>
              <thead>
                <tr>
                  <th style={th}>Date</th>
                  <th style={th}>Description</th>
                  <th style={{ ...th, textAlign: 'right' }}>Amount</th>
                  <th style={th}>Status</th>
                  <th style={th} />
                </tr>
              </thead>
              <tbody>
                {data.lines.map((l) => {
                  const top = l.suggestions[0]
                  const ambiguous = l.suggestions.length > 1 && l.suggestions[1].score === top?.score
                  return (
                    <tr key={l.id}>
                      <td style={{ ...td, whiteSpace: 'nowrap', color: 'var(--color-text-muted)' }}>{d(l.postedAt)}</td>
                      <td style={td}>
                        <div>{l.description}</div>
                        {l.reference && (
                          <div style={{ fontSize: 11.5, color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>{l.reference}</div>
                        )}
                        {top && (
                          <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 4, lineHeight: 1.5 }}>
                            {ambiguous
                              ? `${l.suggestions.length} entries match equally well — pick the right one.`
                              : `Looks like ${top.entryNo}${top.memo ? ` · ${top.memo}` : ''} — ${top.reasons.join('; ').toLowerCase()}.`}
                          </div>
                        )}
                      </td>
                      <td style={{ ...tdNum, color: l.amount < 0 ? 'var(--color-danger,#dc2626)' : undefined, fontWeight: 600 }}>
                        {l.amount < 0 ? '−' : '+'}
                        {fmt(Math.abs(Math.round(l.amount)))}
                      </td>
                      <td style={td}>
                        <Badge tone={STATUS_TONE[l.status]}>{STATUS_LABEL[l.status]}</Badge>
                      </td>
                      <td style={{ ...td, textAlign: 'right', whiteSpace: 'nowrap' }}>
                        {l.status === 'UNMATCHED' ? (
                          <div style={{ display: 'inline-flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                            {top && !ambiguous && top.confident && (
                              <Button
                                size="sm"
                                onClick={() => act({ lineId: l.id, action: 'match', journalLineId: top.journalLineId })}
                                iconRight={<Link2 size={13} />}
                              >
                                Match
                              </Button>
                            )}
                            <Button size="sm" variant="outline" onClick={() => setCategorising(l)}>
                              Categorise
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => act({ lineId: l.id, action: 'exclude' })} iconRight={<Ban size={13} />}>
                              Exclude
                            </Button>
                          </div>
                        ) : l.status === 'MATCHED' || l.status === 'EXCLUDED' ? (
                          <Button size="sm" variant="outline" onClick={() => act({ lineId: l.id, action: 'unmatch' })}>
                            Undo
                          </Button>
                        ) : null}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
        {error && <div style={{ color: 'var(--color-danger,#dc2626)', fontSize: 13, marginTop: 12 }}>{error}</div>}
      </div>

      {categorising && (
        <Categorise
          line={categorising}
          categories={data.categories}
          onClose={() => setCategorising(null)}
          onDone={() => {
            setCategorising(null)
            load()
          }}
        />
      )}
    </div>
  )
}

function Categorise({
  line,
  categories,
  onClose,
  onDone,
}: {
  line: StatementLine
  categories: LinesData['categories']
  onClose: () => void
  onDone: () => void
}) {
  const moneyIn = line.amount > 0
  // Money in is almost always revenue or a transfer; money out almost always an
  // expense. Leading with the likely half keeps the list usable without hiding
  // the rest.
  const likely = categories.filter((c) => (moneyIn ? c.type === 'REVENUE' : c.type === 'EXPENSE'))
  const rest = categories.filter((c) => !likely.includes(c))
  const ordered = [...likely, ...rest]

  const [choice, setChoice] = useState(ordered[0] ? `${ordered[0].code} · ${ordered[0].name}` : '')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const submit = async () => {
    const account = ordered.find((c) => `${c.code} · ${c.name}` === choice)
    if (!account) return setError('Choose a category.')
    setBusy(true)
    const res = await fetch('/api/admin/finance/banking/lines', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lineId: line.id, action: 'post', categoryAccountId: account.id, note }),
    })
    setBusy(false)
    if (!res.ok) return setError((await res.json().catch(() => ({}))).error || 'Could not post this entry.')
    onDone()
  }

  return (
    <Modal onClose={onClose} title="Categorise transaction" width={480}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ fontSize: 13.5, lineHeight: 1.6 }}>
          <strong>{line.description}</strong>
          <br />
          <span style={{ color: 'var(--color-text-muted)' }}>
            {d(line.postedAt)} · {moneyIn ? 'money in' : 'money out'} {fmt(Math.abs(Math.round(line.amount)))}
          </span>
        </div>
        <TextInput
          label={moneyIn ? 'Record this as' : 'Record this against'}
          value={choice}
          options={ordered.map((c) => `${c.code} · ${c.name}`)}
          onChange={setChoice}
        />
        <TextInput label="Note (optional)" value={note} onChange={setNote} />
        <p style={{ fontSize: 12.5, color: 'var(--color-text-muted)', margin: 0, lineHeight: 1.5 }}>
          This posts a journal entry dated {d(line.postedAt)} — {moneyIn ? 'debiting' : 'crediting'} the bank account and{' '}
          {moneyIn ? 'crediting' : 'debiting'} the category you choose.
        </p>
        {error && <div style={{ color: 'var(--color-danger,#dc2626)', fontSize: 13 }}>{error}</div>}
        <Button onClick={submit} disabled={busy}>
          {busy ? 'Posting…' : 'Post entry'}
        </Button>
      </div>
    </Modal>
  )
}
