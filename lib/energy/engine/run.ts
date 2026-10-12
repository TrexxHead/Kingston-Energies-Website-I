import { createHash } from 'crypto'
import { CALC_ENGINE_VERSION } from './version'
import { stableStringify } from './stable'

export { stableStringify }

/**
 * A calculation run is the immutable record of one result: engine version,
 * the exact inputs, and the outputs shown. Saved reports reference a run,
 * so a later formula change can never silently rewrite what a customer was
 * told. Corrections create a NEW run that points at the one it supersedes.
 *
 * Server-only (uses node:crypto).
 */

export type CalculationKind = 'scenario' | 'runtime' | 'bill_comparison' | 'backup_match' | 'tariff_cost'

export interface CalculationRunRecord<I = unknown, O = unknown> {
  kind: CalculationKind
  engineVersion: string
  inputHash: string
  inputSnapshot: I
  outputs: O
  supersedesId?: string
}


export function hashInputs(kind: CalculationKind, inputs: unknown): string {
  return createHash('sha256').update(kind + '|' + CALC_ENGINE_VERSION + '|' + stableStringify(inputs)).digest('hex')
}

export function buildRun<I, O>(kind: CalculationKind, inputs: I, outputs: O, supersedesId?: string): CalculationRunRecord<I, O> {
  return { kind, engineVersion: CALC_ENGINE_VERSION, inputHash: hashInputs(kind, inputs), inputSnapshot: inputs, outputs, supersedesId }
}
