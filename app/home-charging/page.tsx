import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import JsonLd from '@/components/JsonLd'
import { buildBreadcrumbs } from '@/lib/structuredData'
import HomeChargingClient from './_components/HomeChargingClient'

export const metadata = {
  title: 'Charging an EV at home in Jamaica — wall socket or wall charger?',
  description: 'How long your car takes to charge at home, whether an ordinary socket is enough, what it adds to your JPS bill, and a home-charger installation quote.',
}

const breadcrumbs = buildBreadcrumbs([{ name: 'Home', path: '/' }, { name: 'Charging at home' }])

export default function HomeChargingPage() {
  return (
    <div style={{ fontFamily: 'var(--font-body)', color: 'var(--ke-dark-text)', background: 'var(--ke-dark-bg)', minHeight: '100vh' }}>
      <JsonLd data={breadcrumbs} />
      <Navbar />
      <main style={{ paddingTop: 64 }}>
        <section style={{ maxWidth: 1100, margin: '0 auto', padding: '64px 20px 24px' }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, letterSpacing: '.3em', color: 'var(--ke-green-400)' }}>CHARGING AT HOME</div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 'clamp(34px,6vw,56px)', lineHeight: 1.04, letterSpacing: '-.03em', color: '#fff', margin: '16px 0 0' }}>
            Is a wall socket enough, or do you need a charger?
          </h1>
          <p style={{ fontSize: 17, lineHeight: 1.65, color: 'rgba(234,242,236,.72)', margin: '18px 0 0', maxWidth: 700 }}>
            From your car and your driving: how many hours a night each option needs, what charging adds to your JPS bill, and — if you want one — a quote for a properly installed home charger.
          </p>
        </section>
        <section style={{ maxWidth: 1100, margin: '0 auto', padding: '0 20px 80px' }}>
          <HomeChargingClient />
        </section>
      </main>
      <Footer />
    </div>
  )
}
