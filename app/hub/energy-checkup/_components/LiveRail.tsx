'use client'

import { Lightbulb } from 'lucide-react'
import { fmt } from '@/lib/catalog'
import { CATEGORY_META, type Category } from '@/lib/energyCheckup/applianceLibrary'
import { CONTEXTUAL_TIP_BY_LEADING_CATEGORY } from '@/lib/energyCheckup/recommendations'

interface CategorySlice {
  category: Category
  kwh: number
}

export default function LiveRail({
  totalKwh,
  categories,
  rate,
  month,
}: {
  totalKwh: number
  categories: CategorySlice[]
  rate: { rate: number; source: 'bill' | 'reference' }
  month: string | null
}) {
  const shown = categories.filter((c) => c.kwh > 0.05)
  const costLine =
    rate.source === 'bill'
      ? `≈ ${fmt(Math.round(totalKwh * rate.rate))} from your ${month ?? 'last'} bill`
      : `≈ ${fmt(Math.round(totalKwh * rate.rate))} at our reference rate — add your bill for your real number`
  const leading = shown[0]?.category

  return (
    <div
      style={{
        position: 'sticky',
        top: 0,
        background: '#0d1714',
        borderRadius: 20,
        padding: 24,
        boxShadow: 'var(--shadow-lg)',
        color: '#eaf2ec',
      }}
      aria-live="polite"
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '.24em', color: 'var(--ke-green-400)', textTransform: 'uppercase' }}>
          Live estimate
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5, color: 'rgba(234,242,236,.6)' }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--ke-green-400)', animation: 'keCheckupPulse 2.4s ease-in-out infinite' }} />
          updating
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 8 }}>
        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 46, lineHeight: 1, letterSpacing: '-.03em' }}>
          {Math.round(totalKwh)}
        </span>
        <span style={{ fontSize: 15, color: 'rgba(234,242,236,.6)' }}>kWh / month</span>
      </div>
      <div style={{ fontSize: 13, color: 'rgba(234,242,236,.55)', marginTop: 6 }}>{costLine}</div>

      <div style={{ display: 'flex', height: 14, borderRadius: 999, overflow: 'hidden', background: 'rgba(255,255,255,.07)', marginTop: 18 }}>
        {shown.map((c) => (
          <span key={c.category} style={{ flex: c.kwh, background: CATEGORY_META[c.category].color }} />
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 14 }}>
        {shown.map((c) => (
          <div key={c.category} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 8, height: 8, borderRadius: 2, background: CATEGORY_META[c.category].color, flexShrink: 0 }} />
            <span style={{ fontSize: 13, flex: 1 }}>{CATEGORY_META[c.category].label}</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'rgba(234,242,236,.6)' }}>
              {totalKwh > 0 ? Math.round((c.kwh / totalKwh) * 100) : 0}%
            </span>
          </div>
        ))}
      </div>

      {leading && (
        <div style={{ display: 'flex', gap: 8, marginTop: 14, paddingTop: 14, borderTop: '1px solid rgba(255,255,255,.09)' }}>
          <Lightbulb size={15} color="var(--ke-sun-400)" style={{ flexShrink: 0, marginTop: 1 }} />
          <span style={{ fontSize: 12.5, color: 'rgba(234,242,236,.75)', lineHeight: 1.5 }}>
            {CONTEXTUAL_TIP_BY_LEADING_CATEGORY[leading]}
          </span>
        </div>
      )}

      <style>{`@keyframes keCheckupPulse { 0%,100% { opacity: 1 } 50% { opacity: .35 } }
      @media (prefers-reduced-motion: reduce) { [style*="keCheckupPulse"] { animation: none !important } }`}</style>
    </div>
  )
}
