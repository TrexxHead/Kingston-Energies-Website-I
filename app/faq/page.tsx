import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import Reveal from '@/app/_design-system/Reveal'
import JsonLd from '@/components/JsonLd'
import { buildBreadcrumbs } from '@/lib/structuredData'
import FaqBrowser from '@/components/ui/faq-browser'
import { SITE_FAQ } from '@/lib/faqContent'

export const metadata = {
  title: 'FAQ: Kingston Energies',
  description: 'Delivery, payment, warranty, returns, bulk orders and more — answered.',
}

const breadcrumbs = buildBreadcrumbs([{ name: 'Home', path: '/' }, { name: 'FAQ' }])

export default function FaqPage() {
  return (
    <div style={{ fontFamily: 'var(--font-body)', color: '#eaf2ec', background: '#0d1714', minHeight: '100vh' }}>
      <JsonLd data={breadcrumbs} />
      <Navbar />
      <main className="ke-screen" style={{ paddingTop: 64 }}>
        <section style={{ padding: 'clamp(56px,8vw,120px) var(--page-pad) 0' }}>
          <div style={{ maxWidth: 640, margin: '0 auto', textAlign: 'center' }}>
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 12,
                letterSpacing: '.3em',
                color: 'var(--ke-green-400)',
              }}
            >
              FAQ
            </span>
            <h1
              style={{
                fontFamily: 'var(--font-display)',
                fontWeight: 800,
                fontSize: 'clamp(34px,5vw,52px)',
                letterSpacing: '-.025em',
                lineHeight: 1.05,
                color: '#fff',
                margin: '12px 0 0',
              }}
            >
              Frequently asked questions
            </h1>
            <p style={{ fontSize: 16, lineHeight: 1.6, color: 'rgba(234,242,236,.7)', margin: '16px 0 0' }}>
              Delivery, payment, warranty and business orders — answered below. Can&apos;t find yours? Ask us
              directly.
            </p>
          </div>
        </section>

        <Reveal>
          <section style={{ padding: 'clamp(40px,6vw,80px) var(--page-pad) clamp(56px,8vw,120px)' }}>
            <FaqBrowser data={SITE_FAQ} />
          </section>
        </Reveal>

        <section style={{ padding: '0 var(--page-pad) clamp(80px,10vw,140px)', textAlign: 'center' }}>
          <Link
            href="/contact"
            style={{
              height: 56,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '0 26px',
              borderRadius: 999,
              background: 'var(--color-primary)',
              color: '#fff',
              fontFamily: 'var(--font-display)',
              fontWeight: 600,
              fontSize: 15,
              boxShadow: 'var(--shadow-green)',
            }}
          >
            Still have a question? Get in touch
            <ArrowRight size={17} />
          </Link>
        </section>
      </main>
      <Footer showCta={false} />
    </div>
  )
}
