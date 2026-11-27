import type { Metadata } from 'next'
import Link from 'next/link'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import { routingConfigured } from '@/lib/map/routing'
import TripPlannerClient from './_components/TripPlannerClient'

// Unlisted (and not indexed) until road routing is configured.
export function generateMetadata(): Metadata {
  return {
    title: 'EV trip planner for Jamaica',
    description: 'Plan an electric-car trip in Jamaica: energy for the route, where to charge on the way, and what charge you’ll arrive with.',
    robots: routingConfigured() ? undefined : { index: false, follow: false },
  }
}
export const dynamic = 'force-dynamic'

export default function TripPlannerPage() {
  const on = routingConfigured()
  return (
    <div style={{ fontFamily: 'var(--font-body)', color: 'var(--ke-dark-text)', background: 'var(--ke-dark-bg)', minHeight: '100vh' }}>
      <Navbar />
      <main style={{ paddingTop: 64 }}>
        <section style={{ maxWidth: 1100, margin: '0 auto', padding: '72px 20px 28px' }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, letterSpacing: '.3em', color: 'var(--ke-green-400)' }}>EV TRIP PLANNER</div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 'clamp(34px,6vw,56px)', lineHeight: 1.04, letterSpacing: '-.03em', color: '#fff', margin: '16px 0 0' }}>
            Will I make it — and where do I charge?
          </h1>
          <p style={{ fontSize: 17, lineHeight: 1.65, color: 'rgba(234,242,236,.72)', margin: '18px 0 0', maxWidth: 680 }}>
            Choose where you’re going and tell us about your car. We’ll work out the energy for the road route, where to stop on the way, and the charge you’ll arrive with.
          </p>
        </section>
        <section style={{ maxWidth: 1100, margin: '0 auto', padding: '0 20px 80px' }}>
          {on ? (
            <TripPlannerClient />
          ) : (
            <p style={{ margin: 0, padding: 22, borderRadius: 18, background: 'rgba(255,255,255,.035)', border: '1px solid rgba(255,255,255,.08)', color: '#fff' }}>
              Route planning isn’t switched on yet. Meanwhile, find chargers on the <Link href="/energy-map" style={{ color: 'var(--ke-green-400)' }}>Jamaica Energy Map</Link>.
            </p>
          )}
        </section>
      </main>
      <Footer />
    </div>
  )
}
