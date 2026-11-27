import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import JsonLd from '@/components/JsonLd'
import { buildBreadcrumbs } from '@/lib/structuredData'
import GarageClient from './_components/GarageClient'
import { routingConfigured } from '@/lib/map/routing'

export const metadata = {
  title: 'My Garage — your EV or hybrid, in 3D',
  description: 'Add your electric car or hybrid once and every Kingston Energies tool uses it: charging costs, chargers that fit your plug, trip planning, solar sizing and storm backup.',
}

const breadcrumbs = buildBreadcrumbs([{ name: 'Home', path: '/' }, { name: 'My Garage' }])

export default function GaragePage() {
  return (
    <div style={{ fontFamily: 'var(--font-body)', color: 'var(--ke-dark-text)', background: 'var(--ke-dark-bg)', minHeight: '100vh' }}>
      <JsonLd data={breadcrumbs} />
      <Navbar />
      <main style={{ paddingTop: 64 }}>
        <section style={{ maxWidth: 1180, margin: '0 auto', padding: '64px 20px 24px' }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, letterSpacing: '.3em', color: 'var(--ke-green-400)' }}>MY GARAGE</div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 'clamp(34px,6vw,56px)', lineHeight: 1.04, letterSpacing: '-.03em', color: '#fff', margin: '16px 0 0' }}>
            Your car, everywhere you need it
          </h1>
          <p style={{ fontSize: 17, lineHeight: 1.65, color: 'rgba(234,242,236,.72)', margin: '18px 0 0', maxWidth: 720 }}>
            Add your EV or hybrid once. The cost calculator, the charging map, the trip planner, the solar estimator and the storm hub all use it — so you only ever type it in here.
          </p>
        </section>
        <section style={{ maxWidth: 1180, margin: '0 auto', padding: '0 20px 80px' }}>
          <GarageClient tripPlanner={routingConfigured()} />
        </section>
      </main>
      <Footer />
    </div>
  )
}
