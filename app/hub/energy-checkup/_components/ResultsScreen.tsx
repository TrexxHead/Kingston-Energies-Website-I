'use client'

import { useState, type CSSProperties } from 'react'
import { CheckCircle2, AlertTriangle, Sun, Send } from 'lucide-react'
import { fmt } from '@/lib/catalog'
import { CATEGORY_META } from '@/lib/energyCheckup/applianceLibrary'
import { iconFor } from './icons'
import { wizardCard } from './shared'
import type { CheckupResults, Mode } from './types'

const cardStyle: CSSProperties = { ...wizardCard, marginBottom: 18 }
const sectionTitle: CSSProperties = { fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 17, margin: '0 0 4px' }
const sectionSub: CSSProperties = { fontSize: 13.5, color: 'var(--color-text-muted)', margin: '0 0 18px' }

const BENCHMARK_LABEL: Record<CheckupResults['benchmark']['verdict'], { label: string; color: string }> = {
  below: { label: 'Below the typical Jamaican home', color: 'var(--ke-green-600)' },
  at: { label: 'In line with a typical Jamaican home', color: 'var(--ke-green-600)' },
  above: { label: 'Above the typical Jamaican home', color: 'var(--ke-sun-500)' },
  'well-above': { label: 'Well above the typical Jamaican home', color: '#d84a3a' },
}

const SOLAR_VERDICT_LABEL: Record<CheckupResults['solar']['verdict'], string> = {
  strong: 'Worth exploring seriously',
  exploring: 'Worth a closer look',
  'efficiency-first': 'Efficiency first — solar can wait',
}

