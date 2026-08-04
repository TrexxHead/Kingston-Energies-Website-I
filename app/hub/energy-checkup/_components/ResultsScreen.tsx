'use client'

import { useState, type CSSProperties } from 'react'
import Link from 'next/link'
import {
  CircleHelp, CircleCheck, TriangleAlert, PowerOff, Sun, Send, RotateCcw,
  MailCheck, ShieldAlert, CalendarRange, Scale, ChevronDown, ChevronUp, ExternalLink,
} from 'lucide-react'
import { fmt } from '@/lib/catalog'
import { Badge, FeatureIcon } from '@/components/shop/ui'
import { CATEGORY_META, libraryFor } from '@/lib/energyCheckup/applianceLibrary'
import { iconFor } from './icons'
import { wizardCard } from './shared'
import FixListSimulator from './FixListSimulator'
import ConsultForm from './ConsultForm'
import type { CheckupResults, Mode } from './types'
import type { FixAction } from '@/lib/energyCheckup/fixList'

function tierCtaStyle(accent: string, variant: 'primary' | 'outline'): CSSProperties {
  return {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    height: 42,
    borderRadius: 10,
    width: '100%',
    fontFamily: 'var(--font-display)',
    fontWeight: 700,
    fontSize: 13.5,
    background: variant === 'primary' ? accent : 'transparent',
    color: variant === 'primary' ? '#fff' : accent,
    border: variant === 'outline' ? `1.5px solid ${accent}` : 'none',
  }
}

const cardStyle: CSSProperties = { ...wizardCard, marginBottom: 18 }
const sectionTitle: CSSProperties = { fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 17, margin: '0 0 4px' }
const overline: CSSProperties = { fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '.24em', color: 'var(--ke-green-600)', textTransform: 'uppercase' }

const SOLAR_VERDICT: Record<CheckupResults['solar']['verdict'], { label: string; tone: 'green' | 'blue' | 'neutral' }> = {
  strong: { label: 'Strong fit', tone: 'green' },
  exploring: { label: 'Worth exploring', tone: 'blue' },
  'efficiency-first': { label: 'Efficiency first', tone: 'neutral' },
}

const BENCHMARK_LABEL: Record<CheckupResults['benchmark']['verdict'], string> = {
  below: 'Below the typical Jamaican home',
  at: 'In line with the typical Jamaican home',
  above: 'Above the typical Jamaican home',
  'well-above': 'Well above the typical Jamaican home',
}

interface TierMeta {
  title: string
  timing: string
  accent: string
  soft: string
  cta?: { label: string; variant: 'primary' | 'outline' } & ({ href: string; action?: undefined } | { href?: undefined; action: 'consult' })
}

const TIERS_META: TierMeta[] = [
  { title: 'Free, this week', timing: 'Habit changes only', accent: 'var(--ke-green-600)', soft: 'var(--ke-green-50)' },
  { title: 'Small purchase', timing: 'Near-term, low cost', accent: 'var(--ke-blue-600)', soft: 'var(--ke-blue-50)', cta: { label: 'Browse the shop', href: '/shop', variant: 'primary' } },
  { title: 'Bigger investment', timing: 'Roadmap-aligned', accent: '#c0821c', soft: 'var(--ke-sun-50)', cta: { label: 'Talk to us', action: 'consult', variant: 'outline' } },
]

