import Image from 'next/image'
import Reveal from '../../app/_design-system/Reveal'

export default function Story() {
  return (
    <section style={{ position: 'relative', height: '88vh', minHeight: 560, overflow: 'hidden' }}>
      <Image
        src="/images/hero-market.jpg"
        alt="Kingston Energies pop-up in Kingston"
        fill
        style={{ objectFit: 'cover', objectPosition: 'center 30%' }}
        sizes="100vw"
      />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(90deg,rgba(13,23,20,.92) 8%,rgba(13,23,20,.45) 55%,rgba(13,23,20,.25) 100%)',
        }}
      />
      <div
        style={{
          position: 'relative',
          maxWidth: 1240,
          margin: '0 auto',
          padding: '0 32px',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
        }}
      >
        <Reveal style={{ maxWidth: 560 }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, letterSpacing: '.3em', color: 'var(--ke-green-400)' }}>
            EST. KINGSTON&nbsp;·&nbsp;JAMAICA
          </div>
          <h2
            style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 800,
              fontSize: 'clamp(32px,5.5vw,56px)',
              lineHeight: 1.04,
              letterSpacing: '-.02em',
              color: '#fff',
              margin: '20px 0 0',
            }}
          >
            Born in Kingston.
            <br />
            Built for everywhere.
          </h2>
          <p style={{ fontSize: 17, lineHeight: 1.65, color: 'rgba(234,242,236,.78)', margin: '22px 0 0' }}>
            We started hand to hand — at markets and pop-ups, keeping real people charged. Every product we make
            still answers to that standard.
          </p>
        </Reveal>
      </div>
    </section>
  )
}
