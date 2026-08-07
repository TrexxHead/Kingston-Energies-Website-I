'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Pencil, Trash2, Upload, FileText, Camera } from 'lucide-react'
import { cardStyle, h3Style } from '../ui/card'
import Badge from '../ui/Badge'
import Button from '../ui/Button'
import Modal from '../ui/Modal'
import TextInput from '../ui/TextInput'
import { initials } from '@/lib/initials'
import { fmt } from '../mockData'

type PersonType = 'EMPLOYEE' | 'CONTRACTOR' | 'PARTNER'
type PersonStatus = 'ACTIVE' | 'ON_LEAVE' | 'INACTIVE'
type PayFrequency = 'MONTHLY' | 'FORTNIGHTLY' | 'WEEKLY'

const FREQ_LABEL: Record<PayFrequency, string> = { MONTHLY: 'Monthly', FORTNIGHTLY: 'Fortnightly', WEEKLY: 'Weekly' }
const EMP_STATUS_TONE: Record<string, 'green' | 'orange' | 'grey'> = { ACTIVE: 'green', ON_LEAVE: 'orange', TERMINATED: 'grey' }

interface Detail {
  id: string
  memberNo: string
  firstName: string
  lastName: string
  email: string | null
  phone: string | null
  photoUrl: string | null
  type: PersonType
  role: string | null
  department: string | null
  status: PersonStatus
  manager: { id: string; firstName: string; lastName: string; role: string | null } | null
  reports: { id: string; firstName: string; lastName: string; role: string | null; status: PersonStatus }[]
  employee: { id: string; employeeNo: string; jobTitle: string | null; grossPerPeriod: number; frequency: PayFrequency; status: string; netPerPeriod: number } | null
  compensationNote: string | null
  rateAmount: number | null
  rateFrequency: PayFrequency | null
  address: string | null
  emergencyContactName: string | null
  emergencyContactPhone: string | null
  startedAt: string
  endedAt: string | null
  notes: string | null
  documents: { id: string; name: string; fileName: string; sizeBytes: number; contentType: string; createdAt: string; url: string | null }[]
}

const TYPE_LABEL: Record<PersonType, string> = { EMPLOYEE: 'Employee', CONTRACTOR: 'Contractor', PARTNER: 'Partner' }
const STATUS_TONE: Record<PersonStatus, 'green' | 'orange' | 'grey'> = { ACTIVE: 'green', ON_LEAVE: 'orange', INACTIVE: 'grey' }
const STATUS_LABEL: Record<PersonStatus, string> = { ACTIVE: 'Active', ON_LEAVE: 'On leave', INACTIVE: 'Inactive' }

function tenure(startedAt: string, endedAt: string | null): string {
  const end = endedAt ? new Date(endedAt) : new Date()
  const months = Math.max(0, Math.round((end.getTime() - new Date(startedAt).getTime()) / (1000 * 60 * 60 * 24 * 30.44)))
  if (months < 1) return 'Just started'
  const years = Math.floor(months / 12)
  const rem = months % 12
  if (years === 0) return `${rem} mo`
  return rem === 0 ? `${years} yr` : `${years} yr ${rem} mo`
}

function fileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function PersonProfile({ id }: { id: string }) {
  const router = useRouter()
  const [person, setPerson] = useState<Detail | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [form, setForm] = useState<Record<string, string>>({})
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const photoInputRef = useRef<HTMLInputElement>(null)
  const docInputRef = useRef<HTMLInputElement>(null)

  const [payrollOpen, setPayrollOpen] = useState(false)
  const [unlinkedEmployees, setUnlinkedEmployees] = useState<{ id: string; name: string }[]>([])
  const [payrollMode, setPayrollMode] = useState<'link' | 'create'>('link')
  const [payrollForm, setPayrollForm] = useState<Record<string, string>>({})
  const [payrollError, setPayrollError] = useState('')
  const [payrollBusy, setPayrollBusy] = useState(false)

  const load = useCallback(async () => {
    const res = await fetch(`/api/admin/hr/people/${id}`)
    if (res.status === 404) { setNotFound(true); return }
    if (res.ok) setPerson(await res.json())
  }, [id])

  useEffect(() => { load() }, [load])

  const openEdit = () => {
    if (!person) return
    setForm({
      firstName: person.firstName, lastName: person.lastName, email: person.email ?? '', phone: person.phone ?? '',
      role: person.role ?? '', department: person.department ?? '', status: person.status,
      compensationNote: person.compensationNote ?? '', address: person.address ?? '',
      rateAmount: person.rateAmount != null ? String(person.rateAmount) : '', rateFrequency: person.rateFrequency ?? 'MONTHLY',
      emergencyContactName: person.emergencyContactName ?? '', emergencyContactPhone: person.emergencyContactPhone ?? '',
      notes: person.notes ?? '',
    })
    setError('')
    setEditOpen(true)
  }

  const openPayroll = async () => {
    setPayrollError('')
    setPayrollMode('link')
    setPayrollForm({ grossPerPeriod: '', frequency: 'MONTHLY', startedAt: person?.startedAt.slice(0, 10) ?? '', employeeId: '' })
    const res = await fetch('/api/admin/payroll/employees')
    if (res.ok) {
      const data = await res.json()
      const rows = (data.employees ?? []) as { id: string; name: string; linkedPerson: unknown }[]
      setUnlinkedEmployees(rows.filter((e) => !e.linkedPerson).map((e) => ({ id: e.id, name: e.name })))
    }
    setPayrollOpen(true)
  }

  const savePayroll = async () => {
    if (!person) return
    setPayrollBusy(true)
    setPayrollError('')
    let res: Response
    if (payrollMode === 'link') {
      if (!payrollForm.employeeId) {
        setPayrollError('Choose a payroll record to link.')
        setPayrollBusy(false)
        return
      }
      res = await fetch(`/api/admin/payroll/employees/${payrollForm.employeeId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamMemberId: person.id }),
      })
    } else {
      res = await fetch('/api/admin/payroll/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: person.firstName,
          lastName: person.lastName,
          email: person.email || undefined,
          jobTitle: person.role || undefined,
          department: person.department || undefined,
          grossPerPeriod: Number(payrollForm.grossPerPeriod),
          frequency: payrollForm.frequency,
          startedAt: payrollForm.startedAt,
          teamMemberId: person.id,
        }),
      })
    }
    setPayrollBusy(false)
    if (res.ok) { setPayrollOpen(false); load() }
    else setPayrollError((await res.json().catch(() => ({}))).error ?? 'Could not set up payroll.')
  }

  const saveEdit = async () => {
    setBusy(true)
    const res = await fetch(`/api/admin/hr/people/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    setBusy(false)
    if (res.ok) { setEditOpen(false); load() }
    else setError((await res.json().catch(() => ({}))).error ?? 'Could not save changes.')
  }

  const uploadPhoto = async (file: File) => {
    const fd = new FormData()
    fd.append('photo', file)
    await fetch(`/api/admin/hr/people/${id}`, { method: 'PATCH', body: fd })
    load()
  }

  const uploadDocument = async (file: File) => {
    const fd = new FormData()
    fd.append('file', file)
    fd.append('ownerId', id)
    fd.append('name', file.name)
    await fetch('/api/admin/hr/documents/upload', { method: 'POST', body: fd })
    load()
  }

  const remove = async () => {
    if (!confirm('Remove this person from HR? This does not affect their payroll history.')) return
    const res = await fetch(`/api/admin/hr/people/${id}`, { method: 'DELETE' })
    if (res.ok) router.push('/admin/dashboard/hr/people')
    else alert((await res.json().catch(() => ({}))).error ?? 'Could not remove this person.')
  }

  if (notFound) {
    return <div style={cardStyle}>This person could not be found.</div>
  }
  if (!person) {
    return <div style={{ fontSize: 12.5, color: 'var(--color-text-muted)' }}>Loading…</div>
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Link href="/admin/dashboard/hr/people" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: 'var(--color-text-muted)', textDecoration: 'none', width: 'fit-content' }}>
        <ArrowLeft size={14} /> Back to People
      </Link>

      <div style={{ ...cardStyle, display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flexShrink: 0 }}>
          {person.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={person.photoUrl} alt="" width={76} height={76} style={{ borderRadius: '50%', objectFit: 'cover' }} />
          ) : (
            <div style={{ width: 76, height: 76, borderRadius: '50%', background: 'var(--color-primary-soft)', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 24 }}>
              {initials(`${person.firstName} ${person.lastName}`)}
            </div>
          )}
          <button
            type="button"
            onClick={() => photoInputRef.current?.click()}
            aria-label="Change photo"
            style={{ position: 'absolute', bottom: -2, right: -2, width: 26, height: 26, borderRadius: '50%', background: 'var(--color-primary)', border: '2px solid var(--color-surface)', color: 'var(--color-primary-contrast)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
          >
            <Camera size={12} />
          </button>
          <input ref={photoInputRef} type="file" accept="image/*" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadPhoto(f); e.target.value = '' }} />
        </div>

        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 20, margin: 0 }}>{person.firstName} {person.lastName}</h2>
            <Badge tone="neutral">{TYPE_LABEL[person.type]}</Badge>
            <Badge tone={STATUS_TONE[person.status]}>{STATUS_LABEL[person.status]}</Badge>
          </div>
          <div style={{ fontSize: 13, color: 'var(--color-text-muted)', marginTop: 4 }}>
            {person.role || 'No title set'}{person.department ? ` · ${person.department}` : ''} · {person.memberNo}
          </div>
          {person.manager && (
            <div style={{ fontSize: 12, color: 'var(--color-text-subtle)', marginTop: 4 }}>
              Reports to <Link href={`/admin/dashboard/hr/people/${person.manager.id}`} style={{ color: 'var(--ke-green-700)' }}>{person.manager.firstName} {person.manager.lastName}</Link>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <Button size="sm" variant="outline" onClick={openEdit} iconRight={<Pencil size={13} />}>Edit</Button>
          <Button size="sm" variant="outline" onClick={remove} iconRight={<Trash2 size={13} />}>Remove</Button>
        </div>
      </div>

      <div className="kp-3col" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14 }}>
        <div style={{ ...cardStyle, borderRadius: 16, padding: 16 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 20 }}>{tenure(person.startedAt, person.endedAt)}</div>
          <div style={{ fontSize: 11, color: 'var(--color-text-subtle)', textTransform: 'uppercase', letterSpacing: '.04em', marginTop: 4 }}>Tenure</div>
        </div>
        <div style={{ ...cardStyle, borderRadius: 16, padding: 16 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 20 }}>{person.reports.length}</div>
          <div style={{ fontSize: 11, color: 'var(--color-text-subtle)', textTransform: 'uppercase', letterSpacing: '.04em', marginTop: 4 }}>Direct reports</div>
        </div>
        <div style={{ ...cardStyle, borderRadius: 16, padding: 16 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 20 }}>{person.documents.length}</div>
          <div style={{ fontSize: 11, color: 'var(--color-text-subtle)', textTransform: 'uppercase', letterSpacing: '.04em', marginTop: 4 }}>Documents on file</div>
        </div>
      </div>

      <div className="kp-2col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div style={cardStyle}>
          <h3 style={{ ...h3Style, margin: '0 0 12px' }}>Contact & terms</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13 }}>
            <Row label="Email" value={person.email ?? '—'} />
            <Row label="Phone" value={person.phone ?? '—'} />
            <Row label="Address" value={person.address ?? '—'} />
            <Row label="Emergency contact" value={person.emergencyContactName ? `${person.emergencyContactName}${person.emergencyContactPhone ? ` · ${person.emergencyContactPhone}` : ''}` : '—'} />
            {person.type !== 'EMPLOYEE' && <Row label="Engagement terms" value={person.compensationNote ?? 'Not set'} />}
            {person.type !== 'EMPLOYEE' && (
              <Row
                label="Rate"
                value={person.rateAmount != null && person.rateFrequency ? `${fmt(person.rateAmount)} / ${FREQ_LABEL[person.rateFrequency].toLowerCase()}` : 'Not set'}
              />
            )}
          </div>

          {person.type === 'EMPLOYEE' && (
            <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--color-border)' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 12, marginBottom: 8 }}>Payroll</div>
              {person.employee ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13 }}>
                  <Row label="Record" value={person.employee.employeeNo} />
                  <Row label="Gross" value={`${fmt(person.employee.grossPerPeriod)} / ${FREQ_LABEL[person.employee.frequency].toLowerCase()}`} />
                  <Row label="Net" value={fmt(person.employee.netPerPeriod)} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                    <span style={{ color: 'var(--color-text-subtle)' }}>Status</span>
                    <Badge tone={EMP_STATUS_TONE[person.employee.status] ?? 'grey'}>{person.employee.status}</Badge>
                  </div>
                  <Link href="/admin/dashboard/finance/payroll" style={{ fontSize: 12, color: 'var(--ke-green-700)', marginTop: 2 }}>View in Payroll →</Link>
                </div>
              ) : (
                <Button size="sm" variant="outline" onClick={openPayroll}>Set up payroll</Button>
              )}
            </div>
          )}

          {person.notes && (
            <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--color-border)' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 12, marginBottom: 4 }}>Notes</div>
              <p style={{ fontSize: 12.5, color: 'var(--color-text-muted)', margin: 0, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{person.notes}</p>
            </div>
          )}
        </div>

        <div style={cardStyle}>
          <h3 style={{ ...h3Style, margin: '0 0 12px' }}>Direct reports</h3>
          {person.reports.length === 0 ? (
            <p style={{ fontSize: 12.5, color: 'var(--color-text-muted)', margin: 0 }}>No one reports to {person.firstName} yet.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {person.reports.map((r) => (
                <Link key={r.id} href={`/admin/dashboard/hr/people/${r.id}`} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 11px', border: '1px solid var(--color-border)', borderRadius: 10, textDecoration: 'none', color: 'inherit' }}>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--color-primary-soft)', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 11, flexShrink: 0 }}>
                    {initials(`${r.firstName} ${r.lastName}`)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 13 }}>{r.firstName} {r.lastName}</div>
                    <div style={{ fontSize: 11, color: 'var(--color-text-subtle)' }}>{r.role ?? '—'}</div>
                  </div>
                  <Badge tone={STATUS_TONE[r.status]}>{STATUS_LABEL[r.status]}</Badge>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      <div style={cardStyle}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <h3 style={{ ...h3Style, margin: 0 }}>Documents</h3>
          <Button size="sm" variant="outline" onClick={() => docInputRef.current?.click()} iconRight={<Upload size={13} />}>Upload</Button>
          <input ref={docInputRef} type="file" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadDocument(f); e.target.value = '' }} />
        </div>
        {person.documents.length === 0 ? (
          <p style={{ fontSize: 12.5, color: 'var(--color-text-muted)', margin: 0 }}>Nothing on file yet — a contract, an ID, an offer letter.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {person.documents.map((d) => (
              <a key={d.id} href={d.url ?? undefined} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 11px', border: '1px solid var(--color-border)', borderRadius: 10, textDecoration: 'none', color: 'inherit' }}>
                <FileText size={15} color="var(--color-text-subtle)" style={{ flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0, fontSize: 12.5, fontFamily: 'var(--font-display)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.name}</div>
                <span style={{ fontSize: 11, color: 'var(--color-text-subtle)' }}>{fileSize(d.sizeBytes)}</span>
              </a>
            ))}
          </div>
        )}
      </div>

      {editOpen && (
        <Modal
          title="Edit person"
          onClose={() => setEditOpen(false)}
          footer={
            <>
              <Button size="sm" variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
              <Button size="sm" variant="primary" onClick={saveEdit}>{busy ? 'Saving…' : 'Save'}</Button>
            </>
          }
        >
          {error && <div style={{ background: 'var(--color-danger-soft)', color: 'var(--color-danger)', borderRadius: 8, padding: '8px 10px', fontSize: 12, marginBottom: 10 }}>{error}</div>}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <TextInput label="First name" value={form.firstName ?? ''} onChange={(v) => setForm({ ...form, firstName: v })} />
              <TextInput label="Last name" value={form.lastName ?? ''} onChange={(v) => setForm({ ...form, lastName: v })} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <TextInput label="Email" value={form.email ?? ''} onChange={(v) => setForm({ ...form, email: v })} />
              <TextInput label="Phone" value={form.phone ?? ''} onChange={(v) => setForm({ ...form, phone: v })} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <TextInput label="Role / title" value={form.role ?? ''} onChange={(v) => setForm({ ...form, role: v })} />
              <TextInput label="Department" value={form.department ?? ''} onChange={(v) => setForm({ ...form, department: v })} />
            </div>
            <TextInput
              label="Status"
              value={STATUS_LABEL[(form.status as PersonStatus) ?? 'ACTIVE']}
              onChange={(v) => setForm({ ...form, status: (Object.keys(STATUS_LABEL) as PersonStatus[]).find((k) => STATUS_LABEL[k] === v) ?? 'ACTIVE' })}
              options={Object.values(STATUS_LABEL)}
            />
            <TextInput label="Address" value={form.address ?? ''} onChange={(v) => setForm({ ...form, address: v })} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <TextInput label="Emergency contact name" value={form.emergencyContactName ?? ''} onChange={(v) => setForm({ ...form, emergencyContactName: v })} />
              <TextInput label="Emergency contact phone" value={form.emergencyContactPhone ?? ''} onChange={(v) => setForm({ ...form, emergencyContactPhone: v })} />
            </div>
            {person.type !== 'EMPLOYEE' && (
              <>
                <TextInput label="Engagement terms" value={form.compensationNote ?? ''} onChange={(v) => setForm({ ...form, compensationNote: v })} multiline />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <TextInput label="Rate (J$)" type="number" value={form.rateAmount ?? ''} onChange={(v) => setForm({ ...form, rateAmount: v })} />
                  <TextInput
                    label="Frequency"
                    value={FREQ_LABEL[(form.rateFrequency as PayFrequency) ?? 'MONTHLY']}
                    onChange={(v) => setForm({ ...form, rateFrequency: (Object.keys(FREQ_LABEL) as PayFrequency[]).find((k) => FREQ_LABEL[k] === v) ?? 'MONTHLY' })}
                    options={Object.values(FREQ_LABEL)}
                  />
                </div>
              </>
            )}
            <TextInput label="Notes" value={form.notes ?? ''} onChange={(v) => setForm({ ...form, notes: v })} multiline />
          </div>
        </Modal>
      )}

      {payrollOpen && (
        <Modal
          title="Set up payroll"
          onClose={() => setPayrollOpen(false)}
          footer={
            <>
              <Button size="sm" variant="outline" onClick={() => setPayrollOpen(false)}>Cancel</Button>
              <Button size="sm" variant="primary" onClick={savePayroll}>{payrollBusy ? 'Saving…' : 'Save'}</Button>
            </>
          }
        >
          {payrollError && <div style={{ background: 'var(--color-danger-soft)', color: 'var(--color-danger)', borderRadius: 8, padding: '8px 10px', fontSize: 12, marginBottom: 10 }}>{payrollError}</div>}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', gap: 8 }}>
              <Button size="sm" variant={payrollMode === 'link' ? 'primary' : 'outline'} onClick={() => setPayrollMode('link')}>Link existing record</Button>
              <Button size="sm" variant={payrollMode === 'create' ? 'primary' : 'outline'} onClick={() => setPayrollMode('create')}>Create new record</Button>
            </div>

            {payrollMode === 'link' ? (
              unlinkedEmployees.length === 0 ? (
                <p style={{ fontSize: 12.5, color: 'var(--color-text-muted)', margin: 0 }}>No unlinked payroll records available — create a new one instead.</p>
              ) : (
                <TextInput
                  label="Payroll record"
                  value={unlinkedEmployees.find((e) => e.id === payrollForm.employeeId)?.name ?? ''}
                  onChange={(v) => setPayrollForm({ ...payrollForm, employeeId: unlinkedEmployees.find((e) => e.name === v)?.id ?? '' })}
                  options={['', ...unlinkedEmployees.map((e) => e.name)]}
                />
              )
            ) : (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <TextInput label="Gross per period (J$)" type="number" value={payrollForm.grossPerPeriod ?? ''} onChange={(v) => setPayrollForm({ ...payrollForm, grossPerPeriod: v })} />
                  <TextInput
                    label="Frequency"
                    value={FREQ_LABEL[(payrollForm.frequency as PayFrequency) ?? 'MONTHLY']}
                    onChange={(v) => setPayrollForm({ ...payrollForm, frequency: (Object.keys(FREQ_LABEL) as PayFrequency[]).find((k) => FREQ_LABEL[k] === v) ?? 'MONTHLY' })}
                    options={Object.values(FREQ_LABEL)}
                  />
                </div>
                <TextInput label="Start date" type="date" value={payrollForm.startedAt ?? ''} onChange={(v) => setPayrollForm({ ...payrollForm, startedAt: v })} />
              </>
            )}
          </div>
        </Modal>
      )}
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
      <span style={{ color: 'var(--color-text-subtle)' }}>{label}</span>
      <span style={{ fontWeight: 600, textAlign: 'right' }}>{value}</span>
    </div>
  )
}
