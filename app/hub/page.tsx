import Link from 'next/link'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import { prisma } from '@/lib/prisma'
import { fmt, CATALOG } from '@/lib/catalog'
import { co2SavedKg, formatCo2 } from '@/lib/impact'
import { loyaltyPoints } from '@/lib/loyalty'
import { recommendProductsForNeed, customerNeedLabel, NEED_PITCH, type CustomerNeed } from '@/lib/crm'
import { ArrowRight } from 'lucide-react'
import Topbar from './_components/Topbar'
import { hubScreen, hubCard, hubH3, hubEyebrow } from './_components/ui'

const PROGRESS: Record<string, { label: string; pct: number }> = {
  PENDING: { label: 'Confirmed', pct: 25 },
  PACKED: { label: 'Packed', pct: 55 },
  OUT: { label: 'Out for delivery', pct: 80 },
  DONE: { label: 'Delivered', pct: 100 },
  CANCELLED: { label: 'Cancelled', pct: 0 },
}

// Recommended "smart picks" — a curated slice of the live catalog.
const RECOMMENDED_IDS = ['pb20', 'acpo', 'st300']

export default async function HubPage() {
  const session = await getServerSession(authOptions)

  const user = session?.user?.id
    ? await prisma.user.findUnique({
        where: { id: session.user.id },
        include: {
          orders: { include: { items: true }, orderBy: { createdAt: 'desc' } },
          _count: { select: { reviews: true } },
        },
      })
    : null

  const orders = user?.orders ?? []
  const purchasedOrders = orders.filter((o) => o.status !== 'CANCELLED')
  const itemsPurchased = purchasedOrders.reduce((sum, o) => sum + o.items.reduce((n, i) => n + i.qty, 0), 0)
  const activeOrders = orders.filter((o) => o.status !== 'DONE' && o.status !== 'CANCELLED')
  const completed = orders.filter((o) => o.status === 'DONE').length
  const totalSpent = purchasedOrders.reduce((sum, o) => sum + o.total, 0)
  const points = loyaltyPoints({ totalSpent, reviewCount: user?._count?.reviews ?? 0 })
  const firstName = user?.name?.split(' ')[0] ?? 'there'
  const customerSince = user
    ? new Date(user.createdAt).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })
    : '—'

  // Impact metrics derived from purchase activity (0 for a fresh account — honest).
  const lifetimeSavings = Math.round(totalSpent * 0.08)
  const treesSaved = (itemsPurchased * 0.15).toFixed(1)
  const carbonOffset = formatCo2(co2SavedKg(itemsPurchased))

  const stats: { label: string; value: string }[] = [
    { label: 'Products purchased', value: String(itemsPurchased) },
    { label: 'Orders completed', value: String(completed) },
    { label: 'Loyalty points', value: String(points) },
    { label: 'Customer since', value: customerSince },
    { label: 'Lifetime savings', value: fmt(lifetimeSavings) },
    { label: 'Referral rewards', value: fmt(0) },
    { label: 'Trees saved', value: treesSaved },
    { label: 'Carbon offset', value: carbonOffset },
  ]

  // IDIC "Customize": if we know the customer's primary need, tailor the picks
  // to it; otherwise fall back to the curated default set.
  const need = (user?.primaryNeed as CustomerNeed | null) ?? null
  const recommended = need
    ? recommendProductsForNeed(CATALOG, need, 3)
    : RECOMMENDED_IDS.map((id) => CATALOG.find((p) => p.id === id)).filter(Boolean)
  const active = activeOrders[0] ?? orders[0] ?? null
  const activeMeta = active ? PROGRESS[active.status] ?? PROGRESS.PENDING : null

  return (
    <>
      <Topbar title={`Good afternoon, ${firstName}`} subtitle="Your Kingston hub — orders, devices and rewards" />
      <div className="ke-screen" style={hubScreen}>
        {/* Stat grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 22 }} className="hub-stat-grid">
          {stats.map((s) => (
            <div key={s.label} style={{ ...hubCard, padding: 16 }}>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 22, letterSpacing: '-.01em' }}>{s.value}</div>
              <div style={{ ...hubEyebrow, marginTop: 6 }}>{s.label}</div>
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 16 }} className="hub-two-col">
          {/* Recommended */}
          <div style={hubCard}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: need ? 6 : 16 }}>
              <h3 style={{ ...hubH3, margin: 0 }}>Recommended for you</h3>
              <span style={{ ...hubEyebrow, color: 'var(--ke-green-700)' }}>{need ? customerNeedLabel(need) : 'Smart picks'}</span>
            </div>
            {need && (
              <p style={{ fontSize: 12.5, color: 'var(--color-text-muted)', margin: '0 0 14px' }}>
                {NEED_PITCH[need]}{' '}
                <Link href="/hub/profile" style={{ color: 'var(--ke-green-700)', textDecoration: 'underline' }}>
                  Change
                </Link>
              </p>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {recommended.map((p) => (
                <div
                  key={p!.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 14,
                    padding: '12px 14px',
                    border: '1px solid var(--color-border)',
                    borderRadius: 12,
                  }}
                >
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14.5 }}>{p!.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 2 }}>{p!.spec}</div>
                  </div>
                  <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 15 }}>{fmt(p!.price)}</span>
                  <Link
                    href={`/product/${p!.id}`}
                    style={{
                      fontFamily: 'var(--font-display)',
                      fontWeight: 600,
                      fontSize: 12.5,
                      padding: '7px 16px',
                      borderRadius: 999,
                      border: '1.5px solid var(--ke-green-500)',
                      color: 'var(--ke-green-700)',
                      textDecoration: 'none',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    View
                  </Link>
                </div>
              ))}
            </div>
          </div>

          {/* Active order */}
          <div style={hubCard}>
            <h3 style={hubH3}>Active order</h3>
            {active && activeMeta ? (
              <div
                style={{
                  border: '1px solid var(--color-border)',
                  borderRadius: 14,
                  padding: 18,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, letterSpacing: '.1em' }}>{active.orderNo}</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: 'var(--ke-green-700)' }}>
                    <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--ke-green-500)' }} />
                    {activeMeta.label.toUpperCase()}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '14px 0 6px' }}>
                  <span style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>Delivery progress</span>
                  <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13 }}>{activeMeta.pct}%</span>
                </div>
                <div style={{ height: 8, borderRadius: 999, background: 'var(--color-border)', overflow: 'hidden' }}>
                  <div style={{ width: `${activeMeta.pct}%`, height: '100%', background: 'var(--gradient-brand)' }} />
                </div>
                <Link
                  href="/track"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    marginTop: 16,
                    height: 44,
                    borderRadius: 999,
                    background: 'var(--color-primary)',
                    color: '#fff',
                    fontFamily: 'var(--font-display)',
                    fontWeight: 600,
                    fontSize: 14,
                    textDecoration: 'none',
                  }}
                >
                  Track order <ArrowRight size={16} />
                </Link>
              </div>
            ) : (
              <div style={{ padding: '20px 0', textAlign: 'center' }}>
                <p style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15, margin: '0 0 6px' }}>No active orders</p>
                <p style={{ fontSize: 13, color: 'var(--color-text-muted)', margin: '0 0 16px' }}>
                  Your next order&apos;s delivery progress will show here.
                </p>
                <Link href="/shop" style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '.14em', color: 'var(--ke-green-700)' }}>
                  BROWSE SHOP →
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
