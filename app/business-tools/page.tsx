import Link from 'next/link'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import JsonLd from '@/components/JsonLd'
import { buildBreadcrumbs } from '@/lib/structuredData'
import GeneratorCalc from './_components/GeneratorCalc'
import PumpCalc from './_components/PumpCalc'

export const metadata = {
  title: 'Energy tools for businesses and farms in Jamaica',
  description: 'Generator fuel use, runtime and cost per kWh from your manual’s figures; solar water-pump sizing for your parish; and your business electricity bill explained.',
}

const breadcrumbs = buildBreadcrumbs([{ name: 'Home', path: '/' }, { name: 'Business & farm tools' }])

export default function BusinessToolsPage() {
  return (
    <div style={{ fontFamily: 'var(--font-body)', color: 'var(--ke-dark-text)', background: 'var(--ke-dark-bg)', minHeight: '100vh' }}>
      <JsonLd data={breadcrumbs} />
      <style>{CSS}</style>
      <Navbar />
      <main style={{ paddingTop: 64 }}>
        <section style={{ maxWidth: 1100, margin: '0 auto', padding: '72px 20px 28px' }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, letterSpacing: '.3em', color: 'var(--ke-green-400)' }}>BUSINESS &amp; FARM</div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 'clamp(34px,6vw,56px)', lineHeight: 1.04, letterSpacing: '-.03em', color: '#fff', margin: '16px 0 0' }}>
            Energy tools for work
          </h1>
          <p style={{ fontSize: 17, lineHeight: 1.65, color: 'rgba(234,242,236,.72)', margin: '18px 0 0', maxWidth: 680 }}>
            What your generator really costs to run, how much solar a water pump needs, and — in the <Link href="/bill-explainer" style={{ color: 'var(--ke-green-400)' }}>Bill Explainer</Link> — what’s driving your business electricity bill. Plan backup for a shop or office in <Link href="/business-power-continuity" style={{ color: 'var(--ke-green-400)' }}>business power continuity</Link>.
          </p>
        </section>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 20px 80px', display: 'grid', gap: 20 }}>
          <GeneratorCalc />
          <PumpCalc />
        </div>
      </main>
      <Footer />
    </div>
  )
}

const CSS = `
.ke-bt-fields{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px;align-items:end}
.ke-bt-result{display:grid;gap:12px;padding:18px;border-radius:16px;background:rgba(63,157,42,.07);border:1px solid rgba(110,200,90,.22)}
.ke-bt-tiles{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:10px}
.ke-bt-tiles div{display:grid;gap:3px}
.ke-bt-tiles span{font-size:12.5px;color:var(--ke-dark-text-muted)}
.ke-bt-tiles strong{font-family:var(--font-display);font-size:22px;color:#fff;font-variant-numeric:tabular-nums}
.ke-bt-tiles small{font-size:12px;color:var(--ke-dark-text-muted)}
`
