'use client'

import { useMemo, useState } from 'react'
import { Home, Building2, ChevronLeft, ChevronRight, Zap } from 'lucide-react'
import {
  allApplianceResults,
  totalEstimatedKwh,
  byCategory,
  effectiveRate,
  type ApplianceRow,
} from '@/lib/energyCheckup/calc'
import { libraryFor } from '@/lib/energyCheckup/applianceLibrary'
import LiveRail from './_components/LiveRail'
import ContextStep from './_components/ContextStep'
import AppliancesStep from './_components/AppliancesStep'
import BillStep from './_components/BillStep'
import ResultsScreen from './_components/ResultsScreen'
import { INITIAL_STATE, type CuState, type CheckupResults, type Mode } from './_components/types'

const STAGE_LABEL = ['', 'Context', 'Appliances', 'Your bill']

export default function EnergyCheckupPage() {
  const [state, setState] = useState<CuState>(INITIAL_STATE)
  const [results, setResults] = useState<CheckupResults | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function set(patch: Partial<CuState>) {
    setState((s) => ({ ...s, ...patch }))
  }

  function pickMode(mode: Mode) {
    setState((s) => ({ ...s, mode, stage: 1 }))
  }

  const library = useMemo(() => libraryFor(state.mode ?? 'home'), [state.mode])

  const live = useMemo(() => {
    const rows = new Map<string, ApplianceRow>(
      library.map((a) => {
        const r = state.rows[a.id] ?? { count: a.defaultCount, hours: a.defaultHoursPerDay }
        return [a.id, { applianceId: a.id, count: r.count, hours: r.hours }]
      }),
    )
    const ctx = { acType: state.acType, waterType: state.waterType, lightType: state.lightType, fridgeAgeBand: state.fridgeAgeBand }
    const applianceResults = allApplianceResults(library, rows, ctx)
    const totalKwh = totalEstimatedKwh(applianceResults)
    const categories = byCategory(applianceResults)
    const billKwh = Number(state.billKwh) || undefined
    const billJmd = Number(state.billJmd) || undefined
    const rate = effectiveRate(billKwh, billJmd, state.mode ?? 'home')
    return { totalKwh, categories, rate }
  }, [library, state.rows, state.acType, state.waterType, state.lightType, state.fridgeAgeBand, state.billKwh, state.billJmd, state.mode])

  async function submitForResults() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/hub/energy-checkup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: state.mode,
          parish: state.parish,
          occupants: state.occupants,
          homeType: state.homeType,
          acType: state.acType,
          fridgeAgeBand: state.fridgeAgeBand,
          waterType: state.waterType,
          lightType: state.lightType,
          bizType: state.bizType,
          backup: state.backup,
          rows: Object.fromEntries(
            library.map((a) => {
              const r = state.rows[a.id] ?? { count: a.defaultCount, hours: a.defaultHoursPerDay }
              return [a.id, r]
            }),
          ),
          billKwh: state.billKwh ? Number(state.billKwh) : undefined,
          billJmd: state.billJmd ? Number(state.billJmd) : undefined,
          month: state.month || undefined,
          revHour: state.revHour ? Number(state.revHour) : undefined,
          stops: state.stops,
        }),
      })
      if (!res.ok) throw new Error('failed')
      const data: CheckupResults = await res.json()
      setResults(data)
      set({ stage: 4 })
    } catch {
      setError("Couldn't compute your checkup — try again in a moment.")
    } finally {
      setLoading(false)
    }
  }

  async function submitContact(contact: string) {
    if (!results) return
    const res = await fetch(`/api/hub/energy-checkup/${results.id}/report`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contact }),
    })
    if (!res.ok) throw new Error('failed')
  }

  function back() {
    if (state.stage === 1) set({ mode: null, stage: 0 })
    else set({ stage: (state.stage - 1) as CuState['stage'] })
  }

  function continueStage() {
    if (state.stage === 3) {
      submitForResults()
    } else {
      set({ stage: (state.stage + 1) as CuState['stage'] })
    }
  }

  // --- Fork screen ---
  if (state.stage === 0) {
    return (
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '48px 24px' }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '.24em', color: 'var(--ke-green-600)', textTransform: 'uppercase' }}>
          Energy usage checkup
        </span>
        <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 30, margin: '10px 0 8px', letterSpacing: '-.02em' }}>
          What's actually using your power?
        </h1>
        <p style={{ fontSize: 15, color: 'var(--color-text-muted)', margin: '0 0 32px', maxWidth: 520 }}>
          A few questions about what you run, and we'll build you a real breakdown — calibrated against your own bill,
          not a generic estimate.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
          <ForkCard icon={Home} title="My home" desc="Household usage, appliance by appliance." onClick={() => pickMode('home')} />
          <ForkCard icon={Building2} title="My business" desc="Retail, salon, office or F&B — plus outage cost." onClick={() => pickMode('biz')} />
        </div>
      </div>
    )
  }

  // --- Results screen ---
  if (state.stage === 4 && results) {
    return (
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '32px 24px 64px' }}>
        <ResultsScreen results={results} mode={state.mode ?? 'home'} month={state.month || null} onSubmitContact={submitContact} />
      </div>
    )
  }

  // --- Wizard stages 1-3 ---
  return (
    <div style={{ maxWidth: 1040, margin: '0 auto', padding: '32px 24px 64px', display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 300px', gap: 28 }}>
      <div>
        <WizardChrome stage={state.stage} mode={state.mode ?? 'home'} />
        {state.stage === 1 && <ContextStep state={state} set={set} />}
        {state.stage === 2 && <AppliancesStep state={state} set={set} />}
        {state.stage === 3 && <BillStep state={state} set={set} />}

        {error && <p style={{ color: '#d84a3a', fontSize: 13, marginTop: 12 }}>{error}</p>}

        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 20 }}>
          <button type="button" onClick={back} style={navBtn('ghost')}>
            <ChevronLeft size={15} /> Back
          </button>
          <button type="button" onClick={continueStage} disabled={loading} style={navBtn('solid')}>
            {loading ? 'Calculating…' : state.stage === 3 ? 'See my results' : 'Continue'}
            {!loading && <ChevronRight size={15} />}
          </button>
        </div>
      </div>

      <LiveRail totalKwh={live.totalKwh} categories={live.categories} rate={live.rate} month={state.month || null} />
    </div>
  )
}

