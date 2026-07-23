'use client'

import ProgressBar from '../ui/ProgressBar'
import { cardStyle, h3Style } from '../ui/card'
import { financeStats, marginByCategory, outstandingRows } from '../mockData'
import PaymentSettingsCard from './PaymentSettingsCard'

export default function FinanceSection() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <PaymentSettingsCard />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14 }}>
        {financeStats.map((s) => (
          <div key={s.label} style={{ ...cardStyle, borderRadius: 14, padding: 16 }}>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 21 }}>{s.val}</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9.5, letterSpacing: '.12em', color: 'var(--color-text-muted)', marginTop: 6 }}>
              {s.label}
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: 16 }}>
        <div style={cardStyle}>
          <h3 style={h3Style}>Margin by category</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {marginByCategory.map((m) => (
              <ProgressBar key={m.label} label={m.label} value={m.val} tone={m.tone} showValue />
            ))}
          </div>
        </div>

        <div style={cardStyle}>
          <h3 style={h3Style}>Outstanding &amp; refunds</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {outstandingRows.map((r) => (
              <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                <span style={{ color: 'var(--color-text-muted)' }}>{r.label}</span>
                <span style={{ fontWeight: 700 }}>{r.value}</span>
              </div>
            ))}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: 13,
                borderTop: '1px solid var(--color-border)',
                marginTop: 4,
                paddingTop: 10,
              }}
            >
              <span style={{ color: 'var(--color-text-muted)' }}>30-day forecast</span>
              <span style={{ fontWeight: 700, color: 'var(--ke-green-700)' }}>J$1,960,000</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
