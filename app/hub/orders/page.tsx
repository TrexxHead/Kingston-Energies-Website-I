import Link from 'next/link'
import { getServerSession } from 'next-auth'
import type { OrderStatus } from '@prisma/client'
import { authOptions } from '@/lib/authOptions'
import { prisma } from '@/lib/prisma'
import { fmt } from '@/lib/catalog'
import Topbar from '../_components/Topbar'
import CancelOrderButton from './CancelOrderButton'

const STATUS_META: Record<string, { label: string; bg: string; fg: string }> = {
  PENDING: { label: 'Processing', bg: 'var(--ke-sun-50)', fg: 'var(--ke-sun-500)' },
  PACKED: { label: 'Packed', bg: 'var(--ke-blue-50)', fg: 'var(--ke-blue-600)' },
  OUT: { label: 'Out for delivery', bg: 'var(--ke-blue-50)', fg: 'var(--ke-blue-600)' },
  DONE: { label: 'Delivered', bg: 'var(--ke-green-50)', fg: 'var(--ke-green-700)' },
  CANCELLED: { label: 'Cancelled', bg: 'var(--ke-gray-100)', fg: 'var(--ke-gray-600)' },
}

const STATUS_FILTERS = ['ALL', 'PENDING', 'PACKED', 'OUT', 'DONE', 'CANCELLED'] as const
const STATUS_FILTER_LABEL: Record<(typeof STATUS_FILTERS)[number], string> = {
  ALL: 'All',
  PENDING: 'Processing',
  PACKED: 'Packed',
  OUT: 'Out for delivery',
  DONE: 'Delivered',
  CANCELLED: 'Cancelled',
}

const RANGE_FILTERS = ['ALL', 'THIS_MONTH', 'LAST_MONTH'] as const
const RANGE_FILTER_LABEL: Record<(typeof RANGE_FILTERS)[number], string> = {
  ALL: 'All time',
  THIS_MONTH: 'This month',
  LAST_MONTH: 'Last month',
}

function rangeBounds(range: string): { gte?: Date; lt?: Date } {
  const now = new Date()
  if (range === 'THIS_MONTH') {
    const start = new Date(now.getFullYear(), now.getMonth(), 1)
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 1)
    return { gte: start, lt: end }
  }
  if (range === 'LAST_MONTH') {
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const end = new Date(now.getFullYear(), now.getMonth(), 1)
    return { gte: start, lt: end }
  }
  return {}
}

// Load orders defensively — a transient DB/schema issue shows an empty state
// rather than crashing the whole account area.
async function loadOrders(userId: string, status: string, range: string) {
  try {
    const { gte, lt } = rangeBounds(range)
    return await prisma.order.findMany({
      where: {
        userId,
        ...(status !== 'ALL' ? { status: status as OrderStatus } : {}),
        ...(gte && lt ? { createdAt: { gte, lt } } : {}),
      },
      include: { items: true },
      orderBy: { createdAt: 'desc' },
    })
  } catch {
    return []
  }
}

function filterHref(status: string, range: string): string {
  const params = new URLSearchParams()
  if (status !== 'ALL') params.set('status', status)
  if (range !== 'ALL') params.set('range', range)
  const qs = params.toString()
  return qs ? `/hub/orders?${qs}` : '/hub/orders'
}

