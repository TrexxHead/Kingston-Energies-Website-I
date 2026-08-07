import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { SITE_FAQ } from '@/lib/faqContent'

// One real question from each row, so the teaser isn't just a title with
// nothing behind it — the full set lives on /faq.
const PREVIEW = SITE_FAQ.rows.map((row) => row.faqItems[0])

export default function FaqTeaser() {
  return (
    <section style={{ padding: 'clamp(56px,8vw,120px) var(--page-pad)', background: '#0d1714' }}>
      <div style={{ maxWidth: 900, margin: '0 auto', textAlign: 'center' }}>
        <h2
          style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 800,
            fontSize: 'clamp(28px,4vw,40px)',
            letterSpacing: '-.02em',
            color: '#fff',
            margin: 0,
          }}
        >
          Frequently asked questions
        </h2>
        <p style={{ fontSize: 15, lineHeight: 1.6, color: 'rgba(234,242,236,.65)', maxWidth: 480, margin: '10px auto 0' }}>
          Delivery, warranty, returns and bulk orders — the short version.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 16, marginTop: 36, textAlign: 'left' }}>
          {PREVIEW.map((item) => (
            <div key={item.id} style={{ background: 'var(--ke-dark-card)', border: '1px solid var(--ke-dark-hairline)', borderRadius: 16, padding: 20 }}>
              <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14.5, color: 'var(--ke-dark-text)', margin: 0 }}>
                {item.question}
              </h3>
              <p style={{ fontFamily: 'var(--font-body)', fontSize: 13, lineHeight: 1.6, color: 'var(--ke-dark-text-muted)', margin: '8px 0 0' }}>
                {item.answer}
              </p>
            </div>
          ))}
        </div>

        <Link
          href="/faq"
          style={{
            height: 52,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '0 24px',
            borderRadius: 999,
            background: 'var(--color-primary)',
            color: '#fff',
            fontFamily: 'var(--font-display)',
            fontWeight: 600,
            fontSize: 14.5,
            boxShadow: 'var(--shadow-green)',
            marginTop: 32,
          }}
        >
          See all FAQs
          <ArrowRight size={16} />
        </Link>
      </div>
    </section>
  )
}
