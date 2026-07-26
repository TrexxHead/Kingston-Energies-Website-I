'use client'

import { useCallback, useEffect, useState } from 'react'
import { ArrowDownLeft, ArrowUpRight, Search } from 'lucide-react'
import { cardStyle, h3Style } from '../ui/card'
import Button from '../ui/Button'
import { fmt } from '../mockData'

interface Txn {
  id: string
  type: 'in' | 'out'
  label: string
  detail: string
  amount: number
  date: string
}

const PAGE_SIZE = 20

export default function TransactionsTab() {
  const [txns, setTxns] = useState<Txn[] | null>(null)
  const [total, setTotal] = useState(0)
  const [offset, setOffset] = useState(0)
  const [q, setQ] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')

  const load = useCallback(async (off: number, query: string, fromD: string, toD: string) => {
    setTxns(null)
    const params = new URLSearchParams({ offset: String(off), pageSize: String(PAGE_SIZE) })
    if (query) params.set('q', query)
    if (fromD) params.set('from', fromD)
    if (toD) params.set('to', toD)
    const res = await fetch(`/api/admin/finance/transactions?${params}`)
    const d = res.ok ? await res.json() : { transactions: [], total: 0 }
    setTxns(d.transactions ?? [])
    setTotal(d.total ?? 0)
  }, [])

  useEffect(() => {
    load(0, q, from, to)
    setOffset(0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, from, to])

  const goto = (off: number) => {
    setOffset(off)
    load(off, q, from, to)
  }

  const page = Math.floor(offset / PAGE_SIZE) + 1
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return (
    <div style={cardStyle}>
      <h3 style={h3Style}>All transactions</h3>
      <p style={{ fontSize: 12.5, color: 'var(--color-text-muted)', margin: '-4px 0 14px' }}>
        Paid orders (money in) and logged expenses (money out), most recent first. {total} total.
      </p>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
        <div style={{ position: 'relative', flex: '1 1 200px' }}>
          <Search size={14} style={{ position: 'absolute', left: 11, top: 10, color: 'var(--color-text-subtle)' }} />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search order, customer, expense…"
            style={{ width: '100%', height: 34, padding: '0 12px 0 32px', border: '1px solid var(--color-border)', borderRadius: 999, fontSize: 12.5, outline: 'none', fontFamily: 'var(--font-body)' }}
          />
        </div>
        <input
          type="date"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          style={{ height: 34, padding: '0 10px', border: '1px solid var(--color-border)', borderRadius: 8, fontSize: 12.5 }}
        />
        <input
          type="date"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          style={{ height: 34, padding: '0 10px', border: '1px solid var(--color-border)', borderRadius: 8, fontSize: 12.5 }}
        />
      </div>

      {!txns ? (
        <p style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>Loading…</p>
      ) : txns.length === 0 ? (
        <p style={{ fontSize: 12.5, color: 'var(--color-text-muted)', margin: 0 }}>No transactions match.</p>
      ) : (
        <>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {txns.map((t, i) => (
              <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 0', borderTop: i > 0 ? '1px solid var(--color-border)' : undefined }}>
                <span
                  style={{
                    width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: t.type === 'in' ? 'var(--color-success-soft)' : 'var(--color-danger-soft)',
                    color: t.type === 'in' ? 'var(--ke-green-700)' : 'var(--color-danger)',
                  }}
                >
                  {t.type === 'in' ? <ArrowDownLeft size={15} /> : <ArrowUpRight size={15} />}
                </span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: 'block', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 13.5 }}>{t.label}</span>
                  <span style={{ display: 'block', fontSize: 11.5, color: 'var(--color-text-muted)' }}>{t.detail ? `${t.detail} · ` : ''}{t.date}</span>
                </span>
                <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14, color: t.type === 'in' ? 'var(--ke-green-700)' : 'var(--color-text)', whiteSpace: 'nowrap' }}>
                  {t.type === 'in' ? '+' : '−'}{fmt(t.amount)}
                </span>
              </div>
            ))}
          </div>

          {pageCount > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--color-border)' }}>
              <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>Page {page} of {pageCount}</span>
              <div style={{ display: 'flex', gap: 8 }}>
                <Button size="sm" variant="outline" onClick={() => goto(Math.max(0, offset - PAGE_SIZE))} disabled={offset === 0}>Previous</Button>
                <Button size="sm" variant="outline" onClick={() => goto(offset + PAGE_SIZE)} disabled={offset + PAGE_SIZE >= total}>Next</Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
