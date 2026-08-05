import { notFound } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import { prisma } from '@/lib/prisma'
import { fmt } from '@/lib/catalog'
import Topbar from '../../_components/Topbar'
import CancelOrderButton from '../CancelOrderButton'
import ProofOfPaymentUpload from './ProofOfPaymentUpload'

const STATUS_META: Record<string, { label: string; bg: string; fg: string }> = {
  PENDING: { label: 'Processing', bg: 'var(--ke-sun-50)', fg: 'var(--ke-sun-500)' },
  PACKED: { label: 'Packed', bg: 'var(--ke-blue-50)', fg: 'var(--ke-blue-600)' },
  OUT: { label: 'Out for delivery', bg: 'var(--ke-blue-50)', fg: 'var(--ke-blue-600)' },
  DONE: { label: 'Delivered', bg: 'var(--ke-green-50)', fg: 'var(--ke-green-700)' },
  CANCELLED: { label: 'Cancelled', bg: 'var(--ke-gray-100)', fg: 'var(--ke-gray-600)' },
}

export default async function HubOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) notFound()

  const order = await prisma.order.findUnique({ where: { id }, include: { items: true } }).catch(() => null)
  if (!order || order.userId !== session.user.id) notFound()

  const meta = STATUS_META[order.status] ?? STATUS_META.PENDING

  return (
    <>
      <Topbar title={order.orderNo} subtitle="Order details" />
      <div className="ke-screen" style={{ padding: 32, maxWidth: 640 }}>
        <div style={{ background: '#fff', border: '1px solid var(--color-border)', borderRadius: 16, padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 18 }}>{order.orderNo}</span>
              <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 11, padding: '3px 10px', borderRadius: 999, background: meta.bg, color: meta.fg }}>
                {meta.label}
              </span>
            </div>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11.5, color: 'var(--color-text-muted)' }}>
              {new Date(order.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
            </span>
          </div>

          {order.delayed && (
            <div
              style={{
                display: 'flex',
                gap: 10,
                alignItems: 'flex-start',
                background: 'var(--ke-sun-50)',
                border: '1px solid rgba(247,148,30,.3)',
                borderRadius: 12,
                padding: '12px 14px',
                marginBottom: 14,
              }}
            >
              <span
                style={{
                  fontFamily: 'var(--font-display)',
                  fontWeight: 700,
                  fontSize: 11.5,
                  color: 'var(--ke-sun-700, #8a5a00)',
                  textTransform: 'uppercase',
                  letterSpacing: '.04em',
                  flexShrink: 0,
                }}
              >
                Delayed
              </span>
              <span style={{ fontSize: 13, color: 'var(--ke-sun-700, #8a5a00)', lineHeight: 1.5 }}>
                {order.delayReason || 'This order has been delayed — we\'ll update you as soon as it moves.'}
              </span>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, borderTop: '1px solid var(--color-border)', paddingTop: 14 }}>
            {order.items.map((i) => (
              <div key={i.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 13.5 }}>
                <span style={{ color: 'var(--color-text)' }}>
                  {i.name}
                  {i.qty > 1 ? <span style={{ color: 'var(--color-text-muted)' }}> × {i.qty}</span> : null}
                </span>
                <span style={{ color: 'var(--color-text-muted)' }}>{fmt(i.price * i.qty)}</span>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, borderTop: '1px solid var(--color-border)', marginTop: 14, paddingTop: 14 }}>
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14 }}>Total</span>
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 19 }}>{fmt(order.total)}</span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13, marginTop: 10 }}>
            <span style={{ color: 'var(--color-text-muted)' }}>Payment status</span>
            <span style={{ fontWeight: 600, color: order.paid ? 'var(--ke-green-700)' : 'var(--ke-sun-500)' }}>{order.paid ? 'Paid' : 'Awaiting confirmation'}</span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginTop: 16, paddingTop: 14, borderTop: '1px solid var(--color-border)', flexWrap: 'wrap' }}>
            <a href={`/track?no=${encodeURIComponent(order.orderNo)}`} style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '.14em', color: 'var(--ke-green-700)' }}>
              TRACK DELIVERY →
            </a>
            <a
              href={`/api/orders/${order.id}/invoice`}
              target="_blank"
              rel="noopener noreferrer"
              style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 12.5, color: 'var(--ke-green-700)', textDecoration: 'none' }}
            >
              Download invoice
            </a>
            <CancelOrderButton orderId={order.id} status={order.status} cancelReason={order.cancelReason} />
          </div>
        </div>

        {!order.paid && order.status !== 'CANCELLED' && (
          <div style={{ marginTop: 16 }}>
            <ProofOfPaymentUpload orderId={order.id} initiallyUploaded={Boolean(order.proofOfPaymentPath)} />
          </div>
        )}
      </div>
    </>
  )
}