export default function ResultsScreen({
  results,
  mode,
  month,
  onSubmitContact,
}: {
  results: CheckupResults
  mode: Mode
  month: string | null
  onSubmitContact: (contact: string) => Promise<void>
}) {
  const monthlyCostJmd = Math.round(results.totalKwh * results.rate.rate)

  return (
    <div>
      {/* Snapshot band */}
      <div
        style={{
          ...cardStyle,
          background: '#0d1714',
          color: '#eaf2ec',
          border: 'none',
        }}
      >
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '.24em', color: 'var(--ke-green-400)', textTransform: 'uppercase' }}>
          Your power snapshot
        </span>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginTop: 10, flexWrap: 'wrap' }}>
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 52, lineHeight: 1, letterSpacing: '-.03em' }}>
            {Math.round(results.totalKwh)}
          </span>
          <span style={{ fontSize: 16, color: 'rgba(234,242,236,.65)' }}>kWh / month</span>
        </div>
        <div style={{ fontSize: 14.5, color: 'rgba(234,242,236,.75)', marginTop: 6 }}>
          ≈ {fmt(monthlyCostJmd)} / month {results.rate.source === 'bill' ? `from your ${month ?? 'last'} bill` : 'at our reference rate'}
        </div>

        {results.calibration && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginTop: 16,
              paddingTop: 16,
              borderTop: '1px solid rgba(255,255,255,.09)',
              fontSize: 13,
              color: 'rgba(234,242,236,.85)',
            }}
          >
            {results.calibration.withinBand ? (
              <CheckCircle2 size={16} color="var(--ke-green-400)" style={{ flexShrink: 0 }} />
            ) : (
              <AlertTriangle size={16} color="var(--ke-sun-400)" style={{ flexShrink: 0 }} />
            )}
            <span>
              {results.calibration.withinBand
                ? `Within calibration range of your actual bill (${results.calibration.variance >= 0 ? '+' : ''}${Math.round(results.calibration.variance * 100)}%).`
                : `${Math.round(Math.abs(results.calibration.variance) * 100)}% ${results.calibration.variance >= 0 ? 'higher' : 'lower'} than your actual bill — some appliances likely run differently than estimated. Still a useful breakdown.`}
            </span>
          </div>
        )}
      </div>

      {/* Breakdown & calibration */}
      <div style={cardStyle}>
        <h3 style={sectionTitle}>Where it's going</h3>
        <p style={sectionSub}>Your load, broken down by category.</p>
        <div style={{ display: 'flex', height: 16, borderRadius: 999, overflow: 'hidden', background: 'var(--color-surface-muted, #f0f2f0)' }}>
          {results.categories.map((c) => (
            <span key={c.category} style={{ flex: c.kwh, background: CATEGORY_META[c.category as keyof typeof CATEGORY_META].color }} />
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10, marginTop: 16 }}>
          {results.categories.map((c) => (
            <div key={c.category} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 8, height: 8, borderRadius: 2, background: CATEGORY_META[c.category as keyof typeof CATEGORY_META].color, flexShrink: 0 }} />
              <span style={{ fontSize: 13, flex: 1 }}>{CATEGORY_META[c.category as keyof typeof CATEGORY_META].label}</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12.5, color: 'var(--color-text-muted)' }}>{c.pct}%</span>
            </div>
          ))}
        </div>
      </div>

      {/* Benchmark comparison */}
      <div style={cardStyle}>
        <h3 style={sectionTitle}>How you compare</h3>
        <p style={sectionSub}>Against a typical Jamaican home (250–300 kWh/month).</p>
        <BenchmarkBar totalKwh={results.totalKwh} />
        <div style={{ marginTop: 14, fontSize: 14, fontWeight: 600, color: BENCHMARK_LABEL[results.benchmark.verdict].color }}>
          {BENCHMARK_LABEL[results.benchmark.verdict].label}
        </div>
        <div style={{ fontSize: 13, color: 'var(--color-text-muted)', marginTop: 4 }}>
          At this rate, that's roughly {fmt(results.benchmark.annualCost)} over a year.
        </div>
      </div>

      {/* Solar readiness */}
      <div style={cardStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <Sun size={18} color="var(--ke-sun-500)" />
          <h3 style={{ ...sectionTitle, margin: 0 }}>Solar orientation</h3>
        </div>
        <p style={sectionSub}>A directional range, not a quote or a system design.</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 16, marginBottom: 14 }}>
          <Stat label="Array size" value={`~${results.solar.kw.toFixed(1)} kW`} />
          <Stat label="Roof area" value={`~${results.solar.roofAreaM2} m²`} />
          <Stat label="Investment range" value={`${fmt(results.solar.costLow)}–${fmt(results.solar.costHigh)}`} />
          <Stat label="Est. payback" value={Number.isFinite(results.solar.paybackYears) ? `~${results.solar.paybackYears} yrs` : '—'} />
        </div>
        <div
          style={{
            display: 'inline-block',
            padding: '7px 14px',
            borderRadius: 999,
            fontSize: 12.5,
            fontWeight: 600,
            fontFamily: 'var(--font-display)',
            background: 'var(--ke-sun-50, #fff6e5)',
            color: 'var(--ke-sun-700, #8a5a00)',
          }}
        >
          {SOLAR_VERDICT_LABEL[results.solar.verdict]}
        </div>
      </div>

      {/* Three-tier what to do next */}
      <div style={cardStyle}>
        <h3 style={sectionTitle}>What to do next</h3>
        <p style={sectionSub}>Built from your own numbers above — not a generic list.</p>
        <TierBlock title="Do this now — no cost" items={results.tiers.tier1} />
        <TierBlock title="Small investment" items={results.tiers.tier2} />
        <TierBlock title="The bigger picture" items={results.tiers.tier3} />
      </div>

      {/* Report gate */}
      <ReportGate onSubmitContact={onSubmitContact} />

      {/* Disclaimer */}
      <p style={{ fontSize: 11.5, color: 'var(--color-text-subtle)', lineHeight: 1.6, marginTop: 18 }}>
        This is an Energy Usage Checkup, not a certified energy audit. Figures are estimates built from the appliances and
        habits you told us about, calibrated against your bill where you provided one. They are directional, not
        guaranteed — actual usage varies with weather, occupancy and equipment condition. This is not a substitute for a
        licensed electrical inspection, and nothing here should be read as your JPS tariff.
      </p>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontSize: 11.5, color: 'var(--color-text-subtle)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 3 }}>{label}</div>
      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16 }}>{value}</div>
    </div>
  )
}

