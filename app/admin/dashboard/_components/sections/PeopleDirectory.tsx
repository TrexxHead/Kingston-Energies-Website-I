'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { Plus, Search } from 'lucide-react'
import { cardStyle } from '../ui/card'
import Badge from '../ui/Badge'
import Button from '../ui/Button'
import Modal from '../ui/Modal'
import Pill from '../ui/Pill'
import TextInput from '../ui/TextInput'
import { initials } from '@/lib/initials'

interface Person {
  id: string
  memberNo: string
  firstName: string
  lastName: string
  email: string | null
  phone: string | null
  photoUrl: string | null
  type: 'EMPLOYEE' | 'CONTRACTOR' | 'PARTNER'
  role: string | null
  department: string | null
  status: 'ACTIVE' | 'ON_LEAVE' | 'INACTIVE'
  managerName: string | null
  reportCount: number
  startedAt: string
}

const TYPE_LABEL: Record<Person['type'], string> = { EMPLOYEE: 'Employee', CONTRACTOR: 'Contractor', PARTNER: 'Partner' }
const STATUS_TONE: Record<Person['status'], 'green' | 'orange' | 'grey'> = { ACTIVE: 'green', ON_LEAVE: 'orange', INACTIVE: 'grey' }
const STATUS_LABEL: Record<Person['status'], string> = { ACTIVE: 'Active', ON_LEAVE: 'On leave', INACTIVE: 'Inactive' }

const emptyForm = {
  firstName: '', lastName: '', email: '', phone: '',
  type: 'EMPLOYEE' as Person['type'], role: '', department: '',
  managerId: '', startedAt: new Date().toISOString().slice(0, 10),
  compensationNote: '',
}

