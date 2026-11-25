import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import JsonLd from '@/components/JsonLd'
import { buildBreadcrumbs } from '@/lib/structuredData'
import HealthCheck from './_components/HealthCheck'

export const metadata = {
  title: 'Is my solar system performing?',
  description: 'Check your solar system’s health from the kWh it made, its size and the day’s sunshine — what’s normal, what isn’t, and what to check first.',
}

const breadcrumbs = buildBreadcrumbs([{ name: 'Home', path: '/' }, { name: 'Going solar in Jamaica', path: '/guides/going-solar' }, { name: 'System health check' }])

export default function SolarHealthPage() {
  return (
    <div style={{ fontFamily: 'var(--font-body)', color: 'var(--ke-dark-text)', background: 'var(--ke-dark-bg)', minHeight: '100vh' }}>
      <JsonLd data={breadcrumbs} />
      <Navbar />
      <main style={{ paddingTop: 64 }}>
        <section style={{ maxWidth: 900, margin: '0 auto', padding: '64px 20px 24px' }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, letterSpacing: '.3em', color: 'var(--ke-green-400)' }}>SYSTEM HEALTH CHECK</div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 'clamp(32px,6vw,56px)', lineHeight: 1.04, letterSpacing: '-.03em', color: '#fff', margin: '16px 0 0' }}>Is my system performing?</h1>
          <p style={{ fontSize: 17, lineHeight: 1.65, color: 'rgba(234,242,236,.72)', margin: '18px 0 0', maxWidth: 680 }}>
            Your inverter app shows how much your panels made. Compare it with what your system should make on that much sunshine — the way installers judge a system.
          </p>
        </section>
        <section style={{ maxWidth: 900, margin: '0 auto', padding: '0 20px 80px' }}>
          <HealthCheck />
        </section>
      </main>
      <Footer />
    </div>
  )
}
