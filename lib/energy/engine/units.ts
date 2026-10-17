/**
 * Unit conversions. Kept tiny and explicit so no screen re-derives them.
 *
 * BTU/h ↔ W here converts THERMAL power. A cooling unit's BTU/h rating is
 * how much heat it moves, not what it draws from the wall — use
 * coolingInputWatts() in loads.ts for electrical input.
 */
export const W_PER_KW = 1000
export const WH_PER_KWH = 1000
export const BTUH_PER_THERMAL_WATT = 3.412142

export const wToKw = (w: number) => w / W_PER_KW
export const whToKwh = (wh: number) => wh / WH_PER_KWH
export const kwhToWh = (kwh: number) => kwh * WH_PER_KWH

export function thermalWattsFromBtuh(btuh: number): number {
  return btuh / BTUH_PER_THERMAL_WATT
}

/**
 * Battery energy from a charge rating. The voltage MUST be the voltage the
 * mAh figure is quoted at (usually the cell's nominal 3.6–3.85 V for power
 * banks) — mAh alone is not an energy unit.
 */
export function whFromMah(mAh: number, nominalVolts: number): number {
  return (mAh * nominalVolts) / 1000
}

/** Days between two ISO dates (end exclusive), as a billing period length. */
export function daysBetween(startIso: string, endIso: string): number {
  const ms = Date.parse(endIso) - Date.parse(startIso)
  return Math.round(ms / 86_400_000)
}

/** Format JMD for display: J$12,345 (or J$12,345.67 when cents matter). */
export function formatJmd(n: number, cents = false): string {
  return 'J$' + n.toLocaleString('en-JM', { minimumFractionDigits: cents ? 2 : 0, maximumFractionDigits: cents ? 2 : 0 })
}
