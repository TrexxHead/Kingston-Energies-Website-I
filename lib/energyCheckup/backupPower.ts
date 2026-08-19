/**
 * Backup-power math shared by the Storm Prep / Energy Checkup tools —
 * "how long will this actually run something, and can it even start it."
 *
 * Two things this deliberately does NOT do:
 * - It never assumes a battery's advertised/nominal Wh is what you can
 *   actually draw. Real cells have a usable depth-of-discharge, and running
 *   AC loads through an inverter costs conversion losses on top of that.
 * - It never invents a capacity, surge rating, or efficiency figure for a
 *   specific product that doesn't have one on record. Every function here
 *   takes real numbers in; callers are responsible for only calling it with
 *   values they actually have (see `capacityWh()` in lib/catalog.ts, which
 *   returns null rather than guess).
 */

// Typical safe usable depth-of-discharge for a consumer LiFePO4/Li-ion power
// station before the BMS cuts out — used only as a documented default when a
// product doesn't publish its own usable-capacity figure.
export const DEFAULT_USABLE_BATTERY_FRACTION = 0.85

// Typical continuous efficiency of a pure sine-wave inverter under real
// (non-peak) load — the rest is lost as heat converting DC to AC.
export const DEFAULT_INVERTER_EFFICIENCY = 0.85

/** Wh = Watts × hours. The one formula everything else here builds on. */
export function wattHours(watts: number, hours: number): number {
  return watts * hours
}

/**
 * The energy you can actually draw out of a battery before it protects
 * itself and cuts out — always less than the nominal/advertised capacity.
 */
export function usableWh(nominalWh: number, usableFraction: number = DEFAULT_USABLE_BATTERY_FRACTION): number {
  return nominalWh * usableFraction
}

/**
 * Usable energy after also accounting for inverter conversion loss —
 * this is the real number for anything plugged into an AC outlet on a
 * power station, as opposed to USB/DC output which skips the inverter.
 */
export function usableAcWh(
  nominalWh: number,
  usableFraction: number = DEFAULT_USABLE_BATTERY_FRACTION,
  inverterEfficiency: number = DEFAULT_INVERTER_EFFICIENCY,
): number {
  return usableWh(nominalWh, usableFraction) * inverterEfficiency
}

/**
 * Runtime ≈ usable Wh / average load watts. Returns null (not Infinity or 0)
 * when the load is zero or negative — "no meaningful runtime figure" rather
 * than a nonsense number.
 */
export function runtimeHours(usableWhValue: number, avgLoadWatts: number): number | null {
  if (avgLoadWatts <= 0) return null
  return usableWhValue / avgLoadWatts
}

export type SurgeCheck = 'ok' | 'tight' | 'insufficient' | 'unknown'

/**
 * Can this power source actually START the appliance — not just supply its
 * running wattage. Motors/compressors (fridges, ACs, pumps) draw a brief
 * surge, often 2–3× their running watts, when they switch on; a source with
 * plenty of average capacity can still brown out or shut off trying to
 * start one. Returns 'unknown' rather than guessing when either figure is
 * missing — this must never silently read as "ok."
 */
export function checkSurgeCapacity(sourceSurgeWatts: number | null | undefined, applianceStartupWatts: number | null | undefined): SurgeCheck {
  if (sourceSurgeWatts == null || applianceStartupWatts == null || applianceStartupWatts <= 0) return 'unknown'
  const headroom = sourceSurgeWatts / applianceStartupWatts
  if (headroom >= 1.2) return 'ok'
  if (headroom >= 1.0) return 'tight'
  return 'insufficient'
}

/**
 * Can this power source sustain a simultaneous steady-state load — separate
 * from whether it has enough total *energy* (that's `runtimeHours`) and from
 * whether it can survive a motor's startup spike (that's
 * `checkSurgeCapacity`, which needs a surge rating this doesn't). Uses a
 * product's rated continuous output watts — a real spec, never a surge
 * figure — so this only ever answers "can it carry this many watts at once,"
 * not "can it start something." Returns 'unknown' rather than guessing when
 * the source has no published output rating.
 */
export function checkContinuousLoad(sourceRatedWatts: number | null | undefined, totalLoadWatts: number): SurgeCheck {
  if (sourceRatedWatts == null || totalLoadWatts <= 0) return 'unknown'
  const headroom = sourceRatedWatts / totalLoadWatts
  if (headroom >= 1.15) return 'ok'
  if (headroom >= 1.0) return 'tight'
  return 'insufficient'
}
