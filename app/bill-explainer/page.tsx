import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import JsonLd from '@/components/JsonLd'
import { buildBreadcrumbs } from '@/lib/structuredData'
import BillExplainer from './_components/BillExplainer'

export const metadata = {
  title: 'JPS Bill Explainer — why did my light bill go up? | Kingston Energies',
  description: 'Enter the numbers from your JPS bill to see your daily use, what each kWh really costs, and exactly why this bill differs from the last one.',
}

const breadcrumbs = buildBreadcrumbs([{ name: 'Home', path: '/' }, { name: 'Bill Explainer' }])

export default function BillExplainerPage() {
  return (
    <div style={{ fontFamily: 'var(--font-body)', color: 'var(--ke-dark-text)', background: 'var(--ke-dark-bg)', minHeight: '100vh' }}>
      <JsonLd data={breadcrumbs} />
      <Navbar />
      <main style={{ paddingTop: 64 }}>
        <section style={{ maxWidth: 960, margin: '0 auto', padding: '72px 20px 28px' }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, letterSpacing: '.3em', color: 'var(--ke-green-400)' }}>BILL EXPLAINER</div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 'clamp(34px,6vw,56px)', lineHeight: 1.04, letterSpacing: '-.03em', color: '#fff', margin: '16px 0 0' }}>
            Why is my light bill this much?
          </h1>
          <p style={{ fontSize: 17, lineHeight: 1.65, color: 'rgba(234,242,236,.72)', margin: '18px 0 0', maxWidth: 680 }}>
            Type in a few numbers from your JPS bill. We’ll show your daily use, what each kWh actually costs you, and — with last month’s bill — exactly how much of the change came from more days, more use, or higher prices.
          </p>
        </section>
        <section style={{ maxWidth: 960, margin: '0 auto', padding: '0 20px 80px' }}>
          <BillExplainer />
        </section>
      </main>
      <Footer />
    </div>
  )
}