const SOURCES: { tag: string; claim: string; href: string }[] = [
  { tag: 'JPS', claim: 'AC, water heating & refrigeration are the "Big 3" — AC alone can be 50–60% of a bill.', href: 'https://www.jpsco.com/understanding-your-jps-bill/' },
  { tag: 'JPS', claim: 'AC at 25°C + heater off ⇒ 30–40% bill cut; LED up to 80% less than incandescent.', href: 'https://www.jpsco.com/understanding-your-jps-bill/' },
  { tag: 'JPS', claim: 'Bill = Energy + Fuel + IPP + Customer charges + FX Adjustment + GCT (7% residential / 15% business).', href: 'https://www.jpsco.com/understanding-your-jps-bill/' },
  { tag: 'GlobalPetrolPrices', claim: 'Residential J$45.78/kWh all-in; business J$37.53/kWh (Sept 2025).', href: 'https://www.globalpetrolprices.com/Jamaica/electricity_prices/' },
  { tag: 'Dosolar', claim: 'Typical household 250–300 kWh/month ⇒ J$12,000–15,000.', href: 'https://dosolar.io/free-guide-to-transition-to-solar-power-in-jamaica/' },
  { tag: 'Ecopower JA', claim: 'Residential systems J$1.2M–1.5M for a 6–8kW inverter with 8–12 panels, installed — works with Deye, LuxPower, SRNE & Schneider inverters.', href: 'https://ecopowerja.com/' },
  { tag: 'Sunchees', claim: '30% tax credit capped J$1.2M; GCT exemption; NHT loans to J$2.5M.', href: 'https://www.sunchees.com/news/Industry-News/solar-power-grants-for-homeowners-in-jamaica-guide-to-incentives-and-system-choices.html' },
  { tag: 'NHT', claim: 'Solar loans up to J$2.5M — 0% interest for the first 12 months, then 4–7% for up to 10 years.', href: 'https://www.sunchees.com/caribbean/jamaica/' },
  { tag: 'Forbes', claim: 'Hurricane Melissa cut power to ~550,000 JPS customers — >70% dark at peak (Nov 2025).', href: 'https://www.forbes.com/sites/dianneplummer/2025/11/21/hurricane-melissa-shows-why-electricity-access-is-not-grid-resilience/' },
]

