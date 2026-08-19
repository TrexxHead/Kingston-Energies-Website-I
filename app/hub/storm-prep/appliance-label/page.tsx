'use client'

import { useState } from 'react'
import { Tag, Info } from 'lucide-react'
import Topbar from '../../_components/Topbar'
import { wizardCard } from '../../energy-checkup/_components/shared'
import { Field, inputStyle } from '@/components/shop/ui'
import StormPrepSubNav from '../_components/SubNav'
import { wattsFromVoltsAndAmps } from '@/lib/energyCheckup/applianceLabel'

export default function ApplianceLabelPage() {
  const [volts, setVolts] = useState('')
  const [amps, setAmps] = useState('')

  const watts = wattsFromVoltsAndAmps(volts ? Number(volts) : null, amps ? Number(amps) : null)

  return (
    <>
      <Topbar title="Storm prep" subtitle="Read an appliance label" />
      <div className="ke-screen" style={{ padding: 32 }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <StormPrepSubNav />

          <div style={{ ...wizardCard, marginBottom: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <Tag size={16} color="var(--ke-green-600)" />
              <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 17, margin: 0 }}>Don&apos;t know the wattage? Check the label</h3>
            </div>
            <p style={{ fontSize: 13, color: 'var(--color-text-muted)', margin: '6px 0 20px', maxWidth: 620 }}>
              Look for a small metal or printed sticker on the back or bottom of the appliance — usually near the
              power cord. Type in exactly what it shows.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
              <div style={{ fontSize: 12.5, color: 'var(--color-text-muted)' }}>
                If the label already shows a number followed by <strong>&quot;W&quot;</strong> — that&apos;s the wattage. You&apos;re done, use that figure directly in the Energy Checkup or Advanced Mode.
              </div>
              <div style={{ fontSize: 12.5, color: 'var(--color-text-muted)' }}>
                If it only shows <strong>volts (V)</strong> and <strong>amps (A)</strong> — common on motors and older
                appliances — enter both below and we&apos;ll work out the watts.
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, marginBottom: 20 }}>
              <Field label="Volts (V)">
                <input type="number" min={0} value={volts} onChange={(e) => setVolts(e.target.value)} placeholder="e.g. 120" style={inputStyle} />
              </Field>
              <Field label="Amps (A)">
                <input type="number" min={0} step="0.1" value={amps} onChange={(e) => setAmps(e.target.value)} placeholder="e.g. 5" style={inputStyle} />
              </Field>
            </div>

            {watts !== null && (
              <div style={{ border: '1px solid var(--color-border)', borderRadius: 14, padding: 18 }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--color-text-subtle)' }}>
                  Calculated wattage
                </div>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 30, color: 'var(--ke-green-700)', margin: '4px 0 2px' }}>
                  {Math.round(watts)}W
                </div>
                <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{volts}V × {amps}A</div>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, background: 'var(--ke-mist)', borderRadius: 14, padding: '14px 18px' }}>
            <Info size={15} color="var(--color-text-muted)" style={{ flexShrink: 0, marginTop: 2 }} />
            <p style={{ fontSize: 12.5, color: 'var(--color-text-muted)', margin: 0, lineHeight: 1.6 }}>
              This is manual entry only — there&apos;s no camera scanning or automatic label reading in this build.
              V×A gives a maximum rated draw, which tends to run a bit higher than typical real-world usage for many
              appliances.
            </p>
          </div>
        </div>
      </div>
    </>
  )
}
