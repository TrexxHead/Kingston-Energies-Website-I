/**
 * Evidence basis — where a number came from. Every estimate the engine
 * returns carries the weakest basis among its inputs, so a result built on
 * one assumed figure is never presented as "measured".
 *
 * Ordered strongest → weakest. `unknown` is not a basis for a number at all:
 * a field with no value is reported as missing, never defaulted silently.
 */
export type EvidenceBasis = 'measured' | 'manufacturer' | 'customer_entered' | 'assumed'

export const BASIS_ORDER: EvidenceBasis[] = ['measured', 'manufacturer', 'customer_entered', 'assumed']

export const BASIS_LABEL: Record<EvidenceBasis, string> = {
  measured: 'Measured',
  manufacturer: 'Manufacturer evidence',
  customer_entered: 'Customer-entered',
  assumed: 'Assumed',
}

/**
 * Relative uncertainty applied to a value of each basis when building a
 * low/base/high range. These are engine policy (versioned with the engine),
 * not physical constants — a technical reviewer can change them by bumping
 * CALC_ENGINE_VERSION.
 */
export const BASIS_UNCERTAINTY: Record<EvidenceBasis, number> = {
  measured: 0.05,
  manufacturer: 0.15,
  customer_entered: 0.25,
  assumed: 0.4,
}

export function weakestBasis(bases: EvidenceBasis[]): EvidenceBasis {
  if (bases.length === 0) return 'assumed'
  return bases.reduce((w, b) => (BASIS_ORDER.indexOf(b) > BASIS_ORDER.indexOf(w) ? b : w), bases[0])
}

/** A number with its provenance. */
export interface Evidenced {
  value: number
  basis: EvidenceBasis
  /** Free-text reference: label photo id, datasheet URL, meter reading id, assumption id. */
  source?: string
}

export interface Range {
  low: number
  base: number
  high: number
}

export function rangeFor(base: number, basis: EvidenceBasis): Range {
  const u = BASIS_UNCERTAINTY[basis]
  return { low: base * (1 - u), base, high: base * (1 + u) }
}

export function scaleRange(r: Range, k: number): Range {
  return k >= 0 ? { low: r.low * k, base: r.base * k, high: r.high * k } : { low: r.high * k, base: r.base * k, high: r.low * k }
}

export function addRanges(rs: Range[]): Range {
  return rs.reduce((a, r) => ({ low: a.low + r.low, base: a.base + r.base, high: a.high + r.high }), { low: 0, base: 0, high: 0 })
}
