import { z } from 'zod'
import type { LoadModel, ScenarioDevice, Evidenced } from './engine'
import { stableStringify } from './engine/stable'
import { vehicleSchema, vehicleFingerprint, VEHICLE_LIMIT, type Vehicle } from '@/lib/vehicles/vehicle'

/**
 * The shared energy profile contract (backlog F03): one shape used by the
 * anonymous browser store, the sync API and every tool that reads devices.
 * A device entered once — with its evidence basis — is what the Backup
 * Builder, Storm Centre and Solar Readiness all read.
 */

export const PROFILE_VERSION = 1
export const LIMITS = { properties: 10, devicesPerProperty: 200, scenariosPerProperty: 30 }

const basis = z.enum(['measured', 'manufacturer', 'customer_entered', 'assumed'])
const evidenced = z.object({ value: z.number().finite().min(0).max(1_000_000), basis, source: z.string().max(200).optional() })
const clientId = z.string().min(1).max(64).regex(/^[A-Za-z0-9_-]+$/)

export const loadModelSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('steady'), watts: evidenced, wattsKind: z.enum(['average', 'nameplate_max']).optional(), hoursPerDay: evidenced, daysPerWeek: z.number().min(0).max(7).optional() }),
  z.object({ kind: z.literal('cycling'), runningWatts: evidenced, dutyCyclePct: evidenced }),
  z.object({ kind: z.literal('measured_energy'), kwh: z.number().min(0).max(100_000), overHours: z.number().positive().max(24 * 400), runningWatts: evidenced.optional() }),
  z.object({
    kind: z.literal('cooling'),
    inputWatts: evidenced.optional(),
    capacityBtuh: evidenced.optional(),
    eer: evidenced.optional(),
    hoursPerDay: evidenced,
    averageLoadFraction: evidenced.optional(),
    daysPerWeek: z.number().min(0).max(7).optional(),
  }),
])

export const DEVICE_CATEGORIES = ['cooling', 'refrigeration', 'water', 'lighting', 'electronics', 'networking', 'medical', 'motor', 'cooking', 'other'] as const

export const deviceSchema = z.object({
  clientId,
  name: z.string().trim().min(1).max(80),
  category: z.enum(DEVICE_CATEGORIES),
  quantity: z.number().int().min(0).max(100),
  brand: z.string().max(80).optional(),
  model: z.string().max(80).optional(),
  load: loadModelSchema,
  motorLoad: z.boolean().default(false),
  startupWatts: evidenced.optional(),
  notes: z.string().max(500).optional(),
})

export const scenarioSchema = z.object({
  clientId,
  name: z.string().trim().min(1).max(60),
  kind: z.enum(['everyday', 'workday', 'overnight', 'storm', 'custom']),
  targetHours: z.number().positive().max(24 * 14).optional(),
  reserveFraction: z.number().min(0).max(0.9).optional(),
  items: z.array(z.object({ deviceClientId: clientId, simultaneous: z.boolean(), essential: z.boolean(), quantityOverride: z.number().int().min(0).max(100).optional() })).max(LIMITS.devicesPerProperty),
})

export const propertySchema = z.object({
  clientId,
  name: z.string().trim().min(1).max(60),
  kind: z.enum(['home', 'business']),
  parish: z.string().max(40).optional(),
  occupants: z.number().int().min(0).max(500).optional(),
  devices: z.array(deviceSchema).max(LIMITS.devicesPerProperty),
  scenarios: z.array(scenarioSchema).max(LIMITS.scenariosPerProperty),
})

export const profileSchema = z.object({
  version: z.literal(PROFILE_VERSION),
  properties: z.array(propertySchema).max(LIMITS.properties),
  /**
   * My Garage. Optional on purpose: a save that leaves it out (an older page
   * still open in a tab) keeps the stored vehicles rather than deleting them.
   */
  vehicles: z.array(vehicleSchema).max(VEHICLE_LIMIT).optional(),
  updatedAt: z.string().max(40).optional(),
})

export type ProfileDevice = z.infer<typeof deviceSchema>
export type ProfileScenario = z.infer<typeof scenarioSchema>
export type ProfileProperty = z.infer<typeof propertySchema>
export type EnergyProfile = z.infer<typeof profileSchema>

export const EMPTY_PROFILE: EnergyProfile = { version: PROFILE_VERSION, properties: [], vehicles: [] }

/** True when there's nothing worth merging into an account. */
export const isEmptyProfile = (p: EnergyProfile) => p.properties.length === 0 && !(p.vehicles?.length)

/** Scenario items whose device no longer exists are dropped, so a removed appliance can't linger in totals. */
export function pruneScenario(s: ProfileScenario, devices: ProfileDevice[]): ProfileScenario {
  const ids = new Set(devices.map((d) => d.clientId))
  const seen = new Set<string>()
  return {
    ...s,
    items: s.items.filter((i) => {
      if (!ids.has(i.deviceClientId) || seen.has(i.deviceClientId)) return false
      seen.add(i.deviceClientId)
      return true
    }),
  }
}