export default function ResultsScreen({
  results,
  mode,
  month,
  homeType,
  occupants,
  bizType,
  fixActions,
  onSubmitContact,
  onStartOver,
}: {
  results: CheckupResults
  mode: Mode
  month: string | null
  homeType?: string
  occupants?: number
  bizType?: string
  fixActions: FixAction[]
  onSubmitContact: (contact: string) => Promise<void>
  onStartOver: () => void
}) {
  const [showConsult, setShowConsult] = useState(false)
  const monthlyCostJmd = Math.round(results.totalKwh * results.rate.rate)
  const contextLine =
    mode === 'home'
      ? [homeType, occupants ? `${occupants} people` : null, month ? `${month} bill` : null].filter(Boolean).join(' · ')
      : [bizType, month ? `${month} bill` : null].filter(Boolean).join(' · ')

  const headline = !results.calibration
    ? 'Here is your estimate.'
    : results.calibration.withinBand
      ? 'Here is your month.'
      : 'Close, with one gap to chase.'

  const library = libraryFor(mode)
  const applianceRows = [...results.appliances].sort((a, b) => b.kwh - a.kwh).slice(0, 7)
  const maxApplianceKwh = applianceRows[0]?.kwh || 1

  return (
    <div>
      {/* 3.5 — Snapshot band */}
      <div style={{ background: 'var(--gradient-deep)', borderRadius: 24, padding: 32, color: '#fff', marginBottom: 18 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24, justifyContent: 'space-between' }}>
          <div style={{ maxWidth: 420 }}>
            <span style={{ ...overline, color: 'var(--ke-green-400)' }}>Your power snapshot</span>
            <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 34, lineHeight: 1.08, margin: '10px 0 6px' }}>{headline}</h1>
            {contextLine && <p style={{ fontSize: 14, color: 'rgba(234,242,236,.7)', margin: 0 }}>{contextLine}</p>}
          </div>
          <div style={{ display: 'flex', gap: 28, flexWrap: 'wrap' }}>
            <Stat label="Estimated" value={`${Math.round(results.totalKwh)} kWh`} />
            <Stat label="Your rate" value={`J$${results.rate.rate.toFixed(1)}/kWh`} />
            <Stat label="Possible saving" value={`${fmt(results.savings.lowJmd)}–${fmt(results.savings.highJmd)}`} accent="var(--ke-green-400)" />
          </div>
        </div>
        <div style={{ fontSize: 13.5, color: 'rgba(234,242,236,.65)', marginTop: 18 }}>≈ {fmt(monthlyCostJmd)} / month</div>
      </div>

      {/* 3.6 — Breakdown & calibration */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.25fr 1fr', gap: 18, marginBottom: 18 }} className="kp-2col">
        <div style={cardStyle}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <h3 style={sectionTitle}>Where your power goes</h3>
            {month && <Badge tone="neutral">{month}</Badge>}
          </div>
          <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 14 }}>
            {applianceRows.map((row) => {
              const def = library.find((a) => a.id === row.id)
              const meta = CATEGORY_META[row.category as keyof typeof CATEGORY_META]
              const Icon = iconFor(def?.icon ?? 'package')
              const jmd = Math.round(row.kwh * results.rate.rate)
              return (
                <div key={row.id}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <Icon size={15} color="var(--color-text-muted)" />
                    <span style={{ fontSize: 13.5, fontWeight: 600, fontFamily: 'var(--font-display)', flex: 1 }}>{def?.displayName ?? row.id}</span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11.5, color: 'var(--color-text-muted)' }}>
                      {Math.round(row.kwh)} kWh · {fmt(jmd)}
                    </span>
                  </div>
                  <div style={{ height: 9, borderRadius: 999, background: 'var(--ke-gray-100)', overflow: 'hidden' }}>
                    <div
                      style={{
                        height: '100%',
                        width: `${Math.min(100, (row.kwh / maxApplianceKwh) * 100)}%`,
                        background: meta.color,
                        transition: 'width .6s var(--ease-out)',
                      }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <CalibrationCard calibration={results.calibration} />
      </div>

      {/* 3.7 — Outage cost (business only) */}
      {mode === 'biz' && results.outage && (
        <div style={{ background: '#111e1a', borderRadius: 20, padding: 26, marginBottom: 18, color: '#eaf2ec' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
            <FeatureIcon tone="orange" size={40}>
              <PowerOff size={18} />
            </FeatureIcon>
            <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 19, margin: 0 }}>What an outage costs you</h3>
          </div>
          <p style={{ fontSize: 13.5, color: 'rgba(234,242,236,.65)', margin: '0 0 16px', maxWidth: 460 }}>
            Backup here is about staying open, not saving on the bill.
          </p>
          <div style={{ textAlign: 'right' }}>
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 32, color: 'var(--ke-sun-400)' }}>
              {fmt(results.outage.low)}–{fmt(results.outage.high)}
            </span>
            <div style={{ fontSize: 12.5, color: 'rgba(234,242,236,.5)', marginTop: 2 }}>per hour of downtime</div>
          </div>
        </div>
      )}

      {/* 3.8 — Benchmark comparison (household framing; still useful context for business) */}
      <BenchmarkCard results={results} />

      {/* 3.9 — Fix-list simulator */}
      <FixListSimulator actions={fixActions} totalKwh={results.totalKwh} rate={results.rate.rate} />

      {/* 3.10 — Solar readiness */}
      <div style={cardStyle}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4, flexWrap: 'wrap', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Sun size={18} color="var(--ke-sun-500)" />
            <h3 style={{ ...sectionTitle, margin: 0 }}>Solar readiness</h3>
          </div>
          <Badge tone={SOLAR_VERDICT[results.solar.verdict].tone}>{SOLAR_VERDICT[results.solar.verdict].label}</Badge>
        </div>
        <p style={{ fontSize: 13.5, color: 'var(--color-text-muted)', margin: '10px 0 18px', maxWidth: 640 }}>
          A directional range, not a quote or a system design — Kingston Energies doesn&apos;t sell or install solar
          yet.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 14, marginBottom: 20 }}>
          <Tile label="System size" value={`~${results.solar.kw.toFixed(1)} kW`} />
          <Tile label="Indicative cost" value={`${fmt(results.solar.costLow)}–${fmt(results.solar.costHigh)}`} />
          <Tile label="Rough payback" value={Number.isFinite(results.solar.paybackYears) ? `~${results.solar.paybackYears} yrs` : '—'} />
          <Tile label="Roof area" value={`~${results.solar.roofAreaM2} m²`} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 18 }}>
          <IncentiveLine text="30% renewable-energy tax credit, capped at J$1.2M." />
          <IncentiveLine text="NHT solar loans up to J$2.5M — 0% for the first 12 months, then 4–7% for up to 10 years." />
          <IncentiveLine text="GCT exemption and reduced import duty on solar equipment." />
          <IncentiveLine text="Self-consumption beats export under current net-billing terms." />
        </div>

        <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 16, marginBottom: 18 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 13, marginBottom: 10 }}>
            What a solid quote usually includes
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <IncentiveLine text="A grid-tied system (no battery) typically runs J$180,000–260,000 per kW installed — a battery-backed / hybrid system usually costs meaningfully more, since the battery bank is priced separately from the panels and inverter." />
            <IncentiveLine text="Ask which inverter brand is quoted — Deye, LuxPower, SRNE and Schneider are commonly installed in Jamaica and have a local service track record." />
            <IncentiveLine text="Get at least two quotes. Licensed Jamaican installers with an island-wide track record include Ecopower Jamaica, SolarBuzz Jamaica and Premier Energy Solution — none of these are Kingston Energies partners, they're a starting point for your own comparison." />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', background: 'var(--ke-sun-50)', border: '1px solid rgba(247,148,30,.3)', borderRadius: 12, padding: '12px 16px' }}>
          <TriangleAlert size={15} color="var(--ke-sun-500)" style={{ flexShrink: 0, marginTop: 2 }} />
          <span style={{ fontSize: 12.5, color: 'var(--ke-sun-700, #8a5a00)', lineHeight: 1.55 }}>
            Kingston Energies does not sell or install solar yet. Sizing for procurement must come from a licensed
            installer who surveys the roof.
          </span>
        </div>
      </div>

      {/* 3.11 — What to do next */}
      <div style={{ marginBottom: 18 }}>
        <span style={{ ...overline, display: 'block', marginBottom: 14 }}>What to do next</span>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
          {[results.tiers.tier1, results.tiers.tier2, results.tiers.tier3].map((items, i) => {
            const meta = TIERS_META[i]
            return (
              <div key={i} style={{ ...wizardCard, display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
                <span
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 10,
                    background: meta.accent,
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontFamily: 'var(--font-display)',
                    fontWeight: 800,
                    fontSize: 15,
                  }}
                >
                  {i + 1}
                </span>
                <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16.5, margin: '14px 0 2px' }}>{meta.title}</h3>
                <span style={{ fontSize: 12, color: 'var(--color-text-subtle)' }}>{meta.timing}</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 14, flex: 1 }}>
                  {items.map((item, j) => {
                    const Icon = iconFor(item.icon)
                    return (
                      <div key={j} style={{ display: 'flex', gap: 9, alignItems: 'flex-start' }}>
                        <Icon size={15} color={meta.accent} style={{ flexShrink: 0, marginTop: 2 }} />
                        <span style={{ fontSize: 13.5, lineHeight: 1.55 }}>{item.text}</span>
                      </div>
                    )
                  })}
                </div>
                {meta.cta && (
                  meta.cta.href ? (
                    <Link
                      href={meta.cta.href}
                      style={{ ...tierCtaStyle(meta.accent, meta.cta.variant), textDecoration: 'none' }}
                    >
                      {meta.cta.label}
                    </Link>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setShowConsult(true)}
                      style={{ ...tierCtaStyle(meta.accent, meta.cta.variant), cursor: 'pointer' }}
                    >
                      {meta.cta.label}
                    </button>
                  )
                )}
              </div>
            )
          })}
        </div>

        {showConsult && (
          <div style={{ marginTop: 16 }}>
            <ConsultForm checkupId={results.id} onClose={() => setShowConsult(false)} />
          </div>
        )}
      </div>

      {/* 3.12 — Report gate */}
      <ReportGate onSubmitContact={onSubmitContact} onStartOver={onStartOver} rate={results.rate} />

      {/* 3.13 — Sources & assumptions */}
      <SourcesPanel />
    </div>
  )
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div>
      <div style={{ fontSize: 12, color: 'rgba(234,242,236,.6)', marginBottom: 4 }}>{label}</div>
      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 30, color: accent ?? '#fff' }}>{value}</div>
    </div>
  )
}

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ border: '1px solid var(--color-border)', borderRadius: 14, padding: 16 }}>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, letterSpacing: '.1em', color: 'var(--color-text-subtle)', textTransform: 'uppercase', marginBottom: 6 }}>{label}</div>
      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 21 }}>{value}</div>
    </div>
  )
}

