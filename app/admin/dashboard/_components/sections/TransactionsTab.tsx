'use client'

import { useEffect, useState } from 'react'
import { ArrowDownLeft, ArrowUpRight } from 'lucide-react'
import { cardStyle, h3Style } from '../ui/card'
import { fmt } from '../mockData'

interface Txn {
  id: string
  type: 'in' | 'out'
  label: string
  detail: string
  amount: number
  date: string
}

export default function TransactionsTab() {
  const [txns, setTxns] = useState<Txn[] | null>(null)

  useEffect(() => {
    fetch('/api/admin/finance/transactions')
      .then((r) => (r.ok ? r.json() : { transactions: [] }))
      .then((d) => setTxns(d.transactions ?? []))
      .catch(() => setTxns([]))
  }, [])

  return (
    <div style={cardStyle}>
      <h3 style={h3Style}>All transactions</h3>
      <p style={{ fontSize: 12.5, color: 'var(--color-text-muted)', margin: '-4px 0 14px' }}>
        Paid orders (money in) and logged expenses (money out), most recent first.
      </p>
      {!txns ? (
        <p style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>Loading…</p>
      ) : txns.length === 0 ? (
        <p style={{ fontSize: 12.5, color: 'var(--color-text-muted)', margin: 0 }}>No transactions yet.</p>
      ) : (
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
      )}
    </div>
  )
}