/** Build the engine's scenario input from a profile property and one of its scenarios. */
export function scenarioDevices(property: ProfileProperty, scenario: ProfileScenario): ScenarioDevice[] {
  const byId = new Map(property.devices.map((d) => [d.clientId, d]))
  return pruneScenario(scenario, property.devices).items.map((i) => {
    const d = byId.get(i.deviceClientId) as ProfileDevice
    return {
      deviceId: d.clientId,
      name: d.name,
      quantity: i.quantityOverride ?? d.quantity,
      load: d.load as LoadModel,
      motorLoad: d.motorLoad,
      startupWatts: d.startupWatts as Evidenced | undefined,
      simultaneous: i.simultaneous,
      essential: i.essential,
    }
  })
}

function norm(s: string) {
  return s.trim().toLowerCase().replace(/\s+/g, ' ')
}

/** A device's identity for duplicate detection when clientIds differ (e.g. built on two browsers). */
export function deviceFingerprint(d: ProfileDevice): string {
  return [norm(d.name), d.category, norm(d.brand ?? ''), norm(d.model ?? ''), stableStringify(d.load)].join('|')
}

/**
 * Merge an anonymous browser profile into the signed-in profile without
 * duplicating equipment:
 * - same clientId → the local (just-edited) version replaces the stored one;
 * - a local property with the same name and kind as a stored one is merged into it;
 * - a local device identical to one already in that property (same fingerprint) is not added again,
 *   and scenario items pointing at it are re-pointed to the existing device.
 * Returns the merged profile and counts for the UI.
 */
export function mergeProfiles(server: EnergyProfile, local: EnergyProfile): { profile: EnergyProfile; added: { properties: number; devices: number; scenarios: number; vehicles: number }; skippedDuplicates: number } {
  const props: ProfileProperty[] = server.properties.map((p) => ({ ...p, devices: [...p.devices], scenarios: [...p.scenarios] }))
  const added = { properties: 0, devices: 0, scenarios: 0 }
  let skippedDuplicates = 0

  for (const lp of local.properties) {
    let target = props.find((p) => p.clientId === lp.clientId) ?? props.find((p) => norm(p.name) === norm(lp.name) && p.kind === lp.kind)
    if (!target) {
      if (props.length >= LIMITS.properties) continue
      target = { ...lp, devices: [], scenarios: [] }
      props.push(target)
      added.properties++
    } else if (target.clientId === lp.clientId) {
      Object.assign(target, { name: lp.name, kind: lp.kind, parish: lp.parish, occupants: lp.occupants })
    }

    const remap = new Map<string, string>()
    // Only equipment already on the account counts as a duplicate — two
    // identical fridges entered in the same browser are two fridges.
    const existing = [...target.devices]
    for (const d of lp.devices) {
      const sameId = target.devices.findIndex((x) => x.clientId === d.clientId)
      if (sameId >= 0) {
        target.devices[sameId] = d
        continue
      }
      const dup = existing.find((x) => deviceFingerprint(x) === deviceFingerprint(d))
      if (dup) {
        remap.set(d.clientId, dup.clientId)
        skippedDuplicates++
        continue
      }
      if (target.devices.length >= LIMITS.devicesPerProperty) continue
      target.devices.push(d)
      added.devices++
    }

    for (const s of lp.scenarios) {
      const remapped = { ...s, items: s.items.map((i) => ({ ...i, deviceClientId: remap.get(i.deviceClientId) ?? i.deviceClientId })) }
      const pruned = pruneScenario(remapped, target.devices)
      const idx = target.scenarios.findIndex((x) => x.clientId === s.clientId)
      if (idx >= 0) target.scenarios[idx] = pruned
      else if (target.scenarios.length < LIMITS.scenariosPerProperty) {
        target.scenarios.push(pruned)
        added.scenarios++
      }
    }
  }
  // Vehicles: same clientId → local version wins; the same car (make/model/year/nickname) isn't added twice.
  const vehicles: Vehicle[] = [...(server.vehicles ?? [])]
  let vehiclesAdded = 0
  for (const v of local.vehicles ?? []) {
    const same = vehicles.findIndex((x) => x.clientId === v.clientId)
    if (same >= 0) vehicles[same] = v
    else if (vehicles.some((x) => vehicleFingerprint(x) === vehicleFingerprint(v))) skippedDuplicates++
    else if (vehicles.length < VEHICLE_LIMIT) {
      vehicles.push({ ...v, primary: v.primary && !vehicles.some((x) => x.primary) })
      vehiclesAdded++
    }
  }
  return { profile: { version: PROFILE_VERSION, properties: props, vehicles, updatedAt: new Date().toISOString() }, added: { ...added, vehicles: vehiclesAdded }, skippedDuplicates }
}

export function newClientId(prefix: string): string {
  const rand = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID().replace(/-/g, '').slice(0, 16) : Math.random().toString(36).slice(2, 18)
  return `${prefix}_${rand}`
}
