'use client'

import { useCallback, useEffect, useState } from 'react'
import { Flag, CheckCircle2 } from 'lucide-react'
import { cardStyle, h3Style } from '../ui/card'
import Button from '../ui/Button'
import Modal from '../ui/Modal'
import TextInput from '../ui/TextInput'
import { fmt } from '../mockData'

interface OpeningAccount { code: string; name: string; type: 'ASSET' | 'LIABILITY'; currentBalance: number }
interface Data { alreadySet: boolean; setAt: string | null; accounts: OpeningAccount[] }

/**
 * Guided opening balances.
 *
 * Books that start part-way through a business's life have no history for what
 * it already owned or owed, so a fresh Balance Sheet looks lopsided until this
 * is set. The difference between assets and liabilities becomes Opening Balance
 * Equity — the owner's existing stake.
 */
export default function OpeningBalancesCard({ onDone }: { onDone?: () => void }) {
  const [data, setData] = useState<Data | null>(null)
  const [open, setOpen] = useState(false)
  const [asOf, setAsOf] = useState('')
  const [values, setValues] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    const res = await fetch('/api/admin/finance/ledger/opening')
    if (res.ok) setData(await res.json())
  }, [])
  useEffect(() => { load() }, [load])

  const assets = data?.accounts.filter((a) => a.type === 'ASSET') ?? []
  const liabilities = data?.accounts.filter((a) => a.type === 'LIABILITY') ?? []

  const num = (code: string) => Number(values[code]) || 0
  const totalAssets = assets.reduce((s, a) => s + num(a.code), 0)
  const totalLiabilities = liabilities.reduce((s, a) => s + num(a.code), 0)
  const equity = Math.round((totalAssets - totalLiabilities) * 100) / 100

  const submit = async () => {
    setError('')
    if (!asOf) return setError('Choose the date these balances are as at.')
    const balances: Record<string, number> = {}
    for (const [code, v] of Object.entries(values)) {
      const n = Number(v)
      if (n) balances[code] = n
    }
    if (Object.keys(balances).length === 0) return setError('Enter at least one opening balance.')

    setBusy(true)
    const res = await fetch('/api/admin/finance/ledger/opening', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ asOf, balances }),
    })
    const d = await res.json().catch(() => ({}))
    setBusy(false)
    if (!res.ok) return setError(d.error ?? 'Could not post opening balances.')
    setOpen(false)
    load()
    onDone?.()
  }

  if (!data) return null

  if (data.alreadySet) {
    return (
      <div style={{ ...cardStyle, display: 'flex', alignItems: 'center', gap: 12 }}>
        <CheckCircle2 size={16} color="var(--ke-green-600)" />
        <div style={{ flex: 1 }}>
          <h3 style={{ ...h3Style, margin: 0 }}>Opening balances set</h3>
          <p style={{ fontSize: 12.5, color: 'var(--color-text-muted)', margin: '4px 0 0' }}>
            Recorded as at {data.setAt ? new Date(data.setAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'}.
            Corrections go through a normal journal entry so the original stays in the audit trail.
          </p>
        </div>
      </div>
    )
  }

  return (
    <>
      <div style={{ ...cardStyle, display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap', border: '1px solid var(--ke-sun-400)' }}>
        <Flag size={16} color="var(--ke-sun-500)" style={{ flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 240 }}>
          <h3 style={{ ...h3Style, margin: 0 }}>Set opening balances</h3>
          <p style={{ fontSize: 12.5, color: 'var(--color-text-muted)', margin: '6px 0 0' }}>
            Your books start from the day the ledger began, so anything the business already owned or owed isn&apos;t in them yet —
            that&apos;s why the Balance Sheet currently looks lopsided. This records that starting position once.
          </p>
        </div>
        <Button size="sm" variant="primary" onClick={() => setOpen(true)}>Set up</Button>
      </div>

      {open && (
        <Modal
          title="Opening balances"
          onClose={() => { setOpen(false); setError('') }}
          footer={
            <>
              <Button size="sm" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button size="sm" variant="primary" onClick={submit} disabled={busy}>{busy ? 'Posting…' : 'Post opening balances'}</Button>
            </>
          }
        >
          <p style={{ fontSize: 12.5, color: 'var(--color-text-muted)', margin: '0 0 14px' }}>
            Enter what the business owned and owed on the day you want the books to start. Leave anything you don&apos;t have blank —
            you can always post an adjusting entry later.
          </p>

          <TextInput label="Balances as at" value={asOf} onChange={setAsOf} type="date" />

          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '.12em', color: 'var(--color-text-muted)', margin: '16px 0 8px' }}>
            WHAT THE BUSINESS OWNS
          </div>
          {assets.map((a) => (
            <Row key={a.code} account={a} value={values[a.code] ?? ''} onChange={(v) => setValues({ ...values, [a.code]: v })} />
          ))}

          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '.12em', color: 'var(--color-text-muted)', margin: '18px 0 8px' }}>
            WHAT THE BUSINESS OWES
          </div>
          {liabilities.map((a) => (
            <Row key={a.code} account={a} value={values[a.code] ?? ''} onChange={(v) => setValues({ ...values, [a.code]: v })} />
          ))}

          <div style={{ borderTop: '1px solid var(--color-border)', marginTop: 16, paddingTop: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '3px 0' }}>
              <span style={{ color: 'var(--color-text-muted)' }}>Total owned</span>
              <span>{fmt(Math.round(totalAssets))}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '3px 0' }}>
              <span style={{ color: 'var(--color-text-muted)' }}>Total owed</span>
              <span>{fmt(Math.round(totalLiabilities))}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 14, paddingTop: 8, marginTop: 4, borderTop: '1px solid var(--color-border)' }}>
              <span>Owner&apos;s opening stake</span>
              <span>{fmt(Math.round(equity))}</span>
            </div>
            <p style={{ fontSize: 11.5, color: 'var(--color-text-subtle)', margin: '8px 0 0' }}>
              The difference is posted to Opening Balance Equity, which is what makes the Balance Sheet balance from day one.
            </p>
          </div>

          {error && <p style={{ fontSize: 12.5, color: 'var(--color-danger)', marginTop: 10 }}>{error}</p>}
        </Modal>
      )}
    </>
  )
}

function Row({ account, value, onChange }: { account: OpeningAccount; value: string; onChange: (v: string) => void }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 130px', gap: 10, alignItems: 'center', padding: '5px 0' }}>
      <span style={{ fontSize: 13 }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-text-muted)', marginRight: 8 }}>{account.code}</span>
        {account.name}
      </span>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="0"
        style={{ height: 34, padding: '0 10px', border: '1px solid var(--color-border)', borderRadius: 8, fontSize: 13, textAlign: 'right', fontFamily: 'var(--font-body)' }}
      />
    </div>
  )
}
