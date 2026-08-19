'use client'

import { useEffect, useState } from 'react'
import { GitCompare } from 'lucide-react'
import Topbar from '../../_components/Topbar'
import { wizardCard } from '../../energy-checkup/_components/shared'
import { Field, inputStyle } from '@/components/shop/ui'
import StormPrepSubNav from '../_components/SubNav'
import CalcExplainer from '../_components/CalcExplainer'
import { computeReserve, fetchDevices, type DeviceSignal } from '../_lib/reserve'
import { compareScenarios } from '@/lib/energyCheckup/outageSimulation'

export default function ScenariosPage() {
  const [devices, setDevices] = useState<DeviceSignal[]>([])
  const [devicesLoaded, setDevicesLoaded] = useState(false)
  const [reserveInput, setReserveInput] = useState('')
  const [currentW, setCurrentW] = useState('80')
  const [saverW, setSaverW] = useState('40')

  useEffect(() => {
    fetchDevices().then(setDevices).finally(() => setDevicesLoaded(true))
  }, [])

  const { totalReserveWh } = computeReserve(devices)

  useEffect(() => {
    if (devicesLoaded && totalReserveWh > 0 && reserveInput === '') {
      setReserveInput(String(Math.round(totalReserveWh)))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [devicesLoaded, totalReserveWh])

  const reserveWh = Number(reserveInput) || 0
  const scenarios = compareScenarios(reserveWh, [
    { label: 'Current plan', avgLoadWatts: Number(currentW) || 0 },
    { label: 'Energy saver plan', avgLoadWatts: Number(saverW) || 0 },
  ])
  const maxHours = Math.max(...scenarios.map((s) => s.runtimeHours ?? 0), 1)

  return (
    <>
      <Topbar title="Storm prep" subtitle="Scenario comparison" />
      <div className="ke-screen" style={{ padding: 32 }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <StormPrepSubNav />

          <div style={{ ...wizardCard, marginBottom: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <GitCompare size={16} color="var(--ke-green-600)" />
              <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 17, margin: 0 }}>Current plan vs. energy saver plan</h3>
            </div>
            <p style={{ fontSize: 13, color: 'var(--color-text-muted)', margin: '6px 0 20px', maxWidth: 620 }}>
              Same reserve, two average draw figures — see how much longer cutting your load actually buys you.
              Enter your own numbers; nothing here is auto-tuned for you.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, marginBottom: 24 }}>
              <Field label="Reserve (Wh)">
                <input type="number" min={0} value={reserveInput} onChange={(e) => setReserveInput(e.target.value)} style={inputStyle} />
              </Field>
              <Field label="Current plan — average watts">
                <input type="number" min={0} value={currentW} onChange={(e) => setCurrentW(e.target.value)} style={inputStyle} />
              </Field>
              <Field label="Energy saver plan — average watts">
                <input type="number" min={0} value={saverW} onChange={(e) => setSaverW(e.target.value)} style={inputStyle} />
              </Field>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {scenarios.map((s) => (
                <div key={s.label}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
                    <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13.5 }}>{s.label}</span>
                    <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 18, color: 'var(--ke-green-700)' }}>
                      {s.runtimeHours === null ? '—' : `${s.runtimeHours.toFixed(1)}h`}
                    </span>
                  </div>
                  <div style={{ height: 10, borderRadius: 999, background: 'var(--ke-gray-100)', overflow: 'hidden' }}>
                    <div
                      style={{
                        height: '100%',
                        width: `${s.runtimeHours ? Math.min(100, (s.runtimeHours / maxHours) * 100) : 0}%`,
                        background: s.label === 'Current plan' ? 'var(--ke-sun-500)' : 'var(--ke-green-500)',
                        transition: 'width .4s var(--ease-out)',
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>

            <CalcExplainer>
              <p style={{ margin: 0 }}>
                Runtime = reserve (Wh) ÷ average watts. This is a straight-line projection — reserve minus (load ×
                hours elapsed) — and doesn&apos;t model solar recharge during the day, load spikes, or battery
                self-discharge, so treat it as a planning estimate rather than an exact countdown.
              </p>
            </CalcExplainer>
          </div>
        </div>
      </div>
    </>
  )
}
