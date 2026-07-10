import Reveal from '../../app/_design-system/Reveal'

const PHASES = [
  {
    dot: 'solid' as const,
    color: 'var(--ke-green-400)',
    phase: 'PHASE 01',
    when: 'NOW',
    title: 'Portable power',
    copy: 'Power banks, chargers, cables and accessories — shipping today, sold hand to hand and door to door.',
    borderBottom: false,
  },
  {
    dot: 'hollow' as const,
    color: 'var(--ke-blue-400)',
    phase: 'PHASE 02',
    when: 'NEXT',
    title: 'Renewable energy',
    copy: 'Residential solar panels, solar kits and batteries, solar chargers, energy storage.',
    borderBottom: false,
  },
  {
    dot: 'hollow' as const,
    color: '#f7941e',
    phase: 'PHASE 03',
    when: 'COMING SOON',
    title: 'Smart energy',
    copy: 'Home energy products, monitoring, smart power and sustainable electronics.',
    borderBottom: true,
  },
]

export default function Roadmap() {
  return (
    <section id="ke-roadmap" style={{ background: '#0d1714', padding: '110px 0', position: 'relative' }}>
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '0 32px' }}>
        <Reveal>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, letterSpacing: '.3em', color: 'var(--ke-green-400)' }}>
            THE PLAN
          </div>
          <h2
            style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 800,
              fontSize: 'clamp(32px,5vw,56px)',
              letterSpacing: '-.025em',
              color: '#fff',
              margin: '18px 0 0',
            }}
          >
            One roadmap.
            <br />
            Three phases.
          </h2>
        </Reveal>

        <div style={{ marginTop: 64, display: 'flex', flexDirection: 'column' }}>
          {PHASES.map((p) => (
            <Reveal key={p.phase}>
              <div
                className="kp-2col"
                style={{
                  display: 'grid',
                  gridTemplateColumns: '200px 1fr',
                  gap: 32,
                  padding: '36px 0',
                  borderTop: '1px solid rgba(255,255,255,.09)',
                  borderBottom: p.borderBottom ? '1px solid rgba(255,255,255,.09)' : undefined,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  <span
                    style={{
                      width: 9,
                      height: 9,
                      borderRadius: 999,
                      marginTop: 5,
                      flexShrink: 0,
                      ...(p.dot === 'solid'
                        ? { background: p.color, boxShadow: `0 0 14px ${p.color}` }
                        : { border: `1.5px solid ${p.color}` }),
                    }}
                  />
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, letterSpacing: '.22em', color: p.color, lineHeight: 1.6 }}>
                    {p.phase}
                    <br />
                    <span style={{ color: 'rgba(234,242,236,.45)' }}>{p.when}</span>
                  </div>
                </div>
                <div>
                  <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 26, color: '#fff' }}>{p.title}</div>
                  <p style={{ fontSize: 15.5, lineHeight: 1.65, color: 'rgba(234,242,236,.62)', margin: '10px 0 0', maxWidth: 480 }}>
                    {p.copy}
                  </p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
