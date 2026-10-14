import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import JsonLd from '@/components/JsonLd'
import { buildBreadcrumbs } from '@/lib/structuredData'
import SolarClient from './_components/SolarClient'

export const metadata = {
  title: 'Rooftop solar estimator for Jamaica',
  description: 'Tap your roof on the map to estimate panels, yearly solar output and savings on your JPS bill — free, using EU PVGIS solar data.',
}

const breadcrumbs = buildBreadcrumbs([{ name: 'Home', path: '/' }, { name: 'Rooftop solar estimator' }])

export default function SolarPage() {
  return (
    <div style={{ fontFamily: 'var(--font-body)', color: 'var(--ke-dark-text)', background: 'var(--ke-dark-bg)', minHeight: '100vh' }}>
      <JsonLd data={breadcrumbs} />
      <Navbar />
      <main style={{ paddingTop: 64 }}>
        <section style={{ maxWidth: 1240, margin: '0 auto', padding: '72px 20px 28px' }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, letterSpacing: '.3em', color: 'var(--ke-green-400)' }}>ROOFTOP SOLAR ESTIMATOR</div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 'clamp(34px,6vw,60px)', lineHeight: 1.04, letterSpacing: '-.03em', color: '#fff', margin: '16px 0 0' }}>
            What could your roof make?
          </h1>
          <p style={{ fontSize: 17, lineHeight: 1.65, color: 'rgba(234,242,236,.72)', margin: '18px 0 0', maxWidth: 680 }}>
            Find your home, tap your roof, and see how many panels fit, how much power they’d make through the year, and what that’s worth on your JPS bill. Every assumption is shown — and you can change it.
          </p>
        </section>
        <section style={{ maxWidth: 1240, margin: '0 auto', padding: '0 20px 80px' }}>
          <SolarClient />
        </section>
      </main>
      <Footer />
    </div>
  )
}
