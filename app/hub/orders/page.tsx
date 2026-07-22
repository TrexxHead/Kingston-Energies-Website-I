import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import { prisma } from '@/lib/prisma'
import { fmt } from '@/lib/catalog'
import Topbar from '../_components/Topbar'

const STATUS_META: Record<string, { label: string; bg: string; fg: string }> = {
  PENDING: { label: 'Processing', bg: 'var(--ke-sun-50)', fg: 'var(--ke-sun-500)' },
  PACKED: { label: 'Packed', bg: 'var(--ke-blue-50)', fg: 'var(--ke-blue-600)' },
  OUT: { label: 'Out for delivery', bg: 'var(--ke-blue-50)', fg: 'var(--ke-blue-600)' },
  DONE: { label: 'Delivered', bg: 'var(--ke-green-50)', fg: 'var(--ke-green-700)' },
  CANCELLED: { label: 'Cancelled', bg: 'var(--ke-gray-100)', fg: 'var(--ke-gray-600)' },
}

export default async function HubOrdersPage() {
  const session = await getServerSession(authOptions)
  const orders = session?.user?.id
    ? await prisma.order.findMany({
        where: { userId: session.user.id },
        include: { items: true },
        orderBy: { createdAt: 'desc' },
      })
    : []

  return (
    <>
      <Topbar title="Your orders" subtitle="Every order you've placed, with live delivery status." />
      <div className="ke-screen" style={{ padding: 32 }}>
        {orders.length === 0 ? (
          <div style={{ background: '#fff', border: '1px solid var(--color-border)', borderRadius: 16, padding: '40px 24px', textAlign: 'center' }}>
            <p style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16, margin: '0 0 6px' }}>No orders yet</p>
            <p style={{ fontSize: 13.5, color: 'var(--color-text-muted)', margin: '0 0 16px' }}>
              When you place an order it will appear here, with a full item breakdown and delivery status.
            </p>
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
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {orders.map((o) => {
              const meta = STATUS_META[o.status] ?? STATUS_META.PENDING
              return (
                <div key={o.id} style={{ background: '#fff', border: '1px solid var(--color-border)', borderRadius: 16, padding: 20 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 14 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 16 }}>{o.orderNo}</span>
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
                    <a href="/track" style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '.14em', color: 'var(--ke-green-700)' }}>
                      TRACK DELIVERY →
                    </a>
                    <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 17 }}>{fmt(o.total)}</span>
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