function IncentiveLine({ text }: { text: string }) {
  return (
    <div style={{ display: 'flex', gap: 9, alignItems: 'flex-start' }}>
      <CircleCheck size={15} color="var(--ke-green-600)" style={{ flexShrink: 0, marginTop: 2 }} />
      <span style={{ fontSize: 13, color: 'var(--color-text-muted)', lineHeight: 1.55 }}>{text}</span>
    </div>
  )
}

function CalibrationCard({ calibration }: { calibration: CheckupResults['calibration'] }) {
  const state = !calibration ? 'none' : calibration.withinBand ? 'in' : 'out'
  const variancePct = calibration ? Math.round(calibration.variance * 100) : 0
  const clamped = Math.max(-50, Math.min(50, variancePct))
  const needleLeft = 50 + clamped

  const STATE_META = {
    none: { color: 'var(--color-text-muted)', Icon: CircleHelp, message: 'Uses the reference rate for now — add a real bill for a calibrated number.' },
    in: { color: 'var(--ke-green-600)', Icon: CircleCheck, message: 'Your estimate lands within 15% of your actual bill — the breakdown is solid.' },
    out: { color: '#c0821c', Icon: TriangleAlert, message: 'Your estimate and bill do not fully match. That usually means a load we did not ask about — an older appliance, a water pump, a second fridge — or standby draw worth investigating.' },
  } as const
  const { color, Icon, message } = STATE_META[state]

  return (
    <div style={cardStyle}>
      <h3 style={sectionTitle}>Checked against your bill</h3>
      <div style={{ position: 'relative', height: 44, marginTop: 24 }}>
        <div
          style={{
            position: 'absolute',
            top: 18,
            left: 0,
            right: 0,
            height: 8,
            borderRadius: 999,
            background:
              'linear-gradient(90deg, var(--ke-sun-400), var(--ke-gray-200) 22%, var(--ke-green-400) 42%, var(--ke-green-400) 58%, var(--ke-gray-200) 78%, var(--ke-sun-400))',
          }}
        />
        <span style={{ position: 'absolute', top: 12, left: '42%', width: 1, height: 20, background: 'rgba(20,32,28,.22)' }} />
        <span style={{ position: 'absolute', top: 12, left: '58%', width: 1, height: 20, background: 'rgba(20,32,28,.22)' }} />
        {calibration && (
          <span
            style={{
              position: 'absolute',
              top: 10,
              left: `${needleLeft}%`,
              transform: 'translateX(-50%)',
              width: 3,
              height: 24,
              borderRadius: 999,
              background: color,
              boxShadow: '0 0 0 3px #fff, 0 2px 8px rgba(20,32,28,.35)',
              transition: 'left .7s var(--ease-out)',
            }}
          />
        )}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-mono)', fontSize: 10.5, color: 'var(--color-text-subtle)', marginTop: 4 }}>
        <span>−50%</span>
        <span>±15% BAND</span>
        <span>+50%</span>
      </div>

      {calibration && (
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 26, color, marginTop: 18 }}>
          {variancePct >= 0 ? '+' : ''}
          {variancePct}%
        </div>
      )}
      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginTop: 10 }}>
        <Icon size={16} color={color} style={{ flexShrink: 0, marginTop: 1 }} />
        <span style={{ fontSize: 13, color: 'var(--color-text-muted)', lineHeight: 1.55 }}>{message}</span>
      </div>
    </div>
  )
}

