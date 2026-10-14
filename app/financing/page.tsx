import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import JsonLd from '@/components/JsonLd'
import { buildBreadcrumbs } from '@/lib/structuredData'
import FinancingCalculator from './_components/FinancingCalculator'

export const metadata = {
  title: 'Solar & backup power financing calculator for Jamaica',
  description: 'Work out the monthly payment, total interest and net monthly cost of financing solar, batteries or a power station — with lenders’ advertised rates and your own bill savings.',
}

const breadcrumbs = buildBreadcrumbs([{ name: 'Home', path: '/' }, { name: 'Financing calculator' }])

export default function FinancingPage() {
  return (
    <div style={{ fontFamily: 'var(--font-body)', color: 'var(--ke-dark-text)', background: 'var(--ke-dark-bg)', minHeight: '100vh' }}>
      <JsonLd data={breadcrumbs} />
      <Navbar />
      <main style={{ paddingTop: 64 }}>
        <section style={{ maxWidth: 1100, margin: '0 auto', padding: '72px 20px 28px' }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, letterSpacing: '.3em', color: 'var(--ke-green-400)' }}>FINANCING</div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 'clamp(34px,6vw,56px)', lineHeight: 1.04, letterSpacing: '-.03em', color: '#fff', margin: '16px 0 0' }}>
            What would it cost each month?
          </h1>
          <p style={{ fontSize: 17, lineHeight: 1.65, color: 'rgba(234,242,236,.72)', margin: '18px 0 0', maxWidth: 680 }}>
            See the monthly payment and total interest on a loan for solar, batteries or backup power — and, if you know your bill saving, what it really costs you each month.
          </p>
        </section>
        <section style={{ maxWidth: 1100, margin: '0 auto', padding: '0 20px 80px' }}>
          <FinancingCalculator />
        </section>
      </main>
      <Footer />
    </div>
  )
}
