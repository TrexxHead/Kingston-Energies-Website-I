'use client'

import { TriangleAlert } from 'lucide-react'
import Badge from '../ui/Badge'
import { cardStyle, h3Style } from '../ui/card'
import { execStats, revenueBars, bestSellers, lowStockAlerts, customerGrowth } from '../mockData'

export default function ExecutiveSection() {
  const maxBar = Math.max(...revenueBars)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6,1fr)', gap: 14 }}>
        {execStats.map((s) => (
          <div key={s.label} style={{ ...cardStyle, borderRadius: 14, padding: 14 }}>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 19, letterSpacing: '-.01em' }}>{s.val}</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '.12em', color: 'var(--color-text-muted)', marginTop: 5 }}>
              {s.label}
            </div>
            <div style={{ fontSize: 10.5, color: 'var(--ke-green-600)', marginTop: 5 }}>{s.trend}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 16 }}>
        <div style={cardStyle}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <h3 style={{ ...h3Style, margin: 0 }}>Revenue — last 14 days</h3>
            <Badge tone="green">+18% MoM</Badge>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 140 }}>
            {revenueBars.map((v, i) => {
              const isLast = i === revenueBars.length - 1
              return (
                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                  <div
                    style={{
                      width: '100%',
                      height: (v / maxBar) * 120,
                      borderRadius: '4px 4px 2px 2px',
                      background: isLast ? 'var(--gradient-sun)' : 'var(--gradient-brand)',
                      opacity: isLast ? 1 : 0.85,
                    }}
                  />
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--color-text-subtle)' }}>{i + 1}</span>
                </div>
              )
            })}
          </div>
        </div>

        <div style={cardStyle}>
          <h3 style={h3Style}>Best sellers</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {bestSellers.map((p, i) => (
              <div key={p.name} style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-text-muted)', width: 14 }}>{i + 1}</span>
                <span style={{ fontSize: 13, flex: 1 }}>{p.name}</span>
                <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 12.5 }}>{p.units} sold</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div style={{ ...cardStyle, border: '1px solid var(--ke-sun-400)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <TriangleAlert size={16} color="var(--ke-sun-400)" />
            <h3 style={{ ...h3Style, margin: 0 }}>Low stock alerts</h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {lowStockAlerts.map((a) => (
              <div key={a.name} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                <span>{a.name}</span>
                <Badge tone="orange">{a.stockLabel}</Badge>
              </div>
            ))}
          </div>
        </div>

        <div style={cardStyle}>
          <h3 style={h3Style}>Customer growth</h3>
          <div style={{ display: 'flex', gap: 20 }}>
            <div>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 26 }}>{customerGrowth.total}</div>
              <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>total customers</div>
            </div>
            <div>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 26, color: 'var(--ke-green-600)' }}>
                +{customerGrowth.newThisMonth}
              </div>
              <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>new this month</div>
            </div>
            <div>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 26 }}>{customerGrowth.conversionRate}</div>
              <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>conversion rate</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
