import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import { prisma } from '@/lib/prisma'
import { fmt } from '@/lib/catalog'
import Topbar from './_components/Topbar'

const STATUS_META: Record<string, { label: string; bg: string; fg: string }> = {
  PENDING: { label: 'Processing', bg: 'var(--ke-sun-50)', fg: 'var(--ke-sun-500)' },
  PACKED: { label: 'Packed', bg: 'var(--ke-blue-50)', fg: 'var(--ke-blue-600)' },
  OUT: { label: 'Out for delivery', bg: 'var(--ke-blue-50)', fg: 'var(--ke-blue-600)' },
  DONE: { label: 'Delivered', bg: 'var(--ke-green-50)', fg: 'var(--ke-green-700)' },
  CANCELLED: { label: 'Cancelled', bg: 'var(--ke-gray-100)', fg: 'var(--ke-gray-600)' },
}

export default async function HubPage() {
  const session = await getServerSession(authOptions)

  const user = session
    ? await prisma.user.findUnique({
        where: { id: session.user.id },
        include: {
          subscriptions: true,
          orders: { include: { items: true }, orderBy: { createdAt: 'desc' } },
        },
      })
    : null

  const orders = user?.orders ?? []
  const itemsPurchased = orders.reduce((sum, o) => sum + o.items.reduce((n, i) => n + i.qty, 0), 0)
  const totalSpent = orders.filter((o) => o.status !== 'CANCELLED').reduce((sum, o) => sum + o.total, 0)
  const loyaltyPoints = Math.floor(totalSpent / 100) // 1 point per J$100 spent
  const customerSince = user ? new Date(user.createdAt).getFullYear() : '—'
  const firstName = user?.name?.split(' ')[0] ?? 'there'

  const stats: { label: string; value: string | number }[] = [
    { label: 'Orders placed', value: orders.length },
    { label: 'Items purchased', value: itemsPurchased },
    { label: 'Loyalty points', value: loyaltyPoints },
    { label: 'Customer since', value: customerSince },
  ]

  return (
    <>
      <Topbar title={`Welcome back, ${firstName}`} subtitle="Here's what's happening with your account." />
      <div className="ke-screen" style={{ padding: 32 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 20 }}>
          {stats.map((s) => (
            <div key={s.label} style={{ background: '#fff', border: '1px solid var(--color-border)', borderRadius: 14, padding: 16 }}>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 21 }}>{s.value}</div>
              <div
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 9.5,
                  letterSpacing: '.12em',
                  color: 'var(--color-text-muted)',
                  marginTop: 6,
                  textTransform: 'uppercase',
                }}
              >
                {s.label}
              </div>
            </div>
          ))}
        </div>

        <div style={{ background: '#fff', border: '1px solid var(--color-border)', borderRadius: 16, padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 16 }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16, margin: 0 }}>Your orders</h3>
            <a href="/shop" style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '.14em', color: 'var(--ke-green-700)' }}>
              SHOP AGAIN →
            </a>
          </div>

          {orders.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '28px 0' }}>
              <p style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15, margin: '0 0 6px' }}>No orders yet</p>
              <p style={{ fontSize: 13, color: 'var(--color-text-muted)', margin: 0 }}>
                When you place an order it will appear here, with live delivery status.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {orders.map((o) => {
                const meta = STATUS_META[o.status] ?? STATUS_META.PENDING
                const summary = o.items.map((i) => `${i.name}${i.qty > 1 ? ` ×${i.qty}` : ''}`).join(', ')
                return (
                  <div
                    key={o.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 16,
                      padding: '14px 16px',
                      border: '1px solid var(--color-border)',
                      borderRadius: 12,
                      flexWrap: 'wrap',
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14 }}>{o.orderNo}</span>
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
                      </div>
                      <div style={{ fontSize: 12.5, color: 'var(--color-text-muted)', marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {summary} · {new Date(o.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                      <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 16 }}>{fmt(o.total)}</span>
                      <a href="/track" style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '.12em', color: 'var(--ke-green-700)' }}>
                        TRACK
                      </a>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
