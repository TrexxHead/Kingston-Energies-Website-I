import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

export default function Hero() {
  return (
    <section
      style={{
        position: 'relative',
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        background: 'linear-gradient(180deg,#0d1714 0%,#10201c 55%,#0d1714 100%)',
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          backgroundImage:
            'linear-gradient(rgba(255,255,255,.035) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.035) 1px,transparent 1px)',
          backgroundSize: '88px 88px',
          maskImage: 'radial-gradient(ellipse 70% 60% at 50% 42%,#000 30%,transparent 75%)',
          WebkitMaskImage: 'radial-gradient(ellipse 70% 60% at 50% 42%,#000 30%,transparent 75%)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: '40%',
          width: 900,
          height: 900,
          transform: 'translate(-50%,-50%)',
          borderRadius: '50%',
          pointerEvents: 'none',
          background: 'radial-gradient(circle, rgba(147,201,63,.156) 0%, rgba(41,171,226,.06) 40%, transparent 68%)',
          filter: 'blur(46px)',
        }}
      />

      <div style={{ position: 'relative', textAlign: 'center', padding: '120px 32px 80px', maxWidth: 900 }}>
        <div
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 12,
            letterSpacing: '.34em',
            color: 'var(--ke-green-400)',
            animation: 'keUp .8s var(--ease-out) both',
          }}
        >
          KINGSTON&nbsp;ENERGIES
        </div>

        <h1
          style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 800,
            fontSize: 'clamp(56px,9vw,96px)',
            lineHeight: 0.98,
            letterSpacing: '-.03em',
            color: '#fff',
            margin: '26px 0 0',
            animation: 'keUp .9s var(--ease-out) .12s both',
          }}
        >
          Energy,
          <br />
          <span
            style={{
              background: 'var(--gradient-brand)',
              WebkitBackgroundClip: 'text',
              backgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              color: 'var(--ke-green-400)',
            }}
          >
            refined.
          </span>
        </h1>

        <p
          style={{
            fontSize: 19,
            lineHeight: 1.6,
            color: 'rgba(234,242,236,.66)',
            maxWidth: 520,
            margin: '28px auto 0',
            animation: 'keUp .9s var(--ease-out) .26s both',
          }}
        >
          Premium portable power — built in Kingston, priced for everyone. And a roadmap that ends with the sun.
        </p>

        <div
          style={{
            display: 'flex',
            gap: 14,
            justifyContent: 'center',
            marginTop: 40,
            flexWrap: 'wrap',
            animation: 'keUp .9s var(--ease-out) .4s both',
          }}
        >
          <Link
            href="/shop"
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
            Get yours
            <ArrowRight size={17} />
          </Link>
          <a
            href="#ke-lineup"
            style={{
              height: 56,
              display: 'inline-flex',
              alignItems: 'center',
              padding: '0 26px',
              borderRadius: 999,
              border: '1.5px solid rgba(255,255,255,.28)',
              color: '#fff',
              fontFamily: 'var(--font-display)',
              fontWeight: 600,
              fontSize: 15,
            }}
          >
            Explore the lineup
          </a>
        </div>
      </div>

      <div
        style={{
          position: 'absolute',
          bottom: 34,
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 10,
          animation: 'keFade 1.2s var(--ease-out) 1s both',
        }}
      >
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '.3em', color: 'rgba(234,242,236,.4)' }}>
          SCROLL
        </span>
        <span style={{ width: 1, height: 44, background: 'linear-gradient(180deg,rgba(147,201,63,.9),transparent)' }} />
      </div>
    </section>
  )
}
