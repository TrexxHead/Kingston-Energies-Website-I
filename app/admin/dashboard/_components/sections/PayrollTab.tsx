'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { Users, CalendarDays, SlidersHorizontal, Plus, AlertTriangle, Trash2, ArrowLeft } from 'lucide-react'
import { cardStyle, h3Style } from '../ui/card'
import Badge from '../ui/Badge'
import Button from '../ui/Button'
import Modal from '../ui/Modal'
import Pill from '../ui/Pill'
import TextInput from '../ui/TextInput'
import { fmt } from '../mockData'

type PayFrequency = 'MONTHLY' | 'FORTNIGHTLY' | 'WEEKLY'
const FREQ_LABEL: Record<PayFrequency, string> = { MONTHLY: 'Monthly', FORTNIGHTLY: 'Fortnightly', WEEKLY: 'Weekly' }

type View = 'employees' | 'runs' | 'rates'

const VIEWS: { id: View; label: string; icon: typeof Users }[] = [
  { id: 'employees', label: 'Employees', icon: Users },
  { id: 'runs', label: 'Pay runs', icon: CalendarDays },
  { id: 'rates', label: 'Statutory rates', icon: SlidersHorizontal },
]

/**
 * Payroll infrastructure: an employee register, statutory calculations and
 * payslips that post to the ledger on approval.
 *
 * It deliberately does not move money. There is no payment rail wired in —
 * salaries are paid directly by the business and recorded here, so what you see
 * is a record of obligations, not an instruction to a bank.
 */
export default function PayrollTab() {
  const [view, setView] = useState<View>('employees')
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <RatesWarning />
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {VIEWS.map((v) => (
          <Pill key={v.id} label={v.label} selected={view === v.id} onClick={() => setView(v.id)} />
        ))}
      </div>
      {view === 'employees' && <Employees />}
      {view === 'runs' && <Runs />}
      {view === 'rates' && <Rates />}
    </div>
  )
}

/**
 * Deliberately always on screen. The rates shipped with the app are commonly
 * published figures, not figures anyone has verified for the current tax year,
 * and getting them wrong is a legal exposure rather than a cosmetic bug.
 */
function RatesWarning() {
  return (
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
      <div style={{ fontSize: 13, lineHeight: 1.5, color: 'var(--color-text)' }}>
        <strong>Confirm the statutory rates before you approve a run.</strong> PAYE, NIS, NHT, education tax and HEART
        rates and thresholds are set by Tax Administration Jamaica and change, often annually. The values here are
        editable defaults, not verified figures. Each approved run freezes the rates it used, so historic payslips stay
        correct after you update them.
      </div>
    </div>
  )
}

function Stat({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div style={{ ...cardStyle, borderRadius: 14, padding: 16 }}>
      <div
        style={{
          fontFamily: 'var(--font-display)',
          fontWeight: 800,
          fontSize: 22,
          letterSpacing: '-.01em',
          color: muted ? 'var(--color-text-muted)' : undefined,
        }}
      >
        {value}
      </div>
      <div
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 9.5,
          letterSpacing: '.1em',
          color: 'var(--color-text-muted)',
          marginTop: 6,
          textTransform: 'uppercase',
        }}
      >
        {label}
      </div>
    </div>
  )
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

function Empty({ children }: { children: React.ReactNode }) {
  return <div style={{ padding: 28, textAlign: 'center', color: 'var(--color-text-muted)', fontSize: 13.5 }}>{children}</div>
}

// ---------------------------------------------------------------------------
// Employees
// ---------------------------------------------------------------------------

interface EmployeeRow {
  id: string
  employeeNo: string
  name: string
  email: string | null
  trn: string | null
  jobTitle: string | null
  department: string | null
  grossPerPeriod: number
  frequency: 'MONTHLY' | 'FORTNIGHTLY' | 'WEEKLY'
  status: 'ACTIVE' | 'ON_LEAVE' | 'TERMINATED'
  startedAt: string
  preview: { net: number; deductions: number; employerCost: number }
  linkedPerson: { id: string; name: string; photoUrl: string | null } | null
}

interface UnlinkedPerson {
  id: string
  firstName: string
  lastName: string
  email: string | null
}

