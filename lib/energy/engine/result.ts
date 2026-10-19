import type { EvidenceBasis } from './basis'

/** A documented assumption the engine relied on. Shown to the customer and stored with the run. */
export interface Assumption {
  id: string
  description: string
  value?: number | string
  unit?: string
}

export interface CalcOk<T> {
  ok: true
  value: T
  basis: EvidenceBasis
  assumptions: Assumption[]
  warnings: string[]
}

/**
 * The engine refuses rather than guesses. `missing` names the inputs that
 * would let it answer; `invalid` names inputs that can't be right.
 */
export interface CalcRefusal {
  ok: false
  reason: 'missing_input' | 'invalid_input' | 'not_applicable'
  fields: string[]
  message: string
}

export type CalcResult<T> = CalcOk<T> | CalcRefusal

export function refuse(reason: CalcRefusal['reason'], fields: string[], message: string): CalcRefusal {
  return { ok: false, reason, fields, message }
}

export function isPositive(n: unknown): n is number {
  return typeof n === 'number' && Number.isFinite(n) && n > 0
}

export function isNonNegative(n: unknown): n is number {
  return typeof n === 'number' && Number.isFinite(n) && n >= 0
}
