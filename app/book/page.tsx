import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import JsonLd from '@/components/JsonLd'
import { buildBreadcrumbs } from '@/lib/structuredData'
import BookingForm from './_components/BookingForm'

export const metadata = {
  title: 'Book a visit: solar, backup power and charger installs',
  description: 'Book a site visit or installation with Kingston Energies — choose a day and time, and pay a deposit online where one applies.',
}

const breadcrumbs = buildBreadcrumbs([{ name: 'Home', path: '/' }, { name: 'Book a visit' }])

export default function BookPage() {
  return (
    <div style={{ fontFamily: 'var(--font-body)', color: 'var(--ke-dark-text)', background: 'var(--ke-dark-bg)', minHeight: '100vh' }}>
      <JsonLd data={breadcrumbs} />
      <Navbar />
      <main style={{ paddingTop: 64 }}>
        <section style={{ maxWidth: 900, margin: '0 auto', padding: '72px 20px 28px' }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, letterSpacing: '.3em', color: 'var(--ke-green-400)' }}>BOOK A VISIT</div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 'clamp(34px,6vw,56px)', lineHeight: 1.04, letterSpacing: '-.03em', color: '#fff', margin: '16px 0 0' }}>
            Pick a day that suits you
          </h1>
          <p style={{ fontSize: 17, lineHeight: 1.65, color: 'rgba(234,242,236,.72)', margin: '18px 0 0', maxWidth: 640 }}>
            Choose the service and a morning or afternoon. We’ll call to confirm before the visit.
          </p>
        </section>
        <section style={{ maxWidth: 900, margin: '0 auto', padding: '0 20px 80px' }}>
          <BookingForm />
        </section>
      </main>
      <Footer />
    </div>
  )
}
