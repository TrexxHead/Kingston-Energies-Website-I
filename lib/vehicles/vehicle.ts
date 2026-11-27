import { z } from 'zod'

/**
 * A customer's vehicle (My Garage). Part of the shared energy profile, so
 * it's entered once and read by the EV cost calculator, the map, the trip
 * planner, the solar estimator and the storm hub.
 *
 * Every spec carries its evidence basis, like device figures do: from the
 * US EPA (fueleconomy.gov), decoded from the VIN (NHTSA vPIC), or typed in
 * by the owner. A spec nobody has supplied stays empty — tools then ask for
 * it rather than assuming.
 */

export const POWERTRAINS = ['bev', 'phev', 'hev'] as const
export type Powertrain = (typeof POWERTRAINS)[number]
export const POWERTRAIN_LABEL: Record<Powertrain, string> = {
  bev: 'Fully electric (EV)',
  phev: 'Plug-in hybrid',
  hev: 'Hybrid (self-charging)',
}
export const plugsIn = (p: Powertrain) => p !== 'hev'

export const BODY_STYLES = ['hatchback', 'sedan', 'suv', 'crossover', 'pickup', 'van', 'coupe', 'wagon'] as const
export type BodyStyle = (typeof BODY_STYLES)[number]
export const BODY_LABEL: Record<BodyStyle, string> = {
  hatchback: 'Hatchback',
  sedan: 'Sedan',
  suv: 'SUV',
  crossover: 'Crossover',
  pickup: 'Pickup',
  van: 'Van / minibus',
  coupe: 'Coupe',
  wagon: 'Wagon',
}

/** Vehicle inlets. Names line up with the station registry where they can (see connectors.ts). */
export const AC_INLETS = ['J1772', 'Type 2', 'NACS (Tesla)', 'GB/T AC'] as const
export const DC_INLETS = ['CCS1', 'CCS2', 'CHAdeMO', 'NACS (Tesla)', 'GB/T DC'] as const

const specBasis = z.enum(['epa', 'vin', 'manufacturer', 'customer_entered'])
export type SpecBasis = z.infer<typeof specBasis>
export const SPEC_BASIS_LABEL: Record<SpecBasis, string> = {
  epa: 'US EPA (fueleconomy.gov)',
  vin: 'Decoded from the VIN (NHTSA)',
  manufacturer: 'Manufacturer',
  customer_entered: 'You entered',
}
const spec = (max: number) => z.object({ value: z.number().finite().min(0).max(max), basis: specBasis })
export type Spec = { value: number; basis: SpecBasis }

const clientId = z.string().min(1).max(64).regex(/^[A-Za-z0-9_-]+$/)

export const vehicleSchema = z.object({
  clientId,
  nickname: z.string().trim().max(40).optional(),
  powertrain: z.enum(POWERTRAINS),
  make: z.string().trim().min(1).max(40),
  model: z.string().trim().min(1).max(60),
  year: z.number().int().min(1990).max(2035).optional(),
  trim: z.string().trim().max(80).optional(),
  bodyStyle: z.enum(BODY_STYLES),
  colour: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  /** Optional; used only to look the car up. Never shown publicly. */
  vin: z.string().trim().toUpperCase().regex(/^[A-HJ-NPR-Z0-9]{17}$/).optional(),
  specs: z
    .object({
      /** Battery capacity, kWh (usable where the source says so; VIN data gives the nominal size). */
      batteryKwh: spec(250).optional(),
      /** Energy use including charging losses, kWh per 100 km. */
      kwhPer100km: spec(100).optional(),
      /** Petrol use for hybrids (and PHEVs on petrol), L per 100 km. */
      litresPer100km: spec(40).optional(),
      /** Electric range, km. */
      rangeKm: spec(1500).optional(),
      /** Onboard AC charger, kW. */
      acChargeKw: spec(50).optional(),
      /** Peak DC fast-charge rate, kW. */
      dcChargeKw: spec(500).optional(),
      /** Vehicle-to-load output (powering appliances from the car), kW. */
      v2lKw: spec(20).optional(),
    })
    .default({}),
  acInlet: z.enum(AC_INLETS).optional(),
  dcInlet: z.enum(DC_INLETS).optional(),
  kmPerWeek: z.number().min(0).max(10_000).optional(),
  homeCharging: z.enum(['none', 'wall_outlet', 'level2']).optional(),
  primary: z.boolean().default(false),
  /** Where the lookup came from (EPA vehicle id / VIN decode), for reference. */
  source: z.object({ kind: z.enum(['epa', 'vin', 'manual']), ref: z.string().max(40).optional(), retrievedAt: z.string().max(40).optional() }).optional(),
})

export type Vehicle = z.infer<typeof vehicleSchema>
export const VEHICLE_LIMIT = 6

export const vehicleName = (v: Pick<Vehicle, 'nickname' | 'make' | 'model' | 'year'>) => v.nickname || [v.year, v.make, v.model].filter(Boolean).join(' ')

/** The car tools should use by default: the one marked primary, else the first. */
export const primaryVehicle = (vs: Vehicle[] | undefined): Vehicle | null => (vs?.length ? (vs.find((v) => v.primary) ?? vs[0]) : null)

/** For merging two lists of the same person's cars (browser + account). */
export const vehicleFingerprint = (v: Vehicle) => [v.make, v.model, v.year ?? '', v.nickname ?? ''].map((s) => String(s).trim().toLowerCase()).join('|')

/** Body colours offered in the garage (any hex is accepted). */
export const PAINT: { name: string; hex: string }[] = [
  { name: 'Glacier white', hex: '#eef0f2' },
  { name: 'Silver', hex: '#b9bec4' },
  { name: 'Graphite', hex: '#4a4f55' },
  { name: 'Midnight black', hex: '#15171a' },
  { name: 'Racing red', hex: '#b3121b' },
  { name: 'Ocean blue', hex: '#1d4f91' },
  { name: 'Caribbean teal', hex: '#0f8c8c' },
  { name: 'Island green', hex: '#2f7d3a' },
  { name: 'Sunrise orange', hex: '#e2671c' },
  { name: 'Gold', hex: '#c9a23a' },
]
