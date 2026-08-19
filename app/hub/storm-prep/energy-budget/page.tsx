'use client'

import { useEffect, useState } from 'react'
import { Calculator, Check } from 'lucide-react'
import Topbar from '../../_components/Topbar'
import { wizardCard } from '../../energy-checkup/_components/shared'
import { Field, inputStyle } from '@/components/shop/ui'
import StormPrepSubNav from '../_components/SubNav'
import { computeReserve, fetchDevices, type DeviceSignal } from '../_lib/reserve'
import { buildEnergyBudget } from '@/lib/energyCheckup/energyBudget'

export default function EnergyBudgetPage() {
  const [devices, setDevices] = useState<DeviceSignal[]>([])
  const [devicesLoaded, setDevicesLoaded] = useState(false)
  const [reserveInput, setReserveInput] = useState('')
  const [hours, setHours] = useState('10')

  useEffect(() => {
    fetchDevices().then(setDevices).finally(() => setDevicesLoaded(true))
  }, [])

  const { totalReserveWh } = computeReserve(devices)

  useEffect(() => {
    if (devicesLoaded && totalReserveWh > 0 && reserveInput === '') {
      setReserveInput(String(Math.round(totalReserveWh)))
    }
    // Only pre-fill once, when the real reserve first loads — never overwrite what the user typed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [devicesLoaded, totalReserveWh])

  const reserveWh = Number(reserveInput) || 0
  const targetHours = Number(hours) || 0
  const budget = buildEnergyBudget(reserveWh, targetHours)

  return (
    <>
      <Topbar title="Storm prep" subtitle="Energy budget" />
      <div className="ke-screen" style={{ padding: 32 }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <StormPrepSubNav />

          <div style={{ ...wizardCard, marginBottom: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <Calculator size={16} color="var(--ke-green-600)" />
              <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 17, margin: 0 }}>Make your battery last</h3>
            </div>
            <p style={{ fontSize: 13, color: 'var(--color-text-muted)', margin: '6px 0 20px', maxWidth: 560 }}>
              Tell us what you have left and how long it needs to last — we&apos;ll work out a target average draw and
              what to cut to hit it.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginBottom: 20 }}>
              <Field label="Stored energy remaining (Wh)">
                <input type="number" min={0} value={reserveInput} onChange={(e) => setReserveInput(e.target.value)} style={inputStyle} />
              </Field>
              <Field label="Needs to last (hours)">
                <input type="number" min={1} value={hours} onChange={(e) => setHours(e.target.value)} style={inputStyle} />
              </Field>
            </div>
            {devicesLoaded && totalReserveWh > 0 && (
              <p style={{ fontSize: 11.5, color: 'var(--color-text-subtle)', margin: '-10px 0 20px' }}>
                Pre-filled from your registered devices&apos; usable capacity — adjust it to whatever&apos;s actually
                left on the display right now.
              </p>
            )}

            {budget.recommendedAverageW !== null ? (
              <div style={{ border: '1px solid var(--color-border)', borderRadius: 14, padding: 18, marginBottom: 20 }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--color-text-subtle)' }}>
                  Recommended average draw
                </div>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 32, color: 'var(--ke-green-700)', margin: '4px 0 2px' }}>
                  ≤{Math.round(budget.recommendedAverageW)}W
                </div>
                <div style={{ fontSize: 12.5, color: 'var(--color-text-muted)' }}>
                  {Math.round(reserveWh)} Wh ÷ {targetHours}h — stay under this on average and the reserve should stretch the distance.
                </div>
              </div>
            ) : (
              <p style={{ fontSize: 13, color: 'var(--color-text-subtle)', marginBottom: 20 }}>Enter how many hours it needs to last.</p>
            )}

            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 13, marginBottom: 10 }}>How to get there</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {budget.tips.map((tip, i) => (
                <div key={i} style={{ display: 'flex', gap: 9, alignItems: 'flex-start' }}>
                  <Check size={14} color="var(--ke-green-600)" style={{ flexShrink: 0, marginTop: 2 }} />
                  <span style={{ fontSize: 13, color: 'var(--color-text-muted)', lineHeight: 1.55 }}>{tip.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