function BenchmarkCard({ results }: { results: CheckupResults }) {
  const max = 900
  const pos = Math.max(2, Math.min(98, (results.totalKwh / max) * 100))
  const typicalLow = (250 / max) * 100
  const typicalHigh = (300 / max) * 100
  const vsTypicalPct = Math.round((results.totalKwh / 275) * 100)

  return (
    <div style={cardStyle}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
        <h3 style={sectionTitle}>How you compare</h3>
        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13, color: 'var(--color-text-muted)' }}>
          {BENCHMARK_LABEL[results.benchmark.verdict]}
        </span>
      </div>
      <div style={{ position: 'relative', height: 30, marginTop: 20 }}>
        <div
          style={{
            position: 'absolute',
            top: 10,
            left: 0,
            right: 0,
            height: 10,
            borderRadius: 999,
            opacity: 0.85,
            background: 'linear-gradient(90deg, var(--ke-green-400) 0%, var(--ke-green-400) 26%, var(--ke-sun-400) 62%, #d4574a 100%)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: 9,
            height: 12,
            borderRadius: 6,
            left: `${typicalLow}%`,
            width: `${typicalHigh - typicalLow}%`,
            border: '1.5px solid rgba(20,32,28,.45)',
            background: 'rgba(255,255,255,.35)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: `${pos}%`,
            transform: 'translateX(-50%)',
            width: 4,
            height: 30,
            borderRadius: 999,
            background: 'var(--ke-ink)',
            boxShadow: '0 0 0 3px #fff, 0 2px 8px rgba(20,32,28,.35)',
            transition: 'left .7s var(--ease-out)',
          }}
        />
      </div>
      <div style={{ display: 'flex', gap: 24, marginTop: 18, paddingTop: 14, borderTop: '1px solid var(--color-border)', flexWrap: 'wrap' }}>
        <MiniStat label="Your usage" value={`${Math.round(results.totalKwh)} kWh`} />
        <MiniStat label="Vs. typical" value={`${vsTypicalPct}%`} />
        <MiniStat label="Annual cost" value={fmt(results.benchmark.annualCost)} />
      </div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', background: 'var(--ke-blue-mist)', borderRadius: 12, padding: '12px 16px', marginTop: 16 }}>
        <CalendarRange size={15} color="var(--ke-blue-600)" style={{ flexShrink: 0, marginTop: 2 }} />
        <span style={{ fontSize: 12.5, color: 'var(--color-text-muted)', lineHeight: 1.55 }}>
          JPS notes usage swings seasonally — a home at 400 kWh in January can run 800 kWh in July with AC working
          harder.
        </span>
      </div>
    </div>
  )
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontSize: 11.5, color: 'var(--color-text-subtle)' }}>{label}</div>
      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15 }}>{value}</div>
    </div>
  )
}

