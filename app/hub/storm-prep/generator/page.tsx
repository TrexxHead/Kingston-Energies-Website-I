'use client'

import { useState } from 'react'
import { Fuel, TriangleAlert, Plus, X } from 'lucide-react'
import Topbar from '../../_components/Topbar'
import { wizardCard } from '../../energy-checkup/_components/shared'
import { Field, inputStyle, Button } from '@/components/shop/ui'
import StormPrepSubNav from '../_components/SubNav'
import CalcExplainer from '../_components/CalcExplainer'
import { sizeGenerator, CO_SAFETY_RULES, type GeneratorLoadItem } from '@/lib/energyCheckup/generatorAssistant'

interface DraftLoad {
  name: string
  runningWatts: string
  startupWatts: string
}

const BLANK: DraftLoad = { name: '', runningWatts: '', startupWatts: '' }

export default function GeneratorAssistantPage() {
  const [loads, setLoads] = useState<DraftLoad[]>([{ ...BLANK }])

  function updateLoad(i: number, patch: Partial<DraftLoad>) {
    setLoads((prev) => prev.map((l, idx) => (idx === i ? { ...l, ...patch } : l)))
  }

  function addLoad() {
    setLoads((prev) => [...prev, { ...BLANK }])
  }

  function removeLoad(i: number) {
    setLoads((prev) => prev.filter((_, idx) => idx !== i))
  }

  const parsed: GeneratorLoadItem[] = loads
    .filter((l) => l.name.trim() && Number(l.runningWatts) > 0)
    .map((l) => ({
      name: l.name.trim(),
      runningWatts: Number(l.runningWatts) || 0,
      startupWatts: l.startupWatts ? Number(l.startupWatts) || null : null,
    }))

  const result = sizeGenerator(parsed)

  return (
    <>
      <Topbar title="Storm prep" subtitle="Generator assistant" />
      <div className="ke-screen" style={{ padding: 32 }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <StormPrepSubNav />

          <div style={{ ...wizardCard, marginBottom: 18, background: '#3a1414', border: '1px solid rgba(200,60,60,.35)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <TriangleAlert size={20} color="#e07a7a" />
              <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 18, margin: 0, color: '#fbe0e0' }}>
                Carbon monoxide safety — read before you run a generator
              </h2>
            </div>
            <ul style={{ margin: 0, paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 6 }}>
              {CO_SAFETY_RULES.map((rule) => (
                <li key={rule} style={{ fontSize: 13, color: 'rgba(251,224,224,.9)', lineHeight: 1.55 }}>{rule}</li>
              ))}
            </ul>
          </div>

          <div style={{ ...wizardCard, marginBottom: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <Fuel size={16} color="var(--ke-green-600)" />
              <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 17, margin: 0 }}>What size generator do I need?</h3>
            </div>
            <p style={{ fontSize: 13, color: 'var(--color-text-muted)', margin: '6px 0 20px', maxWidth: 620 }}>
              Kingston Energies doesn&apos;t sell generators — this just helps you size one you already have or are
              shopping for. List what you&apos;d want running at once; if you know a motor&apos;s startup surge
              (fridge, AC, pump), add it too — generators only need to cover the single largest surge, not all of
              them stacked together.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 14 }}>
              {loads.map((l, i) => (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr auto', gap: 10, alignItems: 'end' }}>
                  <Field label="Appliance">
                    <input value={l.name} onChange={(e) => updateLoad(i, { name: e.target.value })} placeholder="e.g. Fridge" style={inputStyle} />
                  </Field>
                  <Field label="Running watts">
                    <input type="number" min={0} value={l.runningWatts} onChange={(e) => updateLoad(i, { runningWatts: e.target.value })} style={inputStyle} />
                  </Field>
                  <Field label="Startup watts (optional)">
                    <input type="number" min={0} value={l.startupWatts} onChange={(e) => updateLoad(i, { startupWatts: e.target.value })} style={inputStyle} />
                  </Field>
                  <button
                    type="button"
                    onClick={() => removeLoad(i)}
                    aria-label="Remove"
                    style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: 8, color: 'var(--color-text-subtle)' }}
                  >
                    <X size={16} />
                  </button>
                </div>
              ))}
            </div>

            <Button variant="outline" size="sm" onClick={addLoad} iconLeft={<Plus size={14} />}>Add another appliance</Button>

            {parsed.length > 0 && (
              <div style={{ border: '1px solid var(--color-border)', borderRadius: 14, padding: 18, marginTop: 20 }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--color-text-subtle)' }}>
                  Suggested minimum generator size
                </div>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 32, color: 'var(--ke-green-700)', margin: '4px 0 8px' }}>
                  {Math.round(result.recommendedMinWatts)}W
                </div>
                <div style={{ fontSize: 12.5, color: 'var(--color-text-muted)', lineHeight: 1.6 }}>
                  {Math.round(result.totalRunningWatts)}W running total
                  {result.largestStartupWatts != null && (
                    <> plus the largest single startup surge ({Math.round(result.largestStartupWatts)}W) — the moment everything else is already running and one motor kicks on.</>
                  )}
                  . Buy with headroom above this, not right up to it.
                </div>

                <CalcExplainer>
                  <p style={{ margin: '0 0 8px' }}>
                    Running total = the sum of every appliance&apos;s running watts. Suggested size = running total −
                    the running watts of whichever appliance has the largest startup surge, + that surge figure — so
                    the moment it kicks on, everything else is already accounted for.
                  </p>
                  <p style={{ margin: 0 }}>
                    Startup surges are usually brief (a second or two) and don&apos;t typically overlap if you stagger
                    what you switch on, which is why only the single largest one is added rather than all of them
                    stacked together.
                  </p>
                </CalcExplainer>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
