'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Download, FileText, Lock } from 'lucide-react'
import { cardStyle, h3Style } from '../ui/card'
import Button from '../ui/Button'
import Badge from '../ui/Badge'
import BarChart from '../charts/BarChart'
import { ChartTable } from '../charts/ChartFrame'
import { CHROME, money } from '../charts/palette'
import ProfitLossCard from './ProfitLossCard'

type ReportId = 'aging-ar' | 'aging-ap' | 'pl' | null

interface CatalogEntry {
  id: string
  label: string
  description: string
  /** An internal report id, an existing page, or null when it isn't built. */
  report?: ReportId
  href?: string
  /** Why it isn't available yet — stated rather than shown as a dead link. */
  blocked?: string
}

/**
 * The report catalogue.
 *
 * Reports that exist link straight to them. Reports the FRD asks for that
 * aren't built say what they are waiting on, rather than being listed as
 * though they work — a report index full of dead links is worse than a short
 * one that is honest.
 */
const CATALOG: { group: string; items: CatalogEntry[] }[] = [
  {
    group: 'Business overview',
    items: [
      { id: 'pl', label: 'Profit & loss', description: 'Revenue, cost of sales and operating expenses', report: 'pl' },
      { id: 'balance', label: 'Balance sheet', description: 'What the business owns and owes', href: '/admin/dashboard/finance/accounting' },
      { id: 'cashflow', label: 'Statement of cash flows', description: 'What actually moved in and out', href: '/admin/dashboard/finance/cash-flow' },
      { id: 'trial', label: 'Trial balance', description: 'Every account, debits against credits', href: '/admin/dashboard/finance/accounting' },
    ],
  },
  {
    group: 'Accounts receivable',
    items: [
      { id: 'ar-aging', label: 'Aging summary', description: 'Who owes you, and for how long', report: 'aging-ar' },
      { id: 'ar-invoices', label: 'Invoice detail', description: 'Every order and its payment state', href: '/admin/dashboard/orders' },
      {
        id: 'ar-collections',
        label: 'Collections',
        description: 'Chase history per customer',
        blocked: 'Needs a record of when each customer was chased. Nothing logs that yet, so the report would be empty.',
      },
    ],
  },
  {
    group: 'Accounts payable',
    items: [
      { id: 'ap-aging', label: 'Aging summary', description: 'What you owe, and since when', report: 'aging-ap' },
      {
        id: 'ap-bills',
        label: 'Bills & supplier balances',
        description: 'Outstanding supplier invoices',
        blocked: 'Supplier bills are not modelled as documents. Expenses are recorded as already settled. This needs a bills workflow first.',
      },
    ],
  },
  {
    group: 'Sales',
    items: [
      { id: 'sales-product', label: 'Sales by product', description: 'What sold and what it earned', href: '/admin/dashboard/finance/sales' },
      { id: 'sales-customer', label: 'Sales by customer', description: 'Who buys, and how much', href: '/admin/dashboard/customers' },
      {
        id: 'sales-territory',
        label: 'Sales by territory',
        description: 'Revenue by parish',
        blocked: 'Delivery addresses are stored as free text, so a parish breakdown would be a guess. Needs a structured parish field.',
      },
    ],
  },
  {
    group: 'Expenses',
    items: [
      { id: 'exp-category', label: 'Expenses by category', description: 'Where the money goes', href: '/admin/dashboard/finance/expenses' },
      { id: 'exp-budget', label: 'Budget vs actual', description: 'Targets against what was spent', href: '/admin/dashboard/finance/expenses' },
      {
        id: 'exp-vendor',
        label: 'Vendor spend',
        description: 'Spend by supplier',
        blocked: 'Expenses carry a category but not a supplier. Confirming receipts records the vendor. This becomes possible once there is enough of that history.',
      },
    ],
  },
  {
    group: 'Inventory',
    items: [
      { id: 'inv-valuation', label: 'Inventory valuation', description: 'Stock on hand at cost', href: '/admin/dashboard/inventory' },
      { id: 'inv-movement', label: 'Stock movement', description: 'Every adjustment and why', href: '/admin/dashboard/inventory' },
    ],
  },
  {
    group: 'Payroll',
    items: [
      { id: 'pay-summary', label: 'Payroll summary', description: 'Gross, deductions and net per run', href: '/admin/dashboard/finance/payroll' },
      { id: 'pay-statutory', label: 'Statutory deductions', description: 'PAYE, NIS, NHT, education tax and HEART', href: '/admin/dashboard/finance/payroll' },
    ],
  },
  {
    group: 'Tax',
    items: [
      { id: 'tax-gct', label: 'GCT summary', description: 'Collected against owed', href: '/admin/dashboard/finance/taxes' },
      {
        id: 'tax-filing',
        label: 'Filing history',
        description: 'What was filed and when',
        blocked: 'Nothing records a filing yet. Logging returns as they are submitted would make this real.',
      },
    ],
  },
  {
    group: 'Accounting',
    items: [
      { id: 'acc-gl', label: 'General ledger', description: 'Every line, by account', href: '/admin/dashboard/finance/accounting' },
      { id: 'acc-journal', label: 'Journal', description: 'Entries in the order they were posted', href: '/admin/dashboard/finance/accounting' },
    ],
  },
]

