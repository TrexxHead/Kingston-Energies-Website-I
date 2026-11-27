import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import JsonLd from '@/components/JsonLd'
import { buildBreadcrumbs } from '@/lib/structuredData'
import MyEnergyClient from './_components/MyEnergyClient'

export const metadata = {
  title: 'My Energy: Kingston Energies',
  description: 'Your properties, equipment and backup scenarios in one place — energy, power and runtime with the evidence behind every number.',
}

const breadcrumbs = buildBreadcrumbs([{ name: 'Home', path: '/' }, { name: 'My Energy' }])

export default function MyEnergyPage() {
  return (
    <div style={{ fontFamily: 'var(--font-body)', color: 'var(--ke-dark-text)', background: 'var(--ke-dark-bg)', minHeight: '100vh' }}>
      <JsonLd data={breadcrumbs} />
      <Navbar />
      <main style={{ paddingTop: 64 }}>
        <section style={{ maxWidth: 1080, margin: '0 auto', padding: '72px 20px 28px' }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, letterSpacing: '.3em', color: 'var(--ke-green-400)' }}>MY ENERGY</div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 'clamp(34px,6vw,60px)', lineHeight: 1.04, letterSpacing: '-.03em', color: '#fff', margin: '16px 0 0' }}>
            Your equipment, your scenarios.
          </h1>
          <p style={{ fontSize: 17, lineHeight: 1.65, color: 'rgba(234,242,236,.72)', margin: '18px 0 0', maxWidth: 680 }}>
            Enter what you run once. See daily energy, what must run at the same time and the startup peak — each with the evidence behind it. No account needed to start.
          </p>
        </section>
        <section style={{ maxWidth: 1080, margin: '0 auto', padding: '0 20px 80px' }}>
          <MyEnergyClient />
        </section>
      </main>
      <Footer />
    </div>
  )
}
