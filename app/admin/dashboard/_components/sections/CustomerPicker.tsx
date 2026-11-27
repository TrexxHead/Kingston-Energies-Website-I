'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Plus, Search, UserRound, Building2, UserPlus, X } from 'lucide-react'
import TextInput from '../ui/TextInput'

/**
 * Who a manual order is for. The "+" beside the heading offers:
 *   - Existing / repeat customer — search the CRM (Customers section: account
 *     holders and past buyers, grouped by email/phone) and fill the order
 *     from their record: name, phone, email, last delivery address, company.
 *   - Company order — company name (suggested from past company orders),
 *     TRN for the invoice, and the contact person.
 *   - New customer — type the details (the default).
 * The contact fields below the picker stay editable in every mode.
 */

export type CustomerMode = 'new' | 'existing' | 'company'

export interface CrmCustomer {
  id: string
  registered: boolean
  name: string
  email: string | null
  phone: string | null
  address?: string | null
  company?: string | null
  companyTrn?: string | null
  orderCount: number
  lastActivity: string
}

export interface PickedFields {
  customerName: string
  company: string
  companyTrn: string
  phone: string
  email: string
  shippingAddress: string
}

const MODES: { id: CustomerMode; label: string; hint: string; Icon: typeof UserRound }[] = [
  { id: 'existing', label: 'Existing / repeat customer', hint: 'Pick from your customer list', Icon: UserRound },
  { id: 'company', label: 'Company order', hint: 'Bill a business: name, TRN, contact', Icon: Building2 },
  { id: 'new', label: 'New customer', hint: 'Type their details', Icon: UserPlus },
]