const BLANK_EMPLOYEE = {
  firstName: '',
  lastName: '',
  email: '',
  trn: '',
  nisNumber: '',
  jobTitle: '',
  department: '',
  grossPerPeriod: '',
  frequency: 'MONTHLY' as EmployeeRow['frequency'],
  startedAt: '',
  teamMemberId: '',
}

function Employees() {
  const [rows, setRows] = useState<EmployeeRow[] | null>(null)
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ ...BLANK_EMPLOYEE })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [unlinkedPeople, setUnlinkedPeople] = useState<UnlinkedPerson[]>([])

  const load = useCallback(async () => {
    const res = await fetch('/api/admin/payroll/employees')
    if (res.ok) setRows((await res.json()).employees)
  }, [])
  useEffect(() => {
    load()
  }, [load])

  const openAdd = async () => {
    setForm({ ...BLANK_EMPLOYEE })
    setError('')
    setOpen(true)
    const res = await fetch('/api/admin/hr/people?type=EMPLOYEE')
    if (res.ok) {
      const data = await res.json()
      const people = (data.people ?? []) as { id: string; firstName: string; lastName: string; email: string | null; employeeId: string | null }[]
      setUnlinkedPeople(people.filter((p) => !p.employeeId))
    }
  }

  const pickLinkedPerson = (id: string) => {
    const person = unlinkedPeople.find((p) => p.id === id)
    setForm({
      ...form,
      teamMemberId: id,
      firstName: person?.firstName ?? form.firstName,
      lastName: person?.lastName ?? form.lastName,
      email: person?.email ?? form.email,
    })
  }

  const create = async () => {
    setError('')
    if (!form.firstName.trim() || !form.lastName.trim()) return setError('Enter a first and last name.')
    if (!Number(form.grossPerPeriod)) return setError('Enter the gross pay for one period.')
    if (!form.startedAt) return setError('Enter a start date.')
    setBusy(true)
    const res = await fetch('/api/admin/payroll/employees', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, grossPerPeriod: Number(form.grossPerPeriod), teamMemberId: form.teamMemberId || undefined }),
    })
    setBusy(false)
    if (!res.ok) return setError((await res.json().catch(() => ({}))).error || 'Could not add this employee.')
    setOpen(false)
    setForm({ ...BLANK_EMPLOYEE })
    load()
  }

  const setStatus = async (row: EmployeeRow, status: EmployeeRow['status']) => {
    await fetch(`/api/admin/payroll/employees/${row.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    load()
  }

  const remove = async (row: EmployeeRow) => {
    if (!confirm(`Remove ${row.name} from the register?`)) return
    const res = await fetch(`/api/admin/payroll/employees/${row.id}`, { method: 'DELETE' })
    if (!res.ok) alert((await res.json().catch(() => ({}))).error || 'Could not remove this employee.')
    load()
  }

  const active = (rows ?? []).filter((r) => r.status === 'ACTIVE')
  const monthlyCost = active.reduce((s, r) => {
    const perYear = r.frequency === 'MONTHLY' ? 12 : r.frequency === 'FORTNIGHTLY' ? 26 : 52
    return s + (r.preview.employerCost * perYear) / 12
  }, 0)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 12 }}>
        <Stat label="Active employees" value={String(active.length)} />
        <Stat label="On the register" value={String(rows?.length ?? 0)} />
        <Stat label="Monthly cost to business" value={fmt(Math.round(monthlyCost))} />
      </div>

      <div style={cardStyle}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <h3 style={{ ...h3Style, margin: 0 }}>Employee register</h3>
          <Button size="sm" onClick={openAdd} iconRight={<Plus size={14} />}>
            Add employee
          </Button>
        </div>

        {rows === null ? (
          <Empty>Loading…</Empty>
        ) : rows.length === 0 ? (
          <Empty>No employees yet. Add one to draft your first pay run.</Empty>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 780 }}>
              <thead>
                <tr>
                  <th style={th}>Employee</th>
                  <th style={th}>Role</th>
                  <th style={th}>Frequency</th>
                  <th style={{ ...th, textAlign: 'right' }}>Gross / period</th>
                  <th style={{ ...th, textAlign: 'right' }}>Net / period</th>
                  <th style={{ ...th, textAlign: 'right' }}>Cost to business</th>
                  <th style={th}>Status</th>
                  <th style={th} />
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td style={td}>
                      {r.linkedPerson ? (
                        <Link href={`/admin/dashboard/hr/people/${r.linkedPerson.id}`} style={{ fontWeight: 600, color: 'var(--ke-green-700)', textDecoration: 'none' }}>
                          {r.name}
                        </Link>
                      ) : (
                        <div style={{ fontWeight: 600 }}>{r.name}</div>
                      )}
                      <div style={{ fontSize: 11.5, color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>{r.employeeNo}</div>
                    </td>
                    <td style={{ ...td, color: 'var(--color-text-muted)' }}>{r.jobTitle || 'N/A'}</td>
                    <td style={{ ...td, color: 'var(--color-text-muted)' }}>{r.frequency.toLowerCase()}</td>
                    <td style={tdNum}>{fmt(r.grossPerPeriod)}</td>
                    <td style={tdNum}>{fmt(Math.round(r.preview.net))}</td>
                    <td style={tdNum}>{fmt(Math.round(r.preview.employerCost))}</td>
                    <td style={td}>
                      <Badge tone={r.status === 'ACTIVE' ? 'green' : r.status === 'ON_LEAVE' ? 'orange' : 'neutral'}>
                        {r.status === 'ON_LEAVE' ? 'On leave' : r.status.charAt(0) + r.status.slice(1).toLowerCase()}
                      </Badge>
                    </td>
                    <td style={{ ...td, textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setStatus(r, r.status === 'ACTIVE' ? 'ON_LEAVE' : 'ACTIVE')}
                      >
                        {r.status === 'ACTIVE' ? 'Set on leave' : 'Set active'}
                      </Button>{' '}
                      <Button size="sm" variant="outline" onClick={() => remove(r)} iconRight={<Trash2 size={13} />}>
                        Remove
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ContractorsCard />

      {open && (
      <Modal onClose={() => setOpen(false)} title="Add employee">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {unlinkedPeople.length > 0 && (
            <TextInput
              label="Link to an existing HR profile (optional)"
              value={unlinkedPeople.find((p) => p.id === form.teamMemberId) ? `${unlinkedPeople.find((p) => p.id === form.teamMemberId)!.firstName} ${unlinkedPeople.find((p) => p.id === form.teamMemberId)!.lastName}` : ''}
              options={['', ...unlinkedPeople.map((p) => `${p.firstName} ${p.lastName}`)]}
              onChange={(v) => {
                const person = unlinkedPeople.find((p) => `${p.firstName} ${p.lastName}` === v)
                pickLinkedPerson(person?.id ?? '')
              }}
            />
          )}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <TextInput label="First name" value={form.firstName} onChange={(v) => setForm({ ...form, firstName: v })} />
            <TextInput label="Last name" value={form.lastName} onChange={(v) => setForm({ ...form, lastName: v })} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <TextInput label="Job title" value={form.jobTitle} onChange={(v) => setForm({ ...form, jobTitle: v })} />
            <TextInput label="Department" value={form.department} onChange={(v) => setForm({ ...form, department: v })} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <TextInput label="TRN" value={form.trn} onChange={(v) => setForm({ ...form, trn: v })} />
            <TextInput label="NIS number" value={form.nisNumber} onChange={(v) => setForm({ ...form, nisNumber: v })} />
          </div>
          <TextInput label="Email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <TextInput
              label="Gross pay per period (J$)"
              value={form.grossPerPeriod}
              onChange={(v) => setForm({ ...form, grossPerPeriod: v })}
            />
            <TextInput
              label="Pay frequency"
              value={form.frequency}
              options={['MONTHLY', 'FORTNIGHTLY', 'WEEKLY']}
              onChange={(v) => setForm({ ...form, frequency: v as EmployeeRow['frequency'] })}
            />
          </div>
          <TextInput label="Start date" type="date" value={form.startedAt} onChange={(v) => setForm({ ...form, startedAt: v })} />
          {error && <div style={{ color: 'var(--color-danger,#dc2626)', fontSize: 13 }}>{error}</div>}
          <Button onClick={create} disabled={busy}>
            {busy ? 'Adding…' : 'Add employee'}
          </Button>
        </div>
      </Modal>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Contractors & partners
// ---------------------------------------------------------------------------

interface ContractorRow {
  id: string
  firstName: string
  lastName: string
  type: 'CONTRACTOR' | 'PARTNER'
  role: string | null
  rateAmount: number | null
  rateFrequency: PayFrequency | null
}

function ContractorsCard() {
  const [rows, setRows] = useState<ContractorRow[] | null>(null)
  const [editing, setEditing] = useState<Record<string, { rateAmount: string; rateFrequency: PayFrequency }>>({})
  const [busyId, setBusyId] = useState<string | null>(null)

  const load = useCallback(async () => {
    const res = await fetch('/api/admin/hr/people')
    if (res.ok) {
      const data = await res.json()
      const people = (data.people ?? []) as ContractorRow[]
      setRows(people.filter((p) => p.type === 'CONTRACTOR' || p.type === 'PARTNER'))
    }
  }, [])
  useEffect(() => {
    load()
  }, [load])

  const startEdit = (row: ContractorRow) => {
    setEditing({ ...editing, [row.id]: { rateAmount: row.rateAmount != null ? String(row.rateAmount) : '', rateFrequency: row.rateFrequency ?? 'MONTHLY' } })
  }

  const saveRate = async (id: string) => {
    const draft = editing[id]
    if (!draft) return
    setBusyId(id)
    await fetch(`/api/admin/hr/people/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rateAmount: draft.rateAmount, rateFrequency: draft.rateFrequency }),
    })
    setBusyId(null)
    setEditing((e) => { const next = { ...e }; delete next[id]; return next })
    load()
  }

  return (
    <div style={cardStyle}>
      <h3 style={{ ...h3Style, margin: '0 0 12px' }}>Contractors &amp; partners</h3>
      {rows === null ? (
        <Empty>Loading…</Empty>
      ) : rows.length === 0 ? (
        <Empty>No contractors or partners on file yet — add them from HR People.</Empty>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 620 }}>
            <thead>
              <tr>
                <th style={th}>Name</th>
                <th style={th}>Type</th>
                <th style={{ ...th, textAlign: 'right' }}>Rate</th>
                <th style={th} />
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const draft = editing[r.id]
                return (
                  <tr key={r.id}>
                    <td style={td}>
                      <Link href={`/admin/dashboard/hr/people/${r.id}`} style={{ fontWeight: 600, color: 'var(--ke-green-700)', textDecoration: 'none' }}>
                        {r.firstName} {r.lastName}
                      </Link>
                      {r.role && <div style={{ fontSize: 11.5, color: 'var(--color-text-muted)' }}>{r.role}</div>}
                    </td>
                    <td style={{ ...td, color: 'var(--color-text-muted)' }}>{r.type === 'CONTRACTOR' ? 'Contractor' : 'Partner'}</td>
                    <td style={{ ...tdNum }}>
                      {draft ? (
                        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', alignItems: 'center' }}>
                          <input
                            type="number"
                            value={draft.rateAmount}
                            onChange={(e) => setEditing({ ...editing, [r.id]: { ...draft, rateAmount: e.target.value } })}
                            style={{ width: 100, height: 32, padding: '0 8px', border: '1.5px solid var(--color-border)', borderRadius: 8, fontSize: 13 }}
                          />
                          <select
                            value={draft.rateFrequency}
                            onChange={(e) => setEditing({ ...editing, [r.id]: { ...draft, rateFrequency: e.target.value as PayFrequency } })}
                            style={{ height: 32, padding: '0 6px', border: '1.5px solid var(--color-border)', borderRadius: 8, fontSize: 13 }}
                          >
                            {Object.entries(FREQ_LABEL).map(([k, v]) => (
                              <option key={k} value={k}>{v}</option>
                            ))}
                          </select>
                        </div>
                      ) : r.rateAmount != null && r.rateFrequency ? (
                        `${fmt(r.rateAmount)} / ${FREQ_LABEL[r.rateFrequency].toLowerCase()}`
                      ) : (
                        'Not set'
                      )}
                    </td>
                    <td style={{ ...td, textAlign: 'right', whiteSpace: 'nowrap' }}>
                      {draft ? (
                        <Button size="sm" onClick={() => saveRate(r.id)} disabled={busyId === r.id}>
                          {busyId === r.id ? 'Saving…' : 'Save'}
                        </Button>
                      ) : (
                        <Button size="sm" variant="outline" onClick={() => startEdit(r)}>Edit rate</Button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Pay runs
// ---------------------------------------------------------------------------

interface RunRow {
  id: string
  runNo: string
  periodStart: string
  periodEnd: string
  payDate: string
  status: 'DRAFT' | 'APPROVED' | 'PAID'
  headcount: number
  gross: number
  net: number
  employerCost: number
  posted: boolean
}

const d = (iso: string) => new Date(iso).toLocaleDateString('en-JM', { day: 'numeric', month: 'short', year: 'numeric' })

function Runs() {
  const [rows, setRows] = useState<RunRow[] | null>(null)
  const [openId, setOpenId] = useState<string | null>(null)
  const [draftOpen, setDraftOpen] = useState(false)
  const [form, setForm] = useState({ periodStart: '', periodEnd: '', payDate: '' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    const res = await fetch('/api/admin/payroll/runs')
    if (res.ok) setRows((await res.json()).runs)
  }, [])
  useEffect(() => {
    load()
  }, [load])

  const draft = async () => {
    setError('')
    if (!form.periodStart || !form.periodEnd || !form.payDate) return setError('Enter the period and the pay date.')
    setBusy(true)
    const res = await fetch('/api/admin/payroll/runs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    setBusy(false)
    if (!res.ok) return setError((await res.json().catch(() => ({}))).error || 'Could not draft this run.')
    const { id } = await res.json()
    setDraftOpen(false)
    setForm({ periodStart: '', periodEnd: '', payDate: '' })
    await load()
    setOpenId(id)
  }

  if (openId) return <RunDetail id={openId} onBack={() => { setOpenId(null); load() }} />

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={cardStyle}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <h3 style={{ ...h3Style, margin: 0 }}>Pay runs</h3>
          <Button size="sm" onClick={() => setDraftOpen(true)} iconRight={<Plus size={14} />}>
            New pay run
          </Button>
        </div>

        {rows === null ? (
          <Empty>Loading…</Empty>
        ) : rows.length === 0 ? (
          <Empty>No pay runs yet. Drafting one calculates every active employee&rsquo;s payslip so you can review it before anything hits the books.</Empty>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 720 }}>
              <thead>
                <tr>
                  <th style={th}>Run</th>
                  <th style={th}>Period</th>
                  <th style={th}>Pay date</th>
                  <th style={{ ...th, textAlign: 'right' }}>Staff</th>
                  <th style={{ ...th, textAlign: 'right' }}>Gross</th>
                  <th style={{ ...th, textAlign: 'right' }}>Net</th>
                  <th style={{ ...th, textAlign: 'right' }}>Total cost</th>
                  <th style={th}>Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} onClick={() => setOpenId(r.id)} style={{ cursor: 'pointer' }}>
                    <td style={{ ...td, fontFamily: 'var(--font-mono)', fontSize: 12.5 }}>{r.runNo}</td>
                    <td style={{ ...td, color: 'var(--color-text-muted)' }}>
                      {d(r.periodStart)} – {d(r.periodEnd)}
                    </td>
                    <td style={td}>{d(r.payDate)}</td>
                    <td style={tdNum}>{r.headcount}</td>
                    <td style={tdNum}>{fmt(r.gross)}</td>
                    <td style={tdNum}>{fmt(r.net)}</td>
                    <td style={tdNum}>{fmt(r.employerCost)}</td>
                    <td style={td}>
                      <Badge tone={r.status === 'PAID' ? 'green' : r.status === 'APPROVED' ? 'blue' : 'neutral'}>
                        {r.status.charAt(0) + r.status.slice(1).toLowerCase()}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {draftOpen && (
      <Modal onClose={() => setDraftOpen(false)} title="New pay run">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <p style={{ fontSize: 13, color: 'var(--color-text-muted)', margin: 0, lineHeight: 1.5 }}>
            Every active employee is included. The run is calculated against today&rsquo;s rates and saved as a draft.
            nothing reaches the ledger until you approve it.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <TextInput label="Period start" type="date" value={form.periodStart} onChange={(v) => setForm({ ...form, periodStart: v })} />
            <TextInput label="Period end" type="date" value={form.periodEnd} onChange={(v) => setForm({ ...form, periodEnd: v })} />
          </div>
          <TextInput label="Pay date" type="date" value={form.payDate} onChange={(v) => setForm({ ...form, payDate: v })} />
          {error && <div style={{ color: 'var(--color-danger,#dc2626)', fontSize: 13 }}>{error}</div>}
          <Button onClick={draft} disabled={busy}>
            {busy ? 'Calculating…' : 'Draft run'}
          </Button>
        </div>
      </Modal>
      )}
    </div>
  )
}

interface RunDetailData {
  run: {
    id: string
    runNo: string
    periodStart: string
    periodEnd: string
    payDate: string
    status: 'DRAFT' | 'APPROVED' | 'PAID'
    approvedAt: string | null
    paidAt: string | null
    entryId: string | null
    notes: string | null
  }
  totals: {
    gross: number
    paye: number
    nisEmployee: number
    nhtEmployee: number
    edTaxEmployee: number
    otherDeductions: number
    net: number
    nisEmployer: number
    nhtEmployer: number
    edTaxEmployer: number
    heartEmployer: number
    employerCost: number
    headcount: number
  }
  payslips: {
    id: string
    employeeNo: string
    name: string
    jobTitle: string | null
    gross: number
    paye: number
    nisEmployee: number
    nhtEmployee: number
    edTaxEmployee: number
    otherDeductions: number
    net: number
  }[]
}

function RunDetail({ id, onBack }: { id: string; onBack: () => void }) {
  const [data, setData] = useState<RunDetailData | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    const res = await fetch(`/api/admin/payroll/runs/${id}`)
    if (res.ok) setData(await res.json())
  }, [id])
  useEffect(() => {
    load()
  }, [load])

  const act = async (action: 'approve' | 'markPaid') => {
    setError('')
    if (action === 'approve' && !confirm('Approving posts this run to the ledger and locks it. Have you confirmed the statutory rates?')) return
    setBusy(true)
    const res = await fetch(`/api/admin/payroll/runs/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    })
    setBusy(false)
    if (!res.ok) return setError((await res.json().catch(() => ({}))).error || 'That did not go through.')
    load()
  }

  const discard = async () => {
    if (!confirm('Discard this draft run?')) return
    const res = await fetch(`/api/admin/payroll/runs/${id}`, { method: 'DELETE' })
    if (!res.ok) return setError((await res.json().catch(() => ({}))).error || 'Could not discard this run.')
    onBack()
  }

  if (!data) return <Empty>Loading…</Empty>
  const { run, totals, payslips } = data
  const statutoryDue = totals.paye + totals.nisEmployee + totals.nisEmployer + totals.nhtEmployee + totals.nhtEmployer
    + totals.edTaxEmployee + totals.edTaxEmployer + totals.heartEmployer

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <Button size="sm" variant="outline" onClick={onBack}>
          <ArrowLeft size={14} style={{ marginRight: 6, verticalAlign: -2 }} />
          All pay runs
        </Button>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <Badge tone={run.status === 'PAID' ? 'green' : run.status === 'APPROVED' ? 'blue' : 'neutral'}>
            {run.status.charAt(0) + run.status.slice(1).toLowerCase()}
          </Badge>
          {run.status === 'DRAFT' && (
            <>
              <Button size="sm" variant="outline" onClick={discard} iconRight={<Trash2 size={13} />}>
                Discard
              </Button>
              <Button size="sm" onClick={() => act('approve')} disabled={busy}>
                {busy ? 'Posting…' : 'Approve & post'}
              </Button>
            </>
          )}
          {run.status === 'APPROVED' && (
            <Button size="sm" onClick={() => act('markPaid')} disabled={busy}>
              {busy ? 'Recording…' : 'Mark staff paid'}
            </Button>
          )}
        </div>
      </div>

      <div style={cardStyle}>
        <h3 style={{ ...h3Style, margin: '0 0 4px' }}>
          {run.runNo} · {d(run.periodStart)} – {d(run.periodEnd)}
        </h3>
        <p style={{ fontSize: 13, color: 'var(--color-text-muted)', margin: 0 }}>
          Pay date {d(run.payDate)} · {totals.headcount} employee{totals.headcount === 1 ? '' : 's'}
          {run.status === 'DRAFT' && ' · nothing has reached the ledger yet'}
          {run.status === 'APPROVED' && ' · posted to the ledger, staff not yet marked paid'}
          {run.status === 'PAID' && run.paidAt && ` · paid ${d(run.paidAt)}`}
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 12 }}>
        <Stat label="Gross wages" value={fmt(Math.round(totals.gross))} />
        <Stat label="Net to staff" value={fmt(Math.round(totals.net))} />
        <Stat label="Statutory owed" value={fmt(Math.round(statutoryDue))} />
        <Stat label="Total cost to business" value={fmt(Math.round(totals.employerCost))} />
      </div>

      <div style={cardStyle}>
        <h3 style={{ ...h3Style, margin: '0 0 12px' }}>Payslips</h3>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 760 }}>
            <thead>
              <tr>
                <th style={th}>Employee</th>
                <th style={{ ...th, textAlign: 'right' }}>Gross</th>
                <th style={{ ...th, textAlign: 'right' }}>PAYE</th>
                <th style={{ ...th, textAlign: 'right' }}>NIS</th>
                <th style={{ ...th, textAlign: 'right' }}>NHT</th>
                <th style={{ ...th, textAlign: 'right' }}>Ed. tax</th>
                <th style={{ ...th, textAlign: 'right' }}>Other</th>
                <th style={{ ...th, textAlign: 'right' }}>Net</th>
              </tr>
            </thead>
            <tbody>
              {payslips.map((p) => (
                <tr key={p.id}>
                  <td style={td}>
                    <div style={{ fontWeight: 600 }}>{p.name}</div>
                    <div style={{ fontSize: 11.5, color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>{p.employeeNo}</div>
                  </td>
                  <td style={tdNum}>{fmt(Math.round(p.gross))}</td>
                  <td style={tdNum}>{fmt(Math.round(p.paye))}</td>
                  <td style={tdNum}>{fmt(Math.round(p.nisEmployee))}</td>
                  <td style={tdNum}>{fmt(Math.round(p.nhtEmployee))}</td>
                  <td style={tdNum}>{fmt(Math.round(p.edTaxEmployee))}</td>
                  <td style={tdNum}>{fmt(Math.round(p.otherDeductions))}</td>
                  <td style={{ ...tdNum, fontWeight: 700 }}>{fmt(Math.round(p.net))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div style={cardStyle}>
        <h3 style={{ ...h3Style, margin: '0 0 4px' }}>What you owe, and to whom</h3>
        <p style={{ fontSize: 13, color: 'var(--color-text-muted)', margin: '0 0 12px', lineHeight: 1.5 }}>
          Approving records these as liabilities. They stay on the balance sheet until you log the remittance. The
          system never pays anyone.
        </p>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <tbody>
            <Owed label="Net pay to staff" value={totals.net} />
            <Owed label="PAYE to TAJ" value={totals.paye} />
            <Owed label="NIS (employee + employer)" value={totals.nisEmployee + totals.nisEmployer} />
            <Owed label="NHT (employee + employer)" value={totals.nhtEmployee + totals.nhtEmployer} />
            <Owed label="Education tax (employee + employer)" value={totals.edTaxEmployee + totals.edTaxEmployer} />
            <Owed label="HEART (employer only)" value={totals.heartEmployer} />
          </tbody>
        </table>
      </div>

      {error && <div style={{ color: 'var(--color-danger,#dc2626)', fontSize: 13 }}>{error}</div>}
    </div>
  )
}

function Owed({ label, value }: { label: string; value: number }) {
  return (
    <tr>
      <td style={td}>{label}</td>
      <td style={{ ...tdNum, fontWeight: 600 }}>{fmt(Math.round(value))}</td>
    </tr>
  )
}

// ---------------------------------------------------------------------------
// Statutory rates
// ---------------------------------------------------------------------------

interface RatesShape {
  payeThresholdAnnual: number
  payeRate: number
  payeHigherThresholdAnnual: number
  payeHigherRate: number
  nisEmployeeRate: number
  nisEmployerRate: number
  nisCeilingAnnual: number
  nhtEmployeeRate: number
  nhtEmployerRate: number
  edTaxEmployeeRate: number
  edTaxEmployerRate: number
  heartEmployerRate: number
  heartMonthlyThreshold: number
}

const RATE_FIELDS: { key: keyof RatesShape; label: string; percent?: boolean }[] = [
  { key: 'payeThresholdAnnual', label: 'PAYE tax-free threshold (annual, J$)' },
  { key: 'payeRate', label: 'PAYE rate', percent: true },
  { key: 'payeHigherThresholdAnnual', label: 'PAYE higher-rate threshold (annual, J$)' },
  { key: 'payeHigherRate', label: 'PAYE higher rate', percent: true },
  { key: 'nisEmployeeRate', label: 'NIS: employee', percent: true },
  { key: 'nisEmployerRate', label: 'NIS: employer', percent: true },
  { key: 'nisCeilingAnnual', label: 'NIS insurable ceiling (annual, J$)' },
  { key: 'nhtEmployeeRate', label: 'NHT: employee', percent: true },
  { key: 'nhtEmployerRate', label: 'NHT: employer', percent: true },
  { key: 'edTaxEmployeeRate', label: 'Education tax: employee', percent: true },
  { key: 'edTaxEmployerRate', label: 'Education tax: employer', percent: true },
  { key: 'heartEmployerRate', label: 'HEART: employer', percent: true },
  { key: 'heartMonthlyThreshold', label: 'HEART monthly payroll threshold (J$)' },
]

function Rates() {
  const [draft, setDraft] = useState<Record<string, string> | null>(null)
  const [defaults, setDefaults] = useState<RatesShape | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [msg, setMsg] = useState('')

  const toDraft = (r: RatesShape) =>
    Object.fromEntries(
      RATE_FIELDS.map((f) => [f.key, f.percent ? String(Math.round((r[f.key] as number) * 10000) / 100) : String(r[f.key])]),
    )

  const load = useCallback(async () => {
    const res = await fetch('/api/admin/payroll/rates')
    if (!res.ok) return
    const json = await res.json()
    setDefaults(json.defaults)
    setDraft(toDraft(json.rates))
  }, [])
  useEffect(() => {
    load()
  }, [load])

  const save = async () => {
    if (!draft) return
    setError('')
    setMsg('')
    const payload: Record<string, number> = {}
    for (const f of RATE_FIELDS) {
      const n = Number(draft[f.key])
      if (!Number.isFinite(n) || n < 0) return setError(`${f.label} must be a number.`)
      payload[f.key] = f.percent ? n / 100 : n
    }
    setBusy(true)
    const res = await fetch('/api/admin/payroll/rates', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    setBusy(false)
    if (!res.ok) return setError((await res.json().catch(() => ({}))).error || 'Could not save these rates.')
    setMsg('Saved. Runs approved before now keep the rates they were calculated with.')
  }

  if (!draft) return <Empty>Loading…</Empty>

  return (
    <div style={cardStyle}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4, flexWrap: 'wrap', gap: 8 }}>
        <h3 style={{ ...h3Style, margin: 0 }}>Statutory rates</h3>
        {defaults && (
          <Button size="sm" variant="outline" onClick={() => setDraft(toDraft(defaults))}>
            Reset to shipped defaults
          </Button>
        )}
      </div>
      <p style={{ fontSize: 13, color: 'var(--color-text-muted)', margin: '0 0 16px', lineHeight: 1.5 }}>
        Check these against current Tax Administration Jamaica guidance each tax year. Only a super admin can change
        them.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 12 }}>
        {RATE_FIELDS.map((f) => (
          <TextInput
            key={f.key}
            label={f.percent ? `${f.label} (%)` : f.label}
            value={draft[f.key]}
            onChange={(v) => setDraft({ ...draft, [f.key]: v })}
          />
        ))}
      </div>

      {error && <div style={{ color: 'var(--color-danger,#dc2626)', fontSize: 13, marginTop: 12 }}>{error}</div>}
      {msg && <div style={{ color: 'var(--color-text-muted)', fontSize: 13, marginTop: 12 }}>{msg}</div>}
      <div style={{ marginTop: 16 }}>
        <Button onClick={save} disabled={busy}>
          {busy ? 'Saving…' : 'Save rates'}
        </Button>
      </div>
    </div>
  )
}