function BenchmarkBar({ totalKwh }: { totalKwh: number }) {
  const max = 900
  const pos = Math.min(100, (totalKwh / max) * 100)
  const typicalLow = (250 / max) * 100
  const typicalHigh = (300 / max) * 100
  return (
    <div style={{ position: 'relative', height: 28 }}>
      <div style={{ position: 'absolute', top: 10, left: 0, right: 0, height: 8, borderRadius: 999, background: 'var(--color-surface-muted, #f0f2f0)' }} />
      <div
        style={{
          position: 'absolute',
          top: 10,
          height: 8,
          borderRadius: 999,
          left: `${typicalLow}%`,
          width: `${typicalHigh - typicalLow}%`,
          background: 'var(--ke-green-200, #cdeccf)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: `calc(${pos}% - 6px)`,
          width: 12,
          height: 28,
          borderRadius: 4,
          background: '#0d1714',
        }}
        aria-hidden
      />
    </div>
  )
}

function TierBlock({ title, items }: { title: string; items: { icon: string; text: string }[] }) {
  if (items.length === 0) return null
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 10 }}>{title}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {items.map((item, i) => {
          const Icon = iconFor(item.icon)
          return (
            <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <Icon size={16} color="var(--ke-green-600)" style={{ flexShrink: 0, marginTop: 2 }} />
              <span style={{ fontSize: 13.5, lineHeight: 1.55 }}>{item.text}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function ReportGate({ onSubmitContact }: { onSubmitContact: (contact: string) => Promise<void> }) {
  const [contact, setContact] = useState('')
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')

  async function submit() {
    if (!contact.trim()) return
    setStatus('sending')
    try {
      await onSubmitContact(contact.trim())
      setStatus('sent')
    } catch {
      setStatus('error')
    }
  }

  if (status === 'sent') {
    return (
      <div style={{ ...cardStyle, textAlign: 'center' }}>
        <CheckCircle2 size={28} color="var(--ke-green-500)" style={{ marginBottom: 8 }} />
        <h3 style={sectionTitle}>Sent</h3>
        <p style={{ fontSize: 13.5, color: 'var(--color-text-muted)', margin: 0 }}>Your full report is on its way.</p>
      </div>
    )
  }

  return (
    <div style={cardStyle}>
      <h3 style={sectionTitle}>Get the full report</h3>
      <p style={sectionSub}>Email or WhatsApp — we'll send this breakdown so you can keep it.</p>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <input
          type="text"
          placeholder="you@email.com or WhatsApp number"
          value={contact}
          onChange={(e) => setContact(e.target.value)}
          style={{
            flex: '1 1 220px',
            padding: '11px 14px',
            borderRadius: 10,
            border: '1.5px solid var(--color-border)',
            fontFamily: 'var(--font-display)',
            fontSize: 14,
          }}
        />
        <button
          type="button"
          onClick={submit}
          disabled={status === 'sending'}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '11px 20px',
            borderRadius: 10,
            border: 'none',
            background: 'var(--ke-green-500)',
            color: '#fff',
            fontFamily: 'var(--font-display)',
            fontWeight: 700,
            fontSize: 14,
            cursor: status === 'sending' ? 'default' : 'pointer',
            opacity: status === 'sending' ? 0.7 : 1,
          }}
        >
          <Send size={14} />
          {status === 'sending' ? 'Sending…' : 'Send my report'}
        </button>
      </div>
      {status === 'error' && (
        <p style={{ fontSize: 12.5, color: '#d84a3a', marginTop: 10 }}>Couldn't send that — check the email or number and try again.</p>
      )}
    </div>
  )
}
