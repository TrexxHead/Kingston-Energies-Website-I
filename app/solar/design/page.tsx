import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import JsonLd from '@/components/JsonLd'
import { buildBreadcrumbs } from '@/lib/structuredData'
import SystemDesigner from './_components/SystemDesigner'

export const metadata = {
  title: 'Design your solar system',
  description: 'From your JPS bill to a sized solar system in a minute: panels, hybrid inverter and battery, backup hours, likely price and monthly payment — every figure shown with its working.',
}

const breadcrumbs = buildBreadcrumbs([{ name: 'Home', path: '/' }, { name: 'Rooftop solar estimator', path: '/solar' }, { name: 'Design your system' }])

export default function SolarDesignPage() {
  return (
    <div style={{ fontFamily: 'var(--font-body)', color: 'var(--ke-dark-text)', background: 'var(--ke-dark-bg)', minHeight: '100vh' }}>
      <JsonLd data={breadcrumbs} />
      <Navbar />
      <main style={{ paddingTop: 64 }}>
        <section style={{ maxWidth: 1240, margin: '0 auto', padding: '64px 20px 24px' }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, letterSpacing: '.3em', color: 'var(--ke-green-400)' }}>DESIGN YOUR SYSTEM</div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 'clamp(34px,6vw,60px)', lineHeight: 1.04, letterSpacing: '-.03em', color: '#fff', margin: '16px 0 0' }}>
            Your home, powered by the sun.
          </h1>
          <p style={{ fontSize: 17, lineHeight: 1.65, color: 'rgba(234,242,236,.72)', margin: '18px 0 0', maxWidth: 700 }}>
            Tell us what you use and what must stay on when JPS goes out. We’ll size the panels, inverter and battery the way a qualified designer does — losses included — and show you every step.
          </p>
        </section>
        <section style={{ maxWidth: 1240, margin: '0 auto', padding: '0 20px 80px' }}>
          <SystemDesigner />
        </section>
      </main>
      <Footer />
    </div>
  )
}
