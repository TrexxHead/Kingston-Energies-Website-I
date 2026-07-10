'use client'

import Badge from '../ui/Badge'
import Button from '../ui/Button'
import Switch from '../ui/Switch'
import { cardStyle, h3Style } from '../ui/card'
import { campaigns, type Banner, type Promo } from '../mockData'

interface MarketingSectionProps {
  banners: Banner[]
  onToggleBanner: (index: number) => void
  flashOn: boolean
  onToggleFlash: () => void
  promos: Promo[]
  onTogglePromo: (index: number) => void
  newPromoCode: string
  onChangeNewPromoCode: (value: string) => void
  onCreatePromo: () => void
}

export default function MarketingSection({
  banners,
  onToggleBanner,
  flashOn,
  onToggleFlash,
  promos,
  onTogglePromo,
  newPromoCode,
  onChangeNewPromoCode,
  onCreatePromo,
}: MarketingSectionProps) {
  const flashLabel = flashOn ? 'Live now — ends in 2 days' : 'Currently paused'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 16 }}>
        <div style={cardStyle}>
          <h3 style={h3Style}>Homepage banners</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {banners.map((b, i) => (
              <div
                key={b.text}
                style={{
                  border: '1px solid var(--color-border)',
                  borderRadius: 12,
                  padding: '11px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                }}
              >
                <span style={{ flex: 1, fontSize: 13 }}>{b.text}</span>
                <Switch checked={b.active} onChange={() => onToggleBanner(i)} />
              </div>
            ))}
          </div>
        </div>

        <div style={{ background: 'var(--gradient-deep)', borderRadius: 16, padding: 20, color: '#fff' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h3 style={{ ...h3Style, margin: 0, color: '#fff' }}>Flash sale</h3>
            <Switch checked={flashOn} onChange={onToggleFlash} />
          </div>
          <p style={{ fontSize: 12.5, color: 'rgba(255,255,255,.75)', marginTop: 10 }}>{flashLabel}</p>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 24, marginTop: 10 }}>
            20% off power banks
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div style={cardStyle}>
          <h3 style={h3Style}>Discount codes</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {promos.map((p, i) => (
              <div key={p.code} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12.5, flex: 1 }}>{p.code}</span>
                <span style={{ fontSize: 12.5, color: 'var(--color-text-muted)' }}>{p.value}</span>
                <Badge tone={p.active ? 'green' : 'neutral'} onClick={() => onTogglePromo(i)}>
                  {p.active ? 'Active' : 'Paused'}
                </Badge>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
            <input
              value={newPromoCode}
              onChange={(e) => onChangeNewPromoCode(e.target.value.toUpperCase())}
              placeholder="NEWCODE10"
              style={{
                padding: '9px 12px',
                border: '1.5px solid var(--color-border)',
                borderRadius: 10,
                fontFamily: 'var(--font-mono)',
                fontSize: 12.5,
                textTransform: 'uppercase',
                outline: 'none',
                flex: 1,
              }}
            />
            <Button variant="outline" size="sm" onClick={onCreatePromo}>
              Create
            </Button>
          </div>
        </div>

        <div style={cardStyle}>
          <h3 style={h3Style}>Scheduled campaigns</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {campaigns.map((c) => (
              <div key={c.name} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Badge tone={c.tone as 'blue' | 'green' | 'orange'}>{c.channel}</Badge>
                <span style={{ flex: 1, fontSize: 12.5 }}>{c.name}</span>
                <span style={{ fontSize: 11.5, color: 'var(--color-text-muted)' }}>{c.when}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
