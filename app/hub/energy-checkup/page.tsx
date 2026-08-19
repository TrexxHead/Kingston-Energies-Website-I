'use client'

import { useMemo, useState } from 'react'
import { House, Store, ChevronLeft, ChevronRight, Info } from 'lucide-react'
import Topbar from '../_components/Topbar'
import { Badge } from '@/components/shop/ui'
import {
  allApplianceResults,
  totalEstimatedKwh,
  byCategory,
  effectiveRate,
  type ApplianceRow,
} from '@/lib/energyCheckup/calc'
import { libraryFor } from '@/lib/energyCheckup/applianceLibrary'
import { buildFixActions, type FixAction } from '@/lib/energyCheckup/fixList'
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
  const [fixActions, setFixActions] = useState<FixAction[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function set(patch: Partial<CuState>) {
    setState((s) => ({ ...s, ...patch }))
  }

  function pickMode(mode: Mode) {
    setState((s) => ({ ...s, mode, stage: 1 }))
  }

  const library = useMemo(() => libraryFor(state.mode ?? 'home'), [state.mode])

  // The one appliance in each library that's genuinely USB/DC-powered, for
  // the backup-kit builder — never AC-outlet equipment like a fridge or AC.
  const usbBackupId = state.mode === 'biz' ? 'wifi' : 'charging'
  const usbBackupDef = library.find((a) => a.id === usbBackupId)
  const usbBackup = {
    label: usbBackupDef?.displayName ?? 'devices',
    count: state.rows[usbBackupId]?.count ?? usbBackupDef?.defaultCount ?? 1,
    watts: usbBackupDef?.watts ?? 15,
  }

  const live = useMemo(() => {
    const rows = new Map<string, ApplianceRow>(
      library.map((a) => {
        const r = state.rows[a.id] ?? { count: a.defaultCount, hours: a.defaultHoursPerDay, intervalDays: 1 }
        return [a.id, { applianceId: a.id, count: r.count, hours: r.hours, intervalDays: r.intervalDays }]
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
              const r = state.rows[a.id] ?? { count: a.defaultCount, hours: a.defaultHoursPerDay, intervalDays: 1 }
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

      const finalRows = new Map<string, ApplianceRow>(
        library.map((a) => {
          const r = state.rows[a.id] ?? { count: a.defaultCount, hours: a.defaultHoursPerDay, intervalDays: 1 }
          return [a.id, { applianceId: a.id, count: r.count, hours: r.hours, intervalDays: r.intervalDays }]
        }),
      )
      const finalCtx = { acType: state.acType, waterType: state.waterType, lightType: state.lightType, fridgeAgeBand: state.fridgeAgeBand }
      const finalResults = allApplianceResults(library, finalRows, finalCtx)
      setFixActions(
        buildFixActions({
          mode: state.mode ?? 'home',
          results: finalResults,
          rows: finalRows,
          lightType: state.lightType,
          fridgeAgeBand: state.fridgeAgeBand,
        }),
      )

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

  function startOver() {
    setResults(null)
    setFixActions([])
    setError(null)
    setState(INITIAL_STATE)
  }

  return (
    <>
      <Topbar title="Energy usage checkup" subtitle="An honest estimate of where your power goes — calibrated against your real bill" />
      <div className="ke-screen" style={{ padding: 32 }}>
        {state.stage === 0 && <ForkScreen onPick={pickMode} />}

        {state.stage === 4 && results && (
          <div style={{ maxWidth: 900, margin: '0 auto' }}>
            <ResultsScreen
              results={results}
              mode={state.mode ?? 'home'}
              month={state.month || null}
              homeType={state.homeType}
              occupants={state.occupants}
              bizType={state.bizType}
              fixActions={fixActions}
              usbBackup={usbBackup}
              onSubmitContact={submitContact}
              onStartOver={startOver}
            />
          </div>
        )}

        {state.stage >= 1 && state.stage <= 3 && (
          <div style={{ maxWidth: 1040, margin: '0 auto', display: 'grid', gridTemplateColumns: 'minmax(0, 1.4fr) 1fr', gap: 18, alignItems: 'start' }}>
            <div>
              <WizardChrome stage={state.stage} mode={state.mode ?? 'home'} />
              {state.stage === 1 && <ContextStep state={state} set={set} />}
              {state.stage === 2 && <AppliancesStep state={state} set={set} />}
              {state.stage === 3 && <BillStep state={state} set={set} />}

              {error && <p style={{ color: '#d84a3a', fontSize: 13, marginTop: 12 }}>{error}</p>}

              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 20 }}>
                <button type="button" onClick={back} style={navBtn('ghost')}>
                  <ChevronLeft size={15} /> {state.stage === 1 ? 'Start over' : 'Back'}
                </button>
                <button type="button" onClick={continueStage} disabled={loading} style={navBtn('solid')}>
                  {loading ? 'Calculating…' : state.stage === 3 ? 'See my snapshot' : 'Continue'}
                  {!loading && <ChevronRight size={15} />}
                </button>
              </div>
            </div>

            <LiveRail totalKwh={live.totalKwh} categories={live.categories} rate={live.rate} month={state.month || null} />
          </div>
        )}
      </div>
    </>
  )
}

function ForkScreen({ onPick }: { onPick: (mode: Mode) => void }) {
  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      <div
        style={{
          position: 'relative',
          overflow: 'hidden',
          background: 'var(--gradient-deep)',
          borderRadius: 24,
          padding: 44,
          color: '#fff',
        }}
      >
        <div
          aria-hidden
          style={{
            position: 'absolute',
            top: -60,
            right: -60,
            width: 280,
            height: 280,
            borderRadius: 999,
            background: 'radial-gradient(circle, rgba(147,201,63,.30), transparent 70%)',
          }}
        />
        <div style={{ position: 'relative', maxWidth: 640 }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '.26em', color: 'var(--ke-green-400)', textTransform: 'uppercase' }}>
            Energy usage checkup
          </span>
          <h1
            style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 800,
              fontSize: 42,
              lineHeight: 1.06,
              letterSpacing: '-.025em',
              margin: '14px 0 0',
            }}
          >
            What's actually using your power?
          </h1>
          <p style={{ fontSize: 16.5, lineHeight: 1.6, color: 'rgba(234,242,236,.8)', margin: '18px 0 0' }}>
            A few questions about what you run, and we'll build you a real breakdown — calibrated against your own
            bill, not a generic estimate.
          </p>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'flex-start',
              gap: 8,
              marginTop: 22,
              padding: '10px 14px',
              borderRadius: 12,
              background: 'rgba(255,255,255,.07)',
              border: '1px solid rgba(255,255,255,.12)',
              maxWidth: 520,
            }}
          >
            <Info size={14} color="var(--ke-green-400)" style={{ flexShrink: 0, marginTop: 2 }} />
            <span style={{ fontSize: 12.5, color: 'rgba(234,242,236,.72)', lineHeight: 1.5 }}>
              This is an estimate, not a certified energy audit or electrical inspection. It exists to help you
              understand and reduce your energy use.
            </span>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 18, marginTop: 18 }}>
        <ForkCard icon={House} tone="green" title="Household" desc="Household usage, appliance by appliance." onClick={() => onPick('home')} />
        <ForkCard icon={Store} tone="blue" title="Business" desc="Retail, salon, office or F&B — plus outage cost." onClick={() => onPick('biz')} />
      </div>
    </div>
  )
}

