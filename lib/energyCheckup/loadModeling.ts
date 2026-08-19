import type { AcType } from './applianceLibrary'

/**
 * Deeper behavioral modeling for the two load types where a flat
 * watts × hours estimate is most misleading: a fridge's compressor cycles
 * on and off rather than running continuously, and an AC unit draws very
 * differently while pulling a room down to temperature than once it's
 * maintaining it. This sits alongside the existing point-estimate
 * calculation in calc.ts (which stays exactly as calibrated against the
 * spec's worked example) — it adds a range and an explanation, it doesn't
 * replace the number already shown.
 */

// --- Fridge duty-cycle ------------------------------------------------------

export interface DutyCycleRange {
  lowPct: number
  highPct: number
}

/**
 * A reasonable estimated compressor duty-cycle range by fridge age — older
 * compressors and worn seals run more often to hold the same temperature.
 * These are planning ranges, not a measurement of this specific unit.
 */
export function fridgeDutyCycleRange(ageBand: '<5' | '5-10' | '10+' | undefined): DutyCycleRange {
  if (ageBand === '10+') return { lowPct: 45, highPct: 60 }
  if (ageBand === '5-10') return { lowPct: 40, highPct: 50 }
  return { lowPct: 35, highPct: 45 }
}

/**
 * A conservative (higher) planning estimate for a cycling load's monthly
 * kWh, for storm/backup-power planning where under-estimating runtime is
 * the costlier mistake. Applied as a margin on top of the already-computed
 * point estimate — never replaces it.
 */
export function conservativeCyclingKwh(pointEstimateKwh: number, ageBand: '<5' | '5-10' | '10+' | undefined): number {
  const range = fridgeDutyCycleRange(ageBand)
  const margin = 1 + (range.highPct - range.lowPct) / 100
  return pointEstimateKwh * margin
}

// --- AC load profile ---------------------------------------------------------

export interface AcLoadProfile {
  /** Roughly the first several minutes: compressor start + pulling the room down from ambient. */
  startupW: number
  /** Sustained pull-down before the room reaches the thermostat setting. */
  highLoadW: number
  /** Once at temperature: cycling/modulating to hold it — this is what contextWatts()'s AC_WATTS already represents. */
  maintenanceW: number
}

// Startup/high-load multipliers over the maintenance figure — window units
// (fixed-speed compressor) swing harder between off/on than a split
// inverter unit (which modulates compressor speed rather than fully
// stopping), so a window AC's startup spike is modeled higher.
const AC_PROFILE_MULTIPLIERS: Record<AcType, { startup: number; highLoad: number }> = {
  none: { startup: 0, highLoad: 0 },
  window: { startup: 2.6, highLoad: 1.35 },
  split: { startup: 1.8, highLoad: 1.2 },
}

/**
 * Models an AC unit's power draw across the three phases a real compressor
 * goes through — never a single flat number, since "average watts" hides
 * both the startup spike (relevant for surge/sizing) and the pull-down
 * period (relevant for a realistic runtime estimate).
 */
export function acLoadProfile(acType: AcType, maintenanceW: number): AcLoadProfile {
  const mult = AC_PROFILE_MULTIPLIERS[acType]
  return {
    startupW: Math.round(maintenanceW * mult.startup),
    highLoadW: Math.round(maintenanceW * mult.highLoad),
    maintenanceW,
  }
}