function FilterPill({ active, href, children }: { active: boolean; href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      style={{
        fontFamily: 'var(--font-display)',
        fontWeight: 600,
        fontSize: 12,
        padding: '6px 14px',
        borderRadius: 999,
        border: `1.5px solid ${active ? 'var(--ke-green-500)' : 'var(--color-border)'}`,
        background: active ? 'var(--ke-green-50, #eef7ee)' : '#fff',
        color: active ? 'var(--ke-green-700)' : 'var(--color-text-muted)',
        textDecoration: 'none',
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </Link>
  )
}

export default async function HubOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; range?: string }>
}) {
  const session = await getServerSession(authOptions)
  const params = await searchParams
  const status = (STATUS_FILTERS as readonly string[]).includes(params.status ?? '') ? (params.status as string) : 'ALL'
  const range = (RANGE_FILTERS as readonly string[]).includes(params.range ?? '') ? (params.range as string) : 'ALL'

  let orders: Awaited<ReturnType<typeof loadOrders>> = []
  if (session?.user?.id) {
    orders = await loadOrders(session.user.id, status, range)
  }
  const filtered = status !== 'ALL' || range !== 'ALL'

  return (
    <>
      <Topbar title="Your orders" subtitle="Every order you've placed, with live delivery status." />
      <div className="ke-screen" style={{ padding: 32 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
          {STATUS_FILTERS.map((s) => (
            <FilterPill key={s} active={status === s} href={filterHref(s, range)}>
              {STATUS_FILTER_LABEL[s]}
            </FilterPill>
          ))}
          <span style={{ width: 1, alignSelf: 'stretch', background: 'var(--color-border)', margin: '0 4px' }} />
          {RANGE_FILTERS.map((r) => (
            <FilterPill key={r} active={range === r} href={filterHref(status, r)}>
              {RANGE_FILTER_LABEL[r]}
            </FilterPill>
          ))}
        </div>

        {orders.length === 0 ? (
          <div style={{ background: '#fff', border: '1px solid var(--color-border)', borderRadius: 16, padding: '40px 24px', textAlign: 'center' }}>
            <p style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16, margin: '0 0 6px' }}>
              {filtered ? 'No orders match these filters' : 'No orders yet'}
            </p>
            <p style={{ fontSize: 13.5, color: 'var(--color-text-muted)', margin: '0 0 16px' }}>
              {filtered
                ? 'Try a different status or date range.'
                : 'When you place an order it will appear here, with a full item breakdown and delivery status.'}
            </p>
            {filtered ? (
              <Link
                href="/hub/orders"
                style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '.14em', color: 'var(--ke-green-700)' }}
              >
                CLEAR FILTERS
              </Link>
            ) : (
              <a
                href="/shop"
                style={{
                  display: 'inline-block',
                  padding: '10px 20px',
                  borderRadius: 999,
                  background: 'var(--color-primary)',
                  color: '#fff',
                  fontFamily: 'var(--font-display)',
                  fontWeight: 600,
                  fontSize: 13.5,
                }}
              >
                Start shopping
              </a>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {orders.map((o) => {
              const meta = STATUS_META[o.status] ?? STATUS_META.PENDING
              return (
                <div key={o.id} style={{ background: '#fff', border: '1px solid var(--color-border)', borderRadius: 16, padding: 20 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 14 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <Link href={`/hub/orders/${o.id}`} style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 16, color: 'var(--color-text)', textDecoration: 'none' }}>
                        {o.orderNo}
                      </Link>
                      {!o.paid && o.status !== 'CANCELLED' && !o.proofOfPaymentPath && (
                        <Link href={`/hub/orders/${o.id}`} style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 10.5, color: 'var(--ke-sun-500)', textDecoration: 'none' }}>
                          Upload proof of payment
                        </Link>
                      )}
                      <span
                        style={{
                          fontFamily: 'var(--font-display)',
                          fontWeight: 600,
                          fontSize: 11,
                          padding: '2px 9px',
                          borderRadius: 999,
                          background: meta.bg,
                          color: meta.fg,
                        }}
                      >
                        {meta.label}
                      </span>
                      {o.delayed && (
                        <span
                          style={{
                            fontFamily: 'var(--font-display)',
                            fontWeight: 600,
                            fontSize: 11,
                            padding: '2px 9px',
                            borderRadius: 999,
                            background: 'var(--ke-sun-50)',
                            color: 'var(--ke-sun-500)',
                          }}
                        >
                          Delayed
                        </span>
                      )}
                    </div>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11.5, color: 'var(--color-text-muted)' }}>
                      {new Date(o.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, borderTop: '1px solid var(--color-border)', paddingTop: 12 }}>
                    {o.items.map((i) => (
                      <div key={i.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 13.5 }}>
                        <span style={{ color: 'var(--color-text)' }}>
                          {i.name}
                          {i.qty > 1 ? <span style={{ color: 'var(--color-text-muted)' }}> × {i.qty}</span> : null}
                        </span>
                        <span style={{ color: 'var(--color-text-muted)' }}>{fmt(i.price * i.qty)}</span>
                      </div>
                    ))}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, borderTop: '1px solid var(--color-border)', marginTop: 12, paddingTop: 12 }}>
                    <a href={`/track?no=${encodeURIComponent(o.orderNo)}`} style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '.14em', color: 'var(--ke-green-700)' }}>
                      TRACK DELIVERY →
                    </a>
                    <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 17 }}>{fmt(o.total)}</span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginTop: 12, flexWrap: 'wrap' }}>
                    <a
                      href={`/api/orders/${o.id}/invoice`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 12.5, color: 'var(--ke-green-700)', textDecoration: 'none' }}
                    >
                      Download invoice
                    </a>
                    <CancelOrderButton orderId={o.id} status={o.status} cancelReason={o.cancelReason} />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </>
  )
}