function ReportGate({
  onSubmitContact,
  onStartOver,
  rate,
}: {
  onSubmitContact: (contact: string) => Promise<void>
  onStartOver: () => void
  rate: CheckupResults['rate']
}) {
  const [contact, setContact] = useState('')
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')

  async function submit() {
    if (!contact.trim()) {
      setStatus('error')
      return
    }
    setStatus('sending')
    try {
      await onSubmitContact(contact.trim())
      setStatus('sent')
    } catch {
      setStatus('error')
    }
  }

  return (
    <div style={{ ...cardStyle, display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: 24 }} className="kp-2col">
      <div>
        {status === 'sent' ? (
          <div>
            <FeatureIcon tone="green" size={44}>
              <MailCheck size={20} />
            </FeatureIcon>
            <h3 style={{ ...sectionTitle, marginTop: 14 }}>Sent to {contact}</h3>
            <p style={{ fontSize: 13.5, color: 'var(--color-text-muted)', margin: 0 }}>
              Your snapshot was also saved to your account so next month&apos;s checkup can compare against it.
            </p>
          </div>
        ) : (
          <>
            <h3 style={sectionTitle}>Get the full report</h3>
            <p style={{ fontSize: 13.5, color: 'var(--color-text-muted)', margin: '4px 0 18px', maxWidth: 420 }}>
              A shareable snapshot you can keep, or forward to a partner or landlord.
            </p>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <input
                type="text"
                placeholder="you@email.com or WhatsApp number"
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                style={{ flex: '1 1 220px', padding: '11px 14px', borderRadius: 10, border: '1.5px solid var(--color-border)', fontFamily: 'var(--font-display)', fontSize: 14 }}
              />
              <button
                type="button"
                onClick={submit}
                disabled={status === 'sending'}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8, padding: '11px 20px', borderRadius: 10, border: 'none',
                  background: 'var(--ke-green-500)', color: '#fff', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14,
                  cursor: status === 'sending' ? 'default' : 'pointer', opacity: status === 'sending' ? 0.7 : 1,
                }}
              >
                <Send size={14} /> {status === 'sending' ? 'Sending…' : 'Send my report'}
              </button>
            </div>
            {status === 'error' && <p style={{ fontSize: 12.5, color: '#d84a3a', marginTop: 10 }}>Enter an email or WhatsApp number.</p>}
          </>
        )}
      </div>

      <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <button
          type="button"
          onClick={onStartOver}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 7, alignSelf: 'flex-start', padding: '9px 16px', borderRadius: 999,
            border: '1.5px solid var(--color-border)', background: '#fff', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 13, cursor: 'pointer',
          }}
        >
          <RotateCcw size={14} /> Run another checkup
        </button>
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', background: 'var(--ke-mist)', borderRadius: 12, padding: '12px 14px' }}>
          <ShieldAlert size={15} color="var(--color-text-muted)" style={{ flexShrink: 0, marginTop: 2 }} />
          <span style={{ fontSize: 11.5, color: 'var(--color-text-muted)', lineHeight: 1.6 }}>
            This is an estimate based on the information you provided, intended to help you understand and reduce
            your energy use. It is not a certified energy audit or electrical inspection. For wiring, solar sizing,
            or installation decisions, consult a licensed electrician or registered installer.
          </span>
        </div>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, color: 'var(--color-text-subtle)', letterSpacing: '.04em' }}>
          RATE ASSUMPTION · {rate.source === 'bill' ? 'from your bill' : 'reference J$' + rate.rate.toFixed(0) + '/kWh, reviewed 2026-07'}
        </span>
      </div>
    </div>
  )
}

