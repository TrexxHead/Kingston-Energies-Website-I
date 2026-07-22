'use client'

import { cardStyle, h3Style } from '../ui/card'
import { funnel, heatmapSeed, geography } from '../mockData'
import NpsCard from './NpsCard'

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const maxFunnel = funnel[0].count

export default function AnalyticsSection() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <NpsCard />
      <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: 16 }}>
        <div style={cardStyle}>
          <h3 style={h3Style}>Conversion funnel</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {funnel.map((f) => (
              <div key={f.label}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 4 }}>
                  <span>{f.label}</span>
                  <span>{f.count.toLocaleString()}</span>
                </div>
                <div style={{ height: 20, borderRadius: 8, background: 'var(--ke-gray-100)', overflow: 'hidden' }}>
                  <div
                    style={{
                      height: '100%',
                      width: `${(f.count / maxFunnel) * 100}%`,
                      background: 'linear-gradient(90deg,var(--ke-green-400),var(--ke-blue-400))',
                      borderRadius: 8,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 14, paddingTop: 10, borderTop: '1px solid var(--color-border)', fontSize: 12.5, color: 'var(--color-text-muted)' }}>
            Abandoned carts: <strong>41</strong> · potential recovery{' '}
            <strong style={{ color: 'var(--ke-green-700)' }}>J$372,000</strong>
          </div>
        </div>

        <div style={cardStyle}>
          <h3 style={h3Style}>Purchase-time heatmap</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 4 }}>
            {heatmapSeed.map((v, i) => (
              <div
                key={i}
                title={`${v}/5 activity`}
                style={{
                  aspectRatio: '1',
                  borderRadius: 4,
                  background: 'var(--ke-green-500)',
                  opacity: 0.18 + v * 0.16,
                }}
              />
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
            {DAY_LABELS.map((d) => (
              <span key={d} style={{ fontSize: 10, color: 'var(--color-text-subtle)' }}>
                {d}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div style={cardStyle}>
          <h3 style={h3Style}>Geographic distribution</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {geography.map((g) => (
              <div key={g.name}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, marginBottom: 4 }}>
                  <span>{g.name}</span>
                  <span>{g.pct}%</span>
                </div>
                <div style={{ height: 8, borderRadius: 999, background: 'var(--ke-gray-100)', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${g.pct}%`, background: 'var(--gradient-brand)', borderRadius: 999 }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={cardStyle}>
          <h3 style={h3Style}>Repeat purchase &amp; devices</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 26 }}>58%</div>
              <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>repeat purchase rate</div>
            </div>
            <div>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 26 }}>312</div>
              <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>devices registered</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
