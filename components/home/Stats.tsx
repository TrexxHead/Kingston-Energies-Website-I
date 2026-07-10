import Reveal from '../../app/_design-system/Reveal'

const STATS = [
  { value: '40', suffix: '+', gradient: 'var(--gradient-brand)', color: 'var(--ke-green-600)', label: 'POWER BANKS SOLD' },
  { value: '60', suffix: '+', gradient: 'var(--gradient-brand)', color: 'var(--ke-green-600)', label: 'CHARGERS SOLD' },
  { value: '2', suffix: '×', gradient: 'var(--gradient-sun)', color: '#f7941e', label: 'FASTER CHARGING' },
  { value: '12', suffix: 'mo', gradient: 'var(--gradient-brand)', color: 'var(--ke-green-600)', label: 'WARRANTY' },
]

export default function Stats() {
  return (
    <section style={{ background: '#fbfdfb', color: 'var(--color-text)', padding: '96px 0' }}>
      <Reveal
        className="kp-4col"
        style={{ maxWidth: 1140, margin: '0 auto', padding: '0 32px', display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 32 }}
      >
        {STATS.map((s) => (
          <div key={s.label}>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 56, letterSpacing: '-.03em', lineHeight: 1 }}>
              <span
                style={{
                  background: s.gradient,
                  WebkitBackgroundClip: 'text',
                  backgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  color: s.color,
                }}
              >
                {s.value}
              </span>
              <span style={{ color: s.color, fontSize: s.suffix === 'mo' ? 28 : undefined }}>{s.suffix}</span>
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '.24em', color: 'var(--color-text-muted)', marginTop: 12 }}>
              {s.label}
            </div>
          </div>
        ))}
      </Reveal>
    </section>
  )
}