function SourcesPanel() {
  const [open, setOpen] = useState(false)
  return (
    <div style={{ background: 'var(--ke-mist)', borderRadius: 20, padding: 26, marginTop: 18 }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 999,
          border: '1px solid var(--color-border)', background: '#fff', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 13, cursor: 'pointer',
        }}
      >
        {open ? 'Hide sources' : 'Show sources'} {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>

      {open && (
        <div style={{ marginTop: 18 }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', background: '#fff', borderRadius: 12, padding: '12px 16px', marginBottom: 18 }}>
            <Scale size={15} color="var(--ke-sun-400)" style={{ flexShrink: 0, marginTop: 2 }} />
            <span style={{ fontSize: 12.5, color: 'var(--color-text-muted)', lineHeight: 1.55 }}>
              Rates disagree between sources — we show the spread rather than averaging it away.
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {SOURCES.map((s, i) => (
              <div
                key={i}
                style={{
                  display: 'grid', gridTemplateColumns: '132px 1fr', gap: 12, padding: '12px 0',
                  borderTop: i === 0 ? 'none' : '1px solid var(--color-border)',
                }}
              >
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-text-subtle)' }}>{s.tag}</span>
                <span style={{ fontSize: 13, color: 'var(--color-text-muted)', lineHeight: 1.55 }}>
                  {s.claim}{' '}
                  <a href={s.href} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 3, color: 'var(--ke-green-700)' }}>
                    source <ExternalLink size={11} />
                  </a>
                </span>
              </div>
            ))}
          </div>
          <p style={{ fontSize: 12, color: 'var(--color-text-subtle)', lineHeight: 1.6, marginTop: 18 }}>
            Appliance wattages are curated estimates sanity-checked against the figures above — not measured
            readings. Everything else on this page (totals, calibration, savings ranges) is computed from what you
            told us and your real bill.
          </p>
        </div>
      )}
    </div>
  )
}