function ForkCard({
  icon: Icon,
  tone,
  title,
  desc,
  onClick,
}: {
  icon: typeof House
  tone: 'green' | 'blue'
  title: string
  desc: string
  onClick: () => void
}) {
  const [hover, setHover] = useState(false)
  const accent = tone === 'green' ? 'var(--ke-green-500)' : 'var(--ke-blue-400)'
  const cta = tone === 'green' ? 'var(--ke-green-600)' : 'var(--ke-blue-600)'
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        textAlign: 'left',
        padding: 28,
        borderRadius: 20,
        border: `1.5px solid ${hover ? accent : 'var(--color-border)'}`,
        background: '#fff',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
        boxShadow: hover ? 'var(--shadow-lg)' : 'var(--shadow-sm)',
        transform: hover ? 'translateY(-3px)' : 'none',
        transition: 'all .22s var(--ease-standard)',
      }}
    >
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: 12,
          background: tone === 'green' ? 'var(--ke-green-50)' : 'var(--ke-blue-50)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon size={20} color={cta} />
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 19 }}>{title}</div>
        <div style={{ fontSize: 14, color: 'var(--color-text-muted)', marginTop: 6, lineHeight: 1.5 }}>{desc}</div>
      </div>
      <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', gap: 6, color: cta, fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 14 }}>
        Start <ChevronRight size={15} />
      </div>
    </button>
  )
}

function WizardChrome({ stage, mode }: { stage: CuState['stage']; mode: Mode }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <Badge tone={mode === 'home' ? 'green' : 'blue'}>{mode === 'home' ? 'Household' : 'Business'}</Badge>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '.22em', color: 'var(--color-text-subtle)', textTransform: 'uppercase' }}>
          Step {stage} of 3 — {STAGE_LABEL[stage]}
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
              background: n <= stage ? 'var(--ke-green-500)' : 'var(--ke-gray-200)',
              transition: 'background .3s var(--ease-standard)',
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
