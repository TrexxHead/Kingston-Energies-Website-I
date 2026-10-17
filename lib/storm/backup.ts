import { evaluateScenario, runtime, checkContinuousOutput, checkSurge, type ScenarioDevice, type CapacityBasis, type Range, type PowerCheck, type CalcResult, type ScenarioTotals, type RuntimeResult, refuse, isPositive } from '@/lib/energy/engine'

/**
 * "How long will my backup last?" for the storm page — composes the
 * engine's scenario totals, battery runtime and power checks. No formula of
 * its own: every number comes from lib/energy/engine, so a change there
 * (and its version bump) covers this too.
 */

export interface BackupBattery {
  capacityWh: number
  capacityBasis: CapacityBasis
  outputPath: 'ac' | 'dc'
  continuousWatts?: number
  surgeWatts?: number
  reserveFraction?: number
}

export interface BackupEstimate {
  totals: ScenarioTotals
  runtime: RuntimeResult
  /** Hours as a range, also expressed in days for long outages. */
  hours: Range
  continuous: PowerCheck
  surge: PowerCheck
}

export function backupEstimate(devices: ScenarioDevice[], battery: BackupBattery): CalcResult<BackupEstimate> {
  if (!devices.some((d) => d.quantity > 0)) return refuse('missing_input', ['devices'], 'Add at least one thing you want to keep running.')
  if (!isPositive(battery.capacityWh)) return refuse('missing_input', ['capacityWh'], 'Enter the battery capacity in watt-hours (Wh) from its label.')
  const scen = evaluateScenario(devices)
  if (!scen.ok) return scen
  if (!(scen.value.averageWatts.low > 0)) {
    const why = scen.value.unresolved.length ? ' Some devices need their wattage before they can count.' : ''
    return refuse('missing_input', ['devices'], `None of the devices has a usage we can count yet.${why}`)
  }
  // Manufacturer evidence here means the visitor read it off the label or spec sheet.
  const run = runtime({
    source: {
      capacityWh: { value: battery.capacityWh, basis: 'customer_entered' },
      capacityBasis: battery.capacityBasis,
      continuousWatts: isPositive(battery.continuousWatts) ? { value: battery.continuousWatts, basis: 'customer_entered' } : undefined,
      surgeWatts: isPositive(battery.surgeWatts) ? { value: battery.surgeWatts, basis: 'customer_entered' } : undefined,
    },
    outputPath: battery.outputPath,
    averageLoadWatts: scen.value.averageWatts,
    loadBasis: scen.basis,
    reserveFraction: battery.reserveFraction,
  })
  if (!run.ok) return run
  const source = {
    continuousWatts: isPositive(battery.continuousWatts) ? { value: battery.continuousWatts, basis: 'customer_entered' as const } : undefined,
    surgeWatts: isPositive(battery.surgeWatts) ? { value: battery.surgeWatts, basis: 'customer_entered' as const } : undefined,
  }
  return {
    ok: true,
    value: {
      totals: scen.value,
      runtime: run.value,
      hours: run.value.hours,
      continuous: checkContinuousOutput(source, scen.value.simultaneousWatts),
      surge: checkSurge(source, scen.value.startupPeakWatts),
    },
    basis: run.basis,
    assumptions: [...scen.assumptions, ...run.assumptions],
    warnings: [...scen.warnings, ...run.warnings],
  }
}

/** A quick-entry row → engine device: a steady load at the visitor's watts and hours. */
export interface QuickLoad {
  id: string
  name: string
  watts: number | null
  hoursPerDay: number | null
  quantity: number
  motor: boolean
}

export function quickDevices(rows: QuickLoad[]): ScenarioDevice[] {
  return rows
    .filter((r) => r.name.trim() && r.quantity > 0)
    .map((r) => ({
      deviceId: r.id,
      name: r.name.trim(),
      quantity: r.quantity,
      load: {
        kind: 'steady' as const,
        watts: { value: r.watts ?? Number.NaN, basis: 'customer_entered' as const },
        hoursPerDay: { value: r.hoursPerDay ?? Number.NaN, basis: 'customer_entered' as const },
      },
      motorLoad: r.motor,
      // Quick entry can't know which loads overlap — treat all as on together (the safe side for the output check).
      simultaneous: true,
      essential: true,
    }))
}