export default function ReportsHub() {
  const [open, setOpen] = useState<ReportId>(null)

  if (open === 'pl') return <Framed onBack={() => setOpen(null)}><ProfitLossCard view="report" /></Framed>
  if (open === 'aging-ar') return <Framed onBack={() => setOpen(null)}><AgingReport type="receivables" /></Framed>
  if (open === 'aging-ap') return <Framed onBack={() => setOpen(null)}><AgingReport type="payables" /></Framed>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {CATALOG.map((section) => (
        <div key={section.group} style={cardStyle}>
          <h3 style={{ ...h3Style, margin: '0 0 12px' }}>{section.group}</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: 10 }}>
            {section.items.map((item) => {
              const inner = (
                <>
                  <span
                    style={{
                      width: 30,
                      height: 30,
                      borderRadius: 9,
                      background: item.blocked ? 'var(--color-surface-sunk)' : 'var(--ke-green-50)',
                      color: item.blocked ? CHROME.textSubtle : 'var(--ke-green-700)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    {item.blocked ? <Lock size={14} /> : <FileText size={14} />}
                  </span>
                  <span style={{ minWidth: 0, flex: 1 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                      <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 13.5, color: item.blocked ? CHROME.textMuted : CHROME.text }}>
                        {item.label}
                      </span>
                      {item.blocked && <Badge tone="neutral">Not built</Badge>}
                    </span>
                    <span style={{ display: 'block', fontSize: 11.5, color: CHROME.textMuted, marginTop: 2, lineHeight: 1.45 }}>
                      {item.blocked ?? item.description}
                    </span>
                  </span>
                </>
              )

              const style: React.CSSProperties = {
                display: 'flex',
                alignItems: 'flex-start',
                gap: 11,
                padding: '11px 12px',
                border: '1px solid var(--color-border)',
                borderRadius: 12,
                background: 'var(--color-surface)',
                textAlign: 'left',
                width: '100%',
                textDecoration: 'none',
                cursor: item.blocked ? 'default' : 'pointer',
              }

              if (item.blocked) return <div key={item.id} style={style}>{inner}</div>
              if (item.report) {
                return (
                  <button key={item.id} type="button" onClick={() => setOpen(item.report as ReportId)} style={style}>
                    {inner}
                  </button>
                )
              }
              return (
                <Link key={item.id} href={item.href as string} style={style}>
                  {inner}
                </Link>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

function Framed({ onBack, children }: { onBack: () => void; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <Button size="sm" variant="outline" onClick={onBack}>
          <ArrowLeft size={14} style={{ marginRight: 6, verticalAlign: -2 }} />
          All reports
        </Button>
      </div>
      {children}
    </div>
  )
}

// ---------------------------------------------------------------------------

interface AgingData {
  type: string
  buckets: { key: string; label: string; amount: number; count: number }[]
  total: number
  oldestDays: number
  scope: string
  rows: { id: string; reference: string; party: string; date: string; ageDays: number; amount: number; bucket: string }[]
}

function AgingReport({ type }: { type: 'receivables' | 'payables' }) {
  const [data, setData] = useState<AgingData | null>(null)

  const load = useCallback(async () => {
    const res = await fetch(`/api/admin/finance/reports/aging?type=${type}`)
    if (res.ok) setData(await res.json())
  }, [type])
  useEffect(() => {
    load()
  }, [load])

  if (!data) return <div style={cardStyle}><p style={{ fontSize: 13, color: CHROME.textMuted, margin: 0 }}>Building the report…</p></div>

  const title = type === 'receivables' ? 'Receivables aging' : 'Payables aging'

  const csv = () => {
    const header = ['Reference', 'Party', 'Date', 'Age (days)', 'Amount (JMD)']
    const lines = [header, ...data.rows.map((r) => [r.reference, r.party, r.date.slice(0, 10), String(r.ageDays), String(r.amount)])]
    // Quote every field so a comma in a customer's name can't shift a column.
    const body = lines.map((l) => l.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
    const url = URL.createObjectURL(new Blob([body], { type: 'text/csv' }))
    const a = document.createElement('a')
    a.href = url
    a.download = `${type}-aging-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <BarChart
        title={title}
        subtitle={data.total > 0 ? `${money(data.total)} across ${data.rows.length} item${data.rows.length === 1 ? '' : 's'}. Oldest is ${data.oldestDays} days.` : 'Nothing outstanding.'}
        categories={data.buckets.map((b) => b.label)}
        series={[{ label: type === 'receivables' ? 'Owed to us' : 'We owe', values: data.buckets.map((b) => b.amount) }]}
        horizontal
        height={200}
        footnote={data.scope}
        actions={
          data.rows.length > 0 ? (
            <Button size="sm" variant="outline" onClick={csv} iconRight={<Download size={13} />}>
              CSV
            </Button>
          ) : undefined
        }
      />

      {data.rows.length > 0 && (
        <div style={cardStyle}>
          <h3 style={{ ...h3Style, margin: '0 0 4px' }}>Detail</h3>
          <p style={{ fontSize: 12.5, color: CHROME.textMuted, margin: '0 0 12px' }}>Oldest first: that is the order worth working through.</p>
          <ChartTable
            columns={['Reference', 'Party', 'Age', 'Amount']}
            rows={data.rows.map((r) => [`${r.reference} · ${r.party}`, new Date(r.date).toLocaleDateString('en-JM', { day: 'numeric', month: 'short', year: 'numeric' }), `${r.ageDays}d`, money(r.amount)])}
          />
        </div>
      )}
    </div>
  )
}