function ForkCard({ icon: Icon, title, desc, onClick }: { icon: typeof Home; title: string; desc: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        textAlign: 'left',
        padding: 24,
        borderRadius: 18,
        border: '1.5px solid var(--color-border)',
        background: '#fff',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}
    >
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: 12,
          background: 'var(--ke-green-50)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon size={20} color="var(--ke-green-600)" />
      </div>
      <div>
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16 }}>{title}</div>
        <div style={{ fontSize: 13, color: 'var(--color-text-muted)', marginTop: 4 }}>{desc}</div>
      </div>
    </button>
  )
}

function WizardChrome({ stage, mode }: { stage: CuState['stage']; mode: Mode }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <span
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '5px 11px',
            borderRadius: 999,
            background: 'var(--ke-green-50)',
            color: 'var(--ke-green-700)',
            fontFamily: 'var(--font-display)',
            fontWeight: 700,
            fontSize: 11.5,
          }}
        >
          <Zap size={12} /> {mode === 'home' ? 'Household' : 'Business'} checkup
        </span>
        <span style={{ fontSize: 12.5, color: 'var(--color-text-subtle)' }}>
          Step {stage} of 3 · {STAGE_LABEL[stage]}
        </span>
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        {[1, 2, 3].map((n) => (
          <span
            key={n}
            style={{
              flex: 1,
              height: 4,
              borderRadius: 999,
              background: n <= stage ? 'var(--ke-green-500)' : 'var(--color-border)',
            }}
          />
        ))}
      </div>
    </div>
  )
}

function navBtn(kind: 'solid' | 'ghost'): import('react').CSSProperties {
  return {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '11px 20px',
    borderRadius: 10,
    border: kind === 'ghost' ? '1.5px solid var(--color-border)' : 'none',
    background: kind === 'solid' ? 'var(--ke-green-500)' : '#fff',
    color: kind === 'solid' ? '#fff' : 'var(--color-text-muted)',
    fontFamily: 'var(--font-display)',
    fontWeight: 700,
    fontSize: 14,
    cursor: 'pointer',
  }
}
