import { describe, it, expect } from 'vitest'
import { resolveField, skuReadiness, type EvidenceRecord } from '@/lib/catalogue/evidence'
import { evaluateBackupMatch } from '@/lib/catalogue/backupMatch'
import { evaluateScenario, type ScenarioTotals } from '@/lib/energy/engine'

const NOW = new Date('2026-10-12T00:00:00Z')
let n = 0
function ev(field: string, value: number | string, over: Partial<EvidenceRecord> = {}): EvidenceRecord {
  return {
    id: `e${++n}`,
    field,
    valueNum: typeof value === 'number' ? value : null,
    valueText: typeof value === 'string' ? value : null,
    unit: null,
    sourceType: 'manufacturer_doc',
    sourceUrl: 'https://example.invalid/datasheet.pdf',
    reviewState: 'verified',
    verifiedAt: '2026-10-01T00:00:00Z',
    expiresAt: null,
    ...over,
  }
}

// Synthetic SKU used only for tests — not a real product.
function fullStation(over: Record<string, Partial<EvidenceRecord>> = {}): EvidenceRecord[] {
  const base: [string, number | string][] = [
    ['manufacturer_model', 'TEST-1000'],
    ['battery_energy_wh', 1000],
    ['battery_energy_basis', 'nominal'],
    ['ac_continuous_w', 1000],
    ['ac_surge_w', 2000],
    ['ac_output_voltage_v', 120],
    ['ac_output_frequency_hz', '50/60'],
    ['ac_waveform', 'pure_sine'],
    ['local_warranty', '12 months, Kingston Energies'],
  ]
  return base.map(([f, v]) => ev(f, v, over[f]))
}

function scenario(): ScenarioTotals {
  const r = evaluateScenario([
    { deviceId: 'fridge', name: 'Fridge', quantity: 1, simultaneous: true, essential: true, motorLoad: true, load: { kind: 'cycling', runningWatts: { value: 150, basis: 'manufacturer' }, dutyCyclePct: { value: 40, basis: 'measured' } }, startupWatts: { value: 600, basis: 'manufacturer' } },
    { deviceId: 'router', name: 'Router', quantity: 1, simultaneous: true, essential: true, load: { kind: 'steady', watts: { value: 12, basis: 'measured' }, hoursPerDay: { value: 24, basis: 'measured' } } },
  ])
  if (!r.ok) throw new Error('scenario failed')
  return r.value
}

describe('resolveField', () => {
  it('unknown when no evidence', () => {
    expect(resolveField('ac_surge_w', [], NOW).state).toBe('unknown')
  })
  it('a listing claim is never verified, even if marked verified', () => {
    const r = resolveField('ac_surge_w', [ev('ac_surge_w', 2000, { sourceType: 'listing_claim' })], NOW)
    expect(r.state).toBe('claimed')
  })
  it('expired verification is reported as expired', () => {
    const r = resolveField('ac_surge_w', [ev('ac_surge_w', 2000, { expiresAt: '2026-01-01T00:00:00Z' })], NOW)
    expect(r.state).toBe('expired')
  })
  it('disagreeing verified records conflict rather than average', () => {
    const r = resolveField('ac_surge_w', [ev('ac_surge_w', 2000), ev('ac_surge_w', 1800)], NOW)
    expect(r.state).toBe('conflicting')
    expect(r.valueNum).toBeNull()
  })
  it('rejected evidence is ignored', () => {
    const r = resolveField('ac_surge_w', [ev('ac_surge_w', 2000, { reviewState: 'rejected' })], NOW)
    expect(r.state).toBe('unknown')
  })
})

describe('skuReadiness', () => {
  it('publishable only with every critical field verified', () => {
    expect(skuReadiness('power_station', fullStation(), NOW).publishable).toBe(true)
    const r = skuReadiness('power_station', fullStation({ ac_surge_w: { reviewState: 'unverified' } }), NOW)
    expect(r.publishable).toBe(false)
    expect(r.blocking.map((b) => b.field)).toEqual(['ac_surge_w'])
  })
  it('an expired critical spec blocks publication', () => {
    const r = skuReadiness('power_station', fullStation({ ac_continuous_w: { expiresAt: '2026-06-01T00:00:00Z' } }), NOW)
    expect(r.publishable).toBe(false)
    expect(r.blocking[0].state).toBe('expired')
  })
})

describe('evaluateBackupMatch', () => {
  const input = { scenario: scenario(), scenarioBasis: 'measured' as const, targetHours: 8 }

  it('passes on fully verified, sufficient evidence', () => {
    const r = evaluateBackupMatch(input, [...fullStation(), ev('inverter_efficiency', 0.9), ev('idle_w', 8)], NOW)
    expect(r.status).toBe('pass')
    expect(r.runtimeHours?.low).toBeGreaterThan(8)
  })

  it('missing evidence is never a pass', () => {
    const r = evaluateBackupMatch(input, fullStation().filter((e) => e.field !== 'ac_surge_w'), NOW)
    expect(r.status).toBe('needs_review')
    expect(r.checks.find((c) => c.rule === 'surge_output')?.status).toBe('unknown')
  })

  it('claimed values that look sufficient still need review', () => {
    const r = evaluateBackupMatch(input, fullStation({ ac_continuous_w: { sourceType: 'listing_claim', reviewState: 'unverified' } }), NOW)
    expect(r.status).toBe('needs_review')
  })

  it('rejects insufficient continuous output even when energy is ample', () => {
    const r = evaluateBackupMatch(input, fullStation({ ac_continuous_w: { valueNum: 100 }, battery_energy_wh: { valueNum: 5000 } }), NOW)
    expect(r.status).toBe('fail')
    expect(r.checks.find((c) => c.rule === 'runtime')?.status).toBe('pass')
  })

  it('flags 60 Hz-only output for review and 230 V output as a fail', () => {
    expect(evaluateBackupMatch(input, fullStation({ ac_output_frequency_hz: { valueText: '60' } }), NOW).checks.find((c) => c.rule === 'ac_frequency')?.status).toBe('marginal')
    expect(evaluateBackupMatch(input, fullStation({ ac_output_voltage_v: { valueNum: 230 } }), NOW).status).toBe('fail')
  })

  it('modified sine with a motor load fails', () => {
    expect(evaluateBackupMatch(input, fullStation({ ac_waveform: { valueText: 'modified_sine' } }), NOW).status).toBe('fail')
  })

  it('falls short on runtime when the target is too long', () => {
    const r = evaluateBackupMatch({ ...input, targetHours: 48 }, fullStation(), NOW)
    expect(r.status).toBe('fail')
  })
})
