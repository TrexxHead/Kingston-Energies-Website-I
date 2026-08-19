'use client'

import { useState } from 'react'
import { Sun, Info } from 'lucide-react'
import Topbar from '../../_components/Topbar'
import { wizardCard } from '../../energy-checkup/_components/shared'
import { Field, inputStyle } from '@/components/shop/ui'
import StormPrepSubNav from '../_components/SubNav'
import CalcExplainer from '../_components/CalcExplainer'
import { CATALOG } from '@/lib/catalog'
import { estimateSolarRecharge, SKY_CONDITION_META, type SkyCondition } from '@/lib/energyCheckup/solarRecharge'

const SOLAR_PANEL = CATALOG.find((p) => p.id === 'solar')
// Rated watts parsed from the panel's own spec string ("100W · FOLDABLE · IP54") — never invented.
const PANEL_RATED_WATTS = 100

export default function SolarRechargePage() {
  const [sunHours, setSunHours] = useState('6')
  const [condition, setCondition] = useState<SkyCondition>('partly-cloudy')

  const hours = Number(sunHours) || 0
  const estimate = estimateSolarRecharge(PANEL_RATED_WATTS, hours, condition)

  return (
    <>
      <Topbar title="Storm prep" subtitle="Solar recharge estimator" />
      <div className="ke-screen" style={{ padding: 32 }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <StormPrepSubNav />

          <div style={{ ...wizardCard, marginBottom: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <Sun size={16} color="var(--ke-sun-500)" />
              <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 17, margin: 0 }}>How much can I recharge with sun?</h3>
            </div>
            <p style={{ fontSize: 13, color: 'var(--color-text-muted)', margin: '6px 0 20px', maxWidth: 560 }}>
              Estimated using a {PANEL_RATED_WATTS}W panel&apos;s rated output — the panel&apos;s real spec, not a
              guess. Actual output outdoors depends on cloud cover, angle to the sun, and heat, so this is always a
              range, never an exact number.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginBottom: 20 }}>
              <Field label="Hours of daylight available">
                <input type="number" min={1} max={14} value={sunHours} onChange={(e) => setSunHours(e.target.value)} style={inputStyle} />
              </Field>
              <Field label="Sky condition">
                <select value={condition} onChange={(e) => setCondition(e.target.value as SkyCondition)} style={inputStyle}>
                  {(Object.keys(SKY_CONDITION_META) as SkyCondition[]).map((c) => (
                    <option key={c} value={c}>{SKY_CONDITION_META[c].label}</option>
                  ))}
                </select>
              </Field>
            </div>

            <p style={{ fontSize: 12, color: 'var(--color-text-subtle)', margin: '-8px 0 20px' }}>
              {SKY_CONDITION_META[condition].description}
            </p>

            {estimate && (
              <div style={{ border: '1px solid var(--color-border)', borderRadius: 14, padding: 18 }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--color-text-subtle)' }}>
                  Estimated recharge
                </div>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 28, color: 'var(--ke-sun-600, #b8720f)', margin: '4px 0 2px' }}>
                  {Math.round(estimate.lowWh)}–{Math.round(estimate.highWh)} Wh
                </div>
                <div style={{ fontSize: 12.5, color: 'var(--color-text-muted)' }}>
                  Over {hours} hour{hours === 1 ? '' : 's'} of {SKY_CONDITION_META[condition].label.toLowerCase()} skies.
                </div>
              </div>
            )}

            <CalcExplainer>
              <p style={{ margin: '0 0 8px' }}>
                Low estimate = {PANEL_RATED_WATTS}W × {SKY_CONDITION_META[condition].derate[0]} × sun hours. High
                estimate = {PANEL_RATED_WATTS}W × {SKY_CONDITION_META[condition].derate[1]} × sun hours.
              </p>
              <p style={{ margin: 0 }}>
                The {(SKY_CONDITION_META[condition].derate[0] * 100).toFixed(0)}–{(SKY_CONDITION_META[condition].derate[1] * 100).toFixed(0)}% derate
                accounts for the gap between a panel&apos;s lab-tested rated wattage and what it actually puts out
                outdoors — angle to the sun, heat, and cloud cover. It does not account for charge-controller losses
                beyond what&apos;s already folded into the derate band.
              </p>
            </CalcExplainer>
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, background: 'var(--ke-mist)', borderRadius: 14, padding: '14px 18px' }}>
            <Info size={15} color="var(--color-text-muted)" style={{ flexShrink: 0, marginTop: 2 }} />
            <p style={{ fontSize: 12.5, color: 'var(--color-text-muted)', margin: 0, lineHeight: 1.6 }}>
              This is a planning estimate, not a guarantee — real output varies with panel angle, temperature, and
              how consistently it&apos;s pointed at the sun through the day. Treat the low end of the range as what
              to plan around.
            </p>
          </div>
        </div>
      </div>
    </>
  )
}