export default function PeopleDirectory() {
  const [people, setPeople] = useState<Person[]>([])
  const [loaded, setLoaded] = useState(false)
  const [typeFilter, setTypeFilter] = useState<'ALL' | Person['type']>('ALL')
  const [statusFilter, setStatusFilter] = useState<'ALL' | Person['status']>('ALL')
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    const res = await fetch('/api/admin/hr/people')
    if (res.ok) {
      const d = await res.json()
      setPeople(d.people)
    }
    setLoaded(true)
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = people.filter((p) => {
    if (typeFilter !== 'ALL' && p.type !== typeFilter) return false
    if (statusFilter !== 'ALL' && p.status !== statusFilter) return false
    if (query.trim()) {
      const q = query.trim().toLowerCase()
      const name = `${p.firstName} ${p.lastName}`.toLowerCase()
      if (!name.includes(q) && !(p.email ?? '').toLowerCase().includes(q) && !p.memberNo.toLowerCase().includes(q)) return false
    }
    return true
  })

  const create = async () => {
    setError('')
    if (!form.firstName.trim() || !form.lastName.trim()) { setError('First and last name are required.'); return }
    setBusy(true)
    const res = await fetch('/api/admin/hr/people', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, managerId: form.managerId || undefined }),
    })
    setBusy(false)
    if (res.ok) { setForm(emptyForm); setOpen(false); load() }
    else setError((await res.json().catch(() => ({}))).error ?? 'Could not add this person.')
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          <Pill label="Everyone" selected={typeFilter === 'ALL'} onClick={() => setTypeFilter('ALL')} />
          <Pill label="Employees" selected={typeFilter === 'EMPLOYEE'} onClick={() => setTypeFilter('EMPLOYEE')} />
          <Pill label="Contractors" selected={typeFilter === 'CONTRACTOR'} onClick={() => setTypeFilter('CONTRACTOR')} />
          <Pill label="Partners" selected={typeFilter === 'PARTNER'} onClick={() => setTypeFilter('PARTNER')} />
          <span style={{ width: 1, alignSelf: 'stretch', background: 'var(--color-border)', margin: '0 2px' }} />
          <Pill label="Any status" selected={statusFilter === 'ALL'} onClick={() => setStatusFilter('ALL')} />
          <Pill label="Active" selected={statusFilter === 'ACTIVE'} onClick={() => setStatusFilter('ACTIVE')} />
          <Pill label="On leave" selected={statusFilter === 'ON_LEAVE'} onClick={() => setStatusFilter('ON_LEAVE')} />
        </div>
        <Button size="sm" variant="primary" onClick={() => { setForm(emptyForm); setError(''); setOpen(true) }} iconRight={<Plus size={14} />}>Add person</Button>
      </div>

      <div style={{ position: 'relative', maxWidth: 320 }}>
        <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-subtle)' }} />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name, email or ID…"
          style={{ width: '100%', height: 38, padding: '0 12px 0 34px', borderRadius: 11, border: '1.5px solid var(--color-border)', background: 'var(--color-surface-sunk)', fontSize: 13, color: 'var(--color-text)', outline: 'none' }}
        />
      </div>

      <div style={{ ...cardStyle, padding: 0, overflow: 'hidden' }}>
        {!loaded ? (
          <div style={{ padding: 24, fontSize: 12.5, color: 'var(--color-text-muted)' }}>Loading…</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 24, fontSize: 12.5, color: 'var(--color-text-muted)' }}>
            {people.length === 0 ? 'No one added yet.' : 'No one matches these filters.'}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {filtered.map((p) => (
              <Link
                key={p.id}
                href={`/admin/dashboard/hr/people/${p.id}`}
                style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '13px 18px', borderTop: '1px solid var(--color-border)', textDecoration: 'none', color: 'inherit' }}
              >
                {p.photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.photoUrl} alt="" width={38} height={38} style={{ borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                ) : (
                  <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'var(--color-primary-soft)', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13, flexShrink: 0 }}>
                    {initials(`${p.firstName} ${p.lastName}`)}
                  </div>
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13.5 }}>{p.firstName} {p.lastName}</div>
                  <div style={{ fontSize: 11.5, color: 'var(--color-text-subtle)' }}>
                    {p.role || TYPE_LABEL[p.type]}{p.department ? ` · ${p.department}` : ''}{p.managerName ? ` · reports to ${p.managerName}` : ''}
                  </div>
                </div>
                <Badge tone="neutral">{TYPE_LABEL[p.type]}</Badge>
                <Badge tone={STATUS_TONE[p.status]}>{STATUS_LABEL[p.status]}</Badge>
              </Link>
            ))}
          </div>
        )}
      </div>

      {open && (
        <Modal
          title="Add a person"
          onClose={() => setOpen(false)}
          footer={
            <>
              <Button size="sm" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button size="sm" variant="primary" onClick={create}>{busy ? 'Saving…' : 'Add person'}</Button>
            </>
          }
        >
          {error && <div style={{ background: 'var(--color-danger-soft)', color: 'var(--color-danger)', borderRadius: 8, padding: '8px 10px', fontSize: 12, marginBottom: 10 }}>{error}</div>}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <TextInput label="First name" value={form.firstName} onChange={(v) => setForm({ ...form, firstName: v })} />
              <TextInput label="Last name" value={form.lastName} onChange={(v) => setForm({ ...form, lastName: v })} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <TextInput label="Email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} type="email" />
              <TextInput label="Phone" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} />
            </div>
            <div>
              <span style={{ display: 'block', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 12.5, marginBottom: 6 }}>Type</span>
              <div style={{ display: 'flex', gap: 8 }}>
                {(['EMPLOYEE', 'CONTRACTOR', 'PARTNER'] as const).map((t) => (
                  <Badge key={t} tone={form.type === t ? 'green' : 'neutral'} onClick={() => setForm({ ...form, type: t })}>{TYPE_LABEL[t]}</Badge>
                ))}
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <TextInput label="Role / title" value={form.role} onChange={(v) => setForm({ ...form, role: v })} />
              <TextInput label="Department" value={form.department} onChange={(v) => setForm({ ...form, department: v })} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <TextInput
                label="Manager (optional)"
                value={people.find((p) => p.id === form.managerId) ? `${people.find((p) => p.id === form.managerId)!.firstName} ${people.find((p) => p.id === form.managerId)!.lastName}` : 'None'}
                onChange={(v) => setForm({ ...form, managerId: people.find((p) => `${p.firstName} ${p.lastName}` === v)?.id ?? '' })}
                options={['None', ...people.map((p) => `${p.firstName} ${p.lastName}`)]}
              />
              <TextInput label="Start date" value={form.startedAt} onChange={(v) => setForm({ ...form, startedAt: v })} type="date" />
            </div>
            {form.type !== 'EMPLOYEE' && (
              <TextInput label="Engagement terms (rate, scope, etc.)" value={form.compensationNote} onChange={(v) => setForm({ ...form, compensationNote: v })} multiline placeholder="e.g. J$150,000/month retainer, 3-month rolling contract" />
            )}
          </div>
        </Modal>
      )}
    </div>
  )
}