export default function CustomerPicker({
  mode,
  onMode,
  customerName,
  company,
  companyTrn,
  onField,
  onPick,
  linked,
  onUnlink,
}: {
  mode: CustomerMode
  onMode: (m: CustomerMode) => void
  customerName: string
  company: string
  companyTrn: string
  onField: (f: Partial<PickedFields>) => void
  onPick: (c: CrmCustomer) => void
  linked: CrmCustomer | null
  onUnlink: () => void
}) {
  const [menu, setMenu] = useState(false)
  const [crm, setCrm] = useState<CrmCustomer[] | null>(null)
  const [crmError, setCrmError] = useState('')
  const [q, setQ] = useState('')
  const menuRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  // Load the customer list the first time it's needed (existing or company mode).
  useEffect(() => {
    if (crm || mode === 'new') return
    let live = true
    fetch('/api/admin/customers')
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((d) => live && setCrm(d.customers ?? []))
      .catch(() => live && setCrmError('Couldn’t load the customer list.'))
    return () => {
      live = false
    }
  }, [mode, crm])

  useEffect(() => {
    if (mode === 'existing' && !linked) searchRef.current?.focus()
  }, [mode, linked])

  // Close the menu on an outside click or Escape.
  useEffect(() => {
    if (!menu) return
    const onDoc = (e: MouseEvent) => !menuRef.current?.contains(e.target as Node) && setMenu(false)
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setMenu(false)
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [menu])

  const matches = useMemo(() => {
    if (!crm) return []
    const needle = q.trim().toLowerCase()
    const digits = needle.replace(/\D/g, '')
    const list = crm.filter((c) => {
      if (!needle) return true
      const hay = [c.name, c.company, c.email].filter(Boolean).join(' ').toLowerCase()
      return hay.includes(needle) || (digits.length >= 3 && (c.phone ?? '').replace(/\D/g, '').includes(digits))
    })
    return list.sort((a, b) => b.lastActivity.localeCompare(a.lastActivity)).slice(0, 8)
  }, [crm, q])

  const companies = useMemo(() => [...new Set((crm ?? []).map((c) => c.company).filter((x): x is string => Boolean(x)))].sort(), [crm])
  const current = MODES.find((m) => m.id === mode)!

  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 8 }}>
        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 12.5, color: 'var(--color-text)' }}>Customer</span>
        <div ref={menuRef} style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={chip}>
            <current.Icon size={12} aria-hidden /> {current.label}
          </span>
          <button type="button" aria-label="Choose customer type" aria-haspopup="menu" aria-expanded={menu} onClick={() => setMenu((v) => !v)} style={plusBtn}>
            <Plus size={15} aria-hidden />
          </button>
          {menu && (
            <div role="menu" style={menuBox}>
              {MODES.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  role="menuitemradio"
                  aria-checked={mode === m.id}
                  onClick={() => {
                    onMode(m.id)
                    setMenu(false)
                  }}
                  style={{ ...menuItem, background: mode === m.id ? 'var(--color-surface-sunk)' : 'transparent' }}
                >
                  <m.Icon size={16} aria-hidden style={{ color: 'var(--ke-green-600, #4f8a1c)', flex: 'none', marginTop: 1 }} />
                  <span style={{ display: 'grid', gap: 2, textAlign: 'left' }}>
                    <strong style={{ fontSize: 13, fontWeight: 600 }}>{m.label}</strong>
                    <small style={{ fontSize: 11.5, color: 'var(--color-text-muted)' }}>{m.hint}</small>
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {mode === 'existing' &&
        (linked ? (
          <div style={linkedCard}>
            <div style={{ display: 'grid', gap: 2, minWidth: 0 }}>
              <strong style={{ fontSize: 13.5 }}>
                {linked.name}
                {linked.company ? <span style={{ fontWeight: 500, color: 'var(--color-text-muted)' }}> · {linked.company}</span> : null}
              </strong>
              <span style={{ fontSize: 12, color: 'var(--color-text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {[linked.phone, linked.email].filter(Boolean).join(' · ') || 'No contact on file'}
              </span>
              <span style={{ fontSize: 11.5, color: 'var(--color-text-muted)' }}>
                {linked.orderCount} {linked.orderCount === 1 ? 'order' : 'orders'} · last {fmtDate(linked.lastActivity)}
                {linked.registered ? ' · has an account' : ''}
              </span>
            </div>
            <button type="button" onClick={onUnlink} style={changeBtn}>
              Change
            </button>
          </div>
        ) : (
          <div style={{ position: 'relative' }}>
            <div style={{ position: 'relative' }}>
              <Search size={15} aria-hidden style={{ position: 'absolute', left: 12, top: 13, color: 'var(--color-text-muted)' }} />
              <input ref={searchRef} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, phone, email or company" aria-label="Search customers" style={searchInput} />
              {q && (
                <button type="button" aria-label="Clear search" onClick={() => setQ('')} style={{ position: 'absolute', right: 8, top: 9, border: 0, background: 'none', cursor: 'pointer', color: 'var(--color-text-muted)' }}>
                  <X size={15} />
                </button>
              )}
            </div>
            <div role="listbox" aria-label="Customers" style={resultsBox}>
              {crmError ? (
                <p style={emptyText}>{crmError}</p>
              ) : !crm ? (
                <p style={emptyText}>Loading customers…</p>
              ) : matches.length === 0 ? (
                <p style={emptyText}>
                  No match.{' '}
                  <button type="button" onClick={() => { onMode('new'); onField({ customerName: q.trim() }) }} style={linkBtn}>
                    Add “{q.trim() || 'new customer'}” as new
                  </button>
                </p>
              ) : (
                matches.map((c) => (
                  <button key={c.id} type="button" role="option" aria-selected={false} onClick={() => onPick(c)} style={resultRow}>
                    <span style={{ display: 'grid', gap: 1, minWidth: 0, textAlign: 'left' }}>
                      <strong style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {c.name}
                        {c.company ? <span style={{ fontWeight: 500, color: 'var(--color-text-muted)' }}> · {c.company}</span> : null}
                      </strong>
                      <small style={{ fontSize: 11.5, color: 'var(--color-text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {[c.phone, c.email].filter(Boolean).join(' · ') || 'No contact on file'}
                      </small>
                    </span>
                    <small style={{ fontSize: 11, color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>
                      {c.orderCount} {c.orderCount === 1 ? 'order' : 'orders'}
                    </small>
                  </button>
                ))
              )}
            </div>
          </div>
        ))}

      {mode === 'company' && (
        <div style={{ display: 'grid', gap: 10 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,2fr) minmax(0,1fr)', gap: 10 }}>
            <label style={{ display: 'block' }}>
              <span style={fieldLabel}>Company name</span>
              {/* Free text, with past companies offered as suggestions. */}
              <input
                value={company}
                onChange={(e) => {
                  const v = e.target.value
                  // Choosing a past company fills its TRN (if you haven't typed one).
                  const known = (crm ?? []).find((c) => c.company && c.company.toLowerCase() === v.trim().toLowerCase() && c.companyTrn)
                  onField(known && !companyTrn ? { company: v, companyTrn: known.companyTrn ?? '' } : { company: v })
                }}
                list="ke-crm-companies" placeholder="e.g. Island Logistics Ltd" autoComplete="off" style={{ ...searchInput, padding: '0 13px' }} />
              <datalist id="ke-crm-companies">
                {companies.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </label>
            <TextInput label="TRN (optional)" value={companyTrn} onChange={(v) => onField({ companyTrn: v })} placeholder="000-000-000" />
          </div>
          <TextInput label="Contact person (optional)" value={customerName} onChange={(v) => onField({ customerName: v })} placeholder="Who you’re dealing with" />
        </div>
      )}

      {mode === 'new' && <TextInput label="Customer name" value={customerName} onChange={(v) => onField({ customerName: v })} />}
    </div>
  )
}

const fieldLabel = { display: 'block', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 12.5, color: 'var(--color-text)', marginBottom: 6 } as const
const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })

const chip = { display: 'inline-flex', alignItems: 'center', gap: 5, height: 26, padding: '0 10px', borderRadius: 999, background: 'var(--color-surface-sunk)', border: '1px solid var(--color-border)', fontSize: 11.5, fontWeight: 600, color: 'var(--color-text)' } as const
const plusBtn = { display: 'inline-grid', placeItems: 'center', width: 30, height: 30, borderRadius: 999, border: '1.5px solid var(--ke-green-500, #78ad28)', background: 'var(--color-surface)', color: 'var(--ke-green-600, #4f8a1c)', cursor: 'pointer' } as const
const menuBox = { position: 'absolute', right: 0, top: 36, zIndex: 20, width: 270, padding: 6, borderRadius: 14, background: 'var(--color-surface)', border: '1px solid var(--color-border)', boxShadow: '0 12px 32px rgba(0,0,0,.18)', display: 'grid', gap: 2 } as const
const menuItem = { display: 'flex', alignItems: 'flex-start', gap: 10, width: '100%', padding: '9px 10px', border: 0, borderRadius: 10, cursor: 'pointer', color: 'var(--color-text)', fontFamily: 'var(--font-body)' } as const
const searchInput = { width: '100%', height: 42, padding: '0 34px 0 36px', border: '1.5px solid var(--color-border)', borderRadius: 12, fontSize: 13.5, background: 'var(--color-surface-sunk)', color: 'var(--color-text)', outline: 'none', fontFamily: 'var(--font-body)' } as const
const resultsBox = { marginTop: 6, maxHeight: 248, overflowY: 'auto', border: '1px solid var(--color-border)', borderRadius: 12, background: 'var(--color-surface)' } as const
const resultRow = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, width: '100%', padding: '9px 12px', border: 0, borderBottom: '1px solid var(--color-border)', background: 'transparent', cursor: 'pointer', color: 'var(--color-text)', fontFamily: 'var(--font-body)' } as const
const emptyText = { margin: 0, padding: '12px', fontSize: 12.5, color: 'var(--color-text-muted)' } as const
const linkBtn = { border: 0, background: 'none', padding: 0, color: 'var(--color-primary-strong)', fontWeight: 600, cursor: 'pointer', fontSize: 12.5 } as const
const linkedCard = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '10px 12px', borderRadius: 12, border: '1.5px solid var(--ke-green-500, #78ad28)', background: 'var(--color-surface-sunk)' } as const
const changeBtn = { flex: 'none', height: 30, padding: '0 12px', borderRadius: 999, border: '1.5px solid var(--color-border)', background: 'var(--color-surface)', fontSize: 12, fontWeight: 600, cursor: 'pointer', color: 'var(--color-text)' } as const
