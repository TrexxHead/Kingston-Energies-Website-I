import {
  runtime,
  checkContinuousOutput,
  checkSurge,
  type CapacityBasis,
  type CheckStatus,
  type ScenarioTotals,
  type Range,
  type EvidenceBasis,
} from '@/lib/energy/engine'
import { resolveAll, basisFor, type EvidenceRecord, type ResolvedField } from './evidence'

/**
 * Backup Match (backlog E03 foundation): evaluate one exact power-station SKU
 * against a customer's scenario. Returns pass / fail / needs_review with the
 * exact rule and the evidence used for every check.
 *
 * A PASS requires every check to pass on VERIFIED evidence. A value that is
 * only claimed (listing/supplier page), expired, conflicting or unknown can
 * at best produce needs_review — never a confident recommendation. A claimed
 * value that already fails is still a fail: we don't recommend a product
 * even its own listing says is too small.
 */

/** Jamaica's public supply: 110 V, 50 Hz (JPS). Imported US-market units often output 60 Hz only. */
export const JAMAICA_GRID = { voltage: 110, frequencyHz: 50 }

export type MatchStatus = 'pass' | 'fail' | 'needs_review'

export interface MatchCheck {
  rule: string
  status: CheckStatus
  detail: string
  evidenceIds: string[]
  /** True when the check used a value that is not verified and current. */
  unverifiedEvidence: boolean
}

export interface BackupMatchInput {
  scenario: ScenarioTotals
  scenarioBasis: EvidenceBasis
  targetHours: number
  /** Motor-start duration the scenario needs the surge to hold, if known. */
  requiredSurgeMs?: number
  reserveFraction?: number
}

export interface BackupMatchResult {
  status: MatchStatus
  checks: MatchCheck[]
  runtimeHours: Range | null
  summary: string
}

function evidenceOf(...fields: ResolvedField[]) {
  return {
    evidenceIds: fields.flatMap((f) => f.evidenceIds),
    unverifiedEvidence: fields.some((f) => f.state !== 'verified'),
  }
}

function num(f: ResolvedField) {
  return f.valueNum != null && (f.state === 'verified' || f.state === 'claimed' || f.state === 'expired') ? { value: f.valueNum, basis: basisFor(f) } : undefined
}

