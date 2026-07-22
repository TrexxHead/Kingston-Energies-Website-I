import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import { prisma } from '@/lib/prisma'
import { fmt } from '@/lib/catalog'
import { UserPlus, Ticket, Award } from 'lucide-react'
import Topbar from '../_components/Topbar'
import { hubScreen, hubCard, hubH3 } from '../_components/ui'
import CopyReferral from './_components/CopyReferral'

const REWARD_STEP = 500 // points needed for the next J$1,000 reward
const REWARD_VALUE = 1000 // J$ off per reward

function tierFor(points: number): string {
  if (points >= 3000) return 'Platinum'
  if (points >= 1000) return 'Gold'
  if (points >= 200) return 'Silver'
  return 'Bronze'
}

export default async function RewardsPage() {
  const session = await getServerSession(authOptions)
  const user = session?.user?.id
    ? await prisma.user.findUnique({
        where: { id: session.user.id },
        include: { orders: true },
      })
    : null

  const totalSpent = (user?.orders ?? []).filter((o) => o.status !== 'CANCELLED').reduce((s, o) => s + o.total, 0)
  const points = Math.floor(totalSpent / 100)
  const tier = tierFor(points)
  const progressPct = Math.round(((points % REWARD_STEP) / REWARD_STEP) * 100)
  const ptsToNext = REWARD_STEP - (points % REWARD_STEP)

  const firstName = (user?.name?.split(' ')[0] ?? 'FRIEND').toUpperCase().replace(/[^A-Z]/g, '')
  const referralCode = `${firstName || 'FRIEND'}10`

  return (
    <>
      <Topbar title="Rewards" subtitle="Points, referrals and perks" />
      <div className="ke-screen" style={hubScreen}>
        {/* Points hero */}
        <div
          style={{
            background: 'var(--gradient-deep)',
            borderRadius: 18,
            padding: 28,
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 24,
            flexWrap: 'wrap',
            marginBottom: 16,
          }}
        >
          <div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '.18em', color: 'rgba(234,242,236,.7)' }}>
              LOYALTY POINTS
            </div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 54, lineHeight: 1, marginTop: 8 }}>{points}</div>
          </div>
          <div style={{ minWidth: 220, flex: 1, maxWidth: 340 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 8 }}>
              <span style={{ fontWeight: 700 }}>{tier} tier</span>
              <span style={{ color: 'rgba(234,242,236,.8)' }}>{progressPct}% to next reward</span>
            </div>
            <div style={{ height: 8, borderRadius: 999, background: 'rgba(255,255,255,.16)', overflow: 'hidden' }}>
              <div style={{ width: `${progressPct}%`, height: '100%', background: 'linear-gradient(90deg,#93c93f,#c7e88a)' }} />
            </div>
          </div>
        </div>

        {/* Three cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }} className="hub-three-col">
          <div style={hubCard}>
            <UserPlus size={22} color="var(--ke-green-600)" />
            <h3 style={{ ...hubH3, margin: '14px 0 4px' }}>Refer a friend</h3>
            <p style={{ fontSize: 13, color: 'var(--color-text-muted)', margin: '0 0 14px' }}>
              Give {fmt(REWARD_VALUE)}, get {fmt(REWARD_VALUE)} when they order.
            </p>
            <CopyReferral code={referralCode} />
          </div>

          <div style={hubCard}>
            <Ticket size={22} color="var(--ke-green-600)" />
            <h3 style={{ ...hubH3, margin: '14px 0 4px' }}>Redeem points</h3>
            <p style={{ fontSize: 13, color: 'var(--color-text-muted)', margin: '0 0 14px' }}>
              {REWARD_STEP} pts = {fmt(REWARD_VALUE)} off your next order.
            </p>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: 44,
                borderRadius: 999,
                border: '1.5px solid var(--color-border)',
                fontFamily: 'var(--font-display)',
                fontWeight: 600,
                fontSize: 13.5,
                color: 'var(--color-text-muted)',
              }}
            >
              {ptsToNext} pts to next reward
            </div>
          </div>

          <div style={hubCard}>
            <Award size={22} color="var(--ke-green-600)" />
            <h3 style={{ ...hubH3, margin: '14px 0 4px' }}>How you earn</h3>
            <p style={{ fontSize: 13, color: 'var(--color-text-muted)', lineHeight: 1.7, margin: 0 }}>
              1 pt per {fmt(100)} spent · 25 pts per device registered · 50 pts per review.
            </p>
          </div>
        </div>
      </div>
    </>
  )
}
