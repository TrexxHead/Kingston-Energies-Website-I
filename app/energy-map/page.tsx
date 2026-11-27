import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import JsonLd from '@/components/JsonLd'
import { buildBreadcrumbs } from '@/lib/structuredData'
import EnergyMapClient from './_components/EnergyMapClient'

export const metadata = {
  title: 'Jamaica Energy Map: EV charging — Kingston Energies',
  description: 'Find EV charging locations across Jamaica with clear access details and honest, timestamped status.',
}

const breadcrumbs = buildBreadcrumbs([{ name: 'Home', path: '/' }, { name: 'Jamaica Energy Map' }])

export default function EnergyMapPage() {
  return (
    <div style={{ fontFamily: 'var(--font-body)', color: 'var(--ke-dark-text)', background: 'var(--ke-dark-bg)', minHeight: '100vh' }}>
      <JsonLd data={breadcrumbs} />
      <Navbar />
      <main style={{ paddingTop: 64 }}>
        <section style={{ maxWidth: 1240, margin: '0 auto', padding: '72px 20px 28px' }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, letterSpacing: '.3em', color: 'var(--ke-green-400)' }}>JAMAICA ENERGY MAP</div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 'clamp(34px,6vw,60px)', lineHeight: 1.04, letterSpacing: '-.03em', color: '#fff', margin: '16px 0 0' }}>
            EV charging across Jamaica.
          </h1>
          <p style={{ fontSize: 17, lineHeight: 1.65, color: 'rgba(234,242,236,.72)', margin: '18px 0 0', maxWidth: 680 }}>
            Every location comes with its source and how current its status is. Open now isn’t the same as available now — when we don’t know, we say so.
          </p>
        </section>
        <section style={{ maxWidth: 1240, margin: '0 auto', padding: '0 20px 80px' }}>
          <EnergyMapClient />
        </section>
      </main>
      <Footer />
    </div>
  )
}