export function evaluateBackupMatch(input: BackupMatchInput, evidence: EvidenceRecord[], now: Date): BackupMatchResult {
  const r = resolveAll('power_station', evidence, now)
  const checks: MatchCheck[] = []
  const s = input.scenario

  // 1. Continuous output vs everything on at once.
  const cont = checkContinuousOutput({ continuousWatts: num(r.ac_continuous_w) }, s.simultaneousWatts)
  checks.push({ ...cont, ...evidenceOf(r.ac_continuous_w) })

  // 2. Surge vs the largest motor start.
  const surge = checkSurge({ surgeWatts: num(r.ac_surge_w), surgeDurationMs: num(r.ac_surge_duration_ms) }, s.startupPeakWatts, input.requiredSurgeMs)
  checks.push({ ...surge, ...evidenceOf(r.ac_surge_w) })

  // 3. Energy: runtime at the scenario's average load vs the target.
  let runtimeHours: Range | null = null
  const basisText = (r.battery_energy_basis.valueText ?? '').trim() as CapacityBasis
  const capacity = num(r.battery_energy_wh)
  if (!capacity || !['nominal', 'usable_dc', 'delivered_ac_measured'].includes(basisText)) {
    checks.push({ rule: 'runtime', status: 'unknown', detail: 'Battery energy or its basis (nominal / usable / measured) is not on record.', ...evidenceOf(r.battery_energy_wh, r.battery_energy_basis) })
  } else if (s.averageWatts.base <= 0) {
    checks.push({ rule: 'runtime', status: 'unknown', detail: 'The scenario has no resolved load to run.', evidenceIds: [], unverifiedEvidence: false })
  } else {
    const rt = runtime({
      source: {
        capacityWh: capacity,
        capacityBasis: basisText,
        inverterEfficiency: num(r.inverter_efficiency),
        idleWatts: num(r.idle_w),
      },
      outputPath: 'ac',
      averageLoadWatts: s.averageWatts,
      loadBasis: input.scenarioBasis,
      reserveFraction: input.reserveFraction,
    })
    if (!rt.ok) {
      checks.push({ rule: 'runtime', status: 'unknown', detail: rt.message, ...evidenceOf(r.battery_energy_wh) })
    } else {
      runtimeHours = rt.value.hours
      const h = rt.value.hours
      const fmt = (n: number) => n.toFixed(1)
      const status: CheckStatus = h.low >= input.targetHours ? 'pass' : h.base >= input.targetHours ? 'marginal' : 'fail'
      checks.push({
        rule: 'runtime',
        status,
        detail: `Estimated ${fmt(h.low)}–${fmt(h.high)} h (central ${fmt(h.base)} h) against a ${input.targetHours} h target.`,
        ...evidenceOf(r.battery_energy_wh, r.battery_energy_basis),
      })
    }
  }

  // 4. Output voltage for Jamaican 110 V appliances.
  const v = r.ac_output_voltage_v
  if (v.valueNum == null || v.state === 'unknown' || v.state === 'conflicting') {
    checks.push({ rule: 'ac_voltage', status: 'unknown', detail: 'AC output voltage is not on record.', ...evidenceOf(v) })
  } else if (v.valueNum < 100 || v.valueNum > 127) {
    checks.push({ rule: 'ac_voltage', status: 'fail', detail: `Outputs ${v.valueNum} V; Jamaican appliances expect 110–120 V.`, ...evidenceOf(v) })
  } else {
    checks.push({ rule: 'ac_voltage', status: 'pass', detail: `Outputs ${v.valueNum} V.`, ...evidenceOf(v) })
  }

  // 5. Output frequency — 60 Hz-only units can affect clocks, timers and some motors built for 50 Hz.
  const f = r.ac_output_frequency_hz
  const freq = (f.valueText ?? (f.valueNum != null ? String(f.valueNum) : '')).replace(/\s/g, '')
  if (!freq || f.state === 'unknown' || f.state === 'conflicting') {
    checks.push({ rule: 'ac_frequency', status: 'unknown', detail: 'AC output frequency is not on record.', ...evidenceOf(f) })
  } else if (freq.includes('50')) {
    checks.push({ rule: 'ac_frequency', status: 'pass', detail: `Supports ${freq} Hz output.`, ...evidenceOf(f) })
  } else {
    checks.push({
      rule: 'ac_frequency',
      status: 'marginal',
      detail: `Outputs ${freq} Hz only. Jamaican supply is 50 Hz; motor, timer and clock loads need a compatibility review.`,
      ...evidenceOf(f),
    })
  }

  // 6. Waveform — modified sine is unsuitable for many compressor and electronic loads.
  const w = r.ac_waveform
  const wave = (w.valueText ?? '').toLowerCase()
  if (!wave || w.state === 'unknown' || w.state === 'conflicting') {
    checks.push({ rule: 'ac_waveform', status: 'unknown', detail: 'AC waveform is not on record.', ...evidenceOf(w) })
  } else if (wave.includes('pure')) {
    checks.push({ rule: 'ac_waveform', status: 'pass', detail: 'Pure sine wave output.', ...evidenceOf(w) })
  } else {
    checks.push({ rule: 'ac_waveform', status: s.startupPeakWatts !== s.simultaneousWatts ? 'fail' : 'marginal', detail: 'Modified sine output — not suitable for many motor and electronic loads.', ...evidenceOf(w) })
  }

  // Unresolved devices mean the scenario itself is incomplete.
  if (s.unresolved.length) {
    checks.push({
      rule: 'scenario_complete',
      status: 'unknown',
      detail: `${s.unresolved.length} device(s) in the scenario need more information: ${s.unresolved.map((u) => u.name).join(', ')}.`,
      evidenceIds: [],
      unverifiedEvidence: false,
    })
  }

  const anyFail = checks.some((c) => c.status === 'fail')
  const allPassVerified = checks.every((c) => c.status === 'pass' && !c.unverifiedEvidence)
  const status: MatchStatus = anyFail ? 'fail' : allPassVerified ? 'pass' : 'needs_review'
  const summary =
    status === 'pass'
      ? 'Meets every requirement on verified specifications.'
      : status === 'fail'
        ? 'Does not meet this scenario: ' + checks.filter((c) => c.status === 'fail').map((c) => c.detail).join(' ')
        : 'Needs review before it can be recommended — some specifications are unverified, unknown or borderline.'
  return { status, checks, runtimeHours, summary }
}
