import Link from 'next/link'
import { ArrowRight, Zap } from 'lucide-react'
import { getMarketing } from '@/lib/marketing'
import FloatingPromos, { type FloatingPromo } from './FloatingPromos'

/**
 * Homepage promotions, admin-controlled from Marketing: a headline "flash sale"
 * strip and a row of short banner pills. Renders nothing when there's nothing
 * active, so it never leaves an empty gap.
 */
export default async function Promos() {
  const m = await getMarketing()
  const banners = m.banners.filter((b) => b.active && b.text.trim())
  const flash = m.flash.enabled && m.flash.headline.trim() ? m.flash : null

  if (!flash && banners.length === 0) return null

  // Feed the living promo orbs from the same admin-controlled marketing.
  const floating: FloatingPromo[] = [
    ...(flash ? [{ label: flash.headline, detail: flash.subtext || undefined, href: flash.href || '/shop', kind: 'flash' as const }] : []),
    ...banners.map((b) => ({ label: b.text, href: '/shop', kind: 'banner' as const })),
  ]

  return (
    <>
    {floating.length > 0 && <FloatingPromos promos={floating} />}
    <section style={{ padding: '0 var(--page-pad)', background: '#0d1714' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 14 }}>
        {flash && (
          <Link
            href={flash.href || '/shop'}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 16,
              padding: '18px 24px',
              borderRadius: 18,
              background: 'var(--gradient-sun, linear-gradient(120deg,#fdb813,#f7941e))',
              color: '#1c2a25',
              textDecoration: 'none',
            }}
          >
            <Zap size={22} fill="currentColor" style={{ flexShrink: 0 }} />
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: 'block', fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 'clamp(18px,3vw,24px)', letterSpacing: '-.01em' }}>{flash.headline}</span>
              {flash.subtext && <span style={{ display: 'block', fontSize: 13.5, opacity: 0.85, marginTop: 2 }}>{flash.subtext}</span>}
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14, flexShrink: 0 }}>
              Shop now <ArrowRight size={17} />
            </span>
          </Link>
        )}

        {banners.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            {banners.map((b, i) => (
              <span
                key={i}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  padding: '8px 14px',
                  borderRadius: 999,
                  background: 'rgba(255,255,255,.06)',
                  border: '1px solid rgba(255,255,255,.1)',
                  color: 'var(--ke-dark-text-muted, #b9c6bd)',
                  fontFamily: 'var(--font-display)',
                  fontWeight: 600,
                  fontSize: 12.5,
                }}
              >
                {b.text}
              </span>
            ))}
          </div>
        )}
      </div>
    </section>
    </>
  )
}
