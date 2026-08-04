/**
 * The Energy Usage Checkup's appliance reference table.
 *
 * Curated for equipment common in Jamaica — not imported from a US-biased
 * database — and sanity-checked against JPS's own published monthly cost
 * figures (see lib/energyCheckup/sources.ts). Window vs. inverter-split AC is
 * the single most important distinction: they differ hugely in wattage.
 *
 * Treat this as a living table. It should improve as real bill-calibration
 * data arrives from actual Checkup sessions (see the build spec's v2 notes).
 */

export type Category = 'cooling' | 'refrigeration' | 'water' | 'lighting' | 'electronics' | 'other'

export const CATEGORY_META: Record<Category, { label: string; color: string; icon: string }> = {
  cooling: { label: 'Cooling', color: '#29abe2', icon: 'wind' },
  refrigeration: { label: 'Refrigeration', color: '#04547c', icon: 'refrigerator' },
  water: { label: 'Water heating', color: '#f7941e', icon: 'droplets' },
  lighting: { label: 'Lighting', color: '#93c93f', icon: 'lightbulb' },
  electronics: { label: 'Electronics', color: '#c0821c', icon: 'laptop' },
  other: { label: 'Other', color: '#8c9a92', icon: 'package' },
}

export interface ApplianceDef {
  id: string
  category: Category
  displayName: string
  icon: string
  /** Fixed wattage, or null when it's derived from a context answer (see contextWatts()). */
  watts: number | null
  defaultCount: number
  defaultHoursPerDay: number
  maxHoursPerDay: number
  /** Only 'fridge' currently carries an age-based efficiency-loss multiplier. */
  ageSensitive?: boolean
}

// --- Household library -------------------------------------------------

export const HOUSEHOLD_LIBRARY: ApplianceDef[] = [
  { id: 'ac', category: 'cooling', displayName: 'Air conditioning', icon: 'wind', watts: null, defaultCount: 1, defaultHoursPerDay: 8, maxHoursPerDay: 24 },
  { id: 'fridge', category: 'refrigeration', displayName: 'Refrigerator / freezer', icon: 'refrigerator', watts: 140, defaultCount: 1, defaultHoursPerDay: 10, maxHoursPerDay: 24, ageSensitive: true },
  { id: 'water', category: 'water', displayName: 'Water heating', icon: 'droplets', watts: null, defaultCount: 1, defaultHoursPerDay: 1.2, maxHoursPerDay: 6 },
  { id: 'fans', category: 'cooling', displayName: 'Fans', icon: 'fan', watts: 60, defaultCount: 3, defaultHoursPerDay: 8, maxHoursPerDay: 24 },
  { id: 'lighting', category: 'lighting', displayName: 'Lit rooms', icon: 'lightbulb', watts: null, defaultCount: 6, defaultHoursPerDay: 5, maxHoursPerDay: 14 },
  { id: 'tv', category: 'electronics', displayName: 'TV / entertainment', icon: 'tv', watts: 100, defaultCount: 1, defaultHoursPerDay: 5, maxHoursPerDay: 16 },
  { id: 'computers', category: 'electronics', displayName: 'Computers / router', icon: 'laptop', watts: 110, defaultCount: 2, defaultHoursPerDay: 6, maxHoursPerDay: 24 },
  { id: 'charging', category: 'electronics', displayName: 'Phone & laptop charging', icon: 'smartphone', watts: 15, defaultCount: 4, defaultHoursPerDay: 3, maxHoursPerDay: 12 },
  { id: 'pump', category: 'other', displayName: 'Water pump', icon: 'waves', watts: 750, defaultCount: 0, defaultHoursPerDay: 1.5, maxHoursPerDay: 6 },
  { id: 'iron', category: 'other', displayName: 'Iron', icon: 'shirt', watts: 1100, defaultCount: 1, defaultHoursPerDay: 0.5, maxHoursPerDay: 4 },
  { id: 'stove', category: 'other', displayName: 'Electric stove / oven', icon: 'cooking-pot', watts: 2000, defaultCount: 1, defaultHoursPerDay: 1, maxHoursPerDay: 6 },
  { id: 'washer', category: 'other', displayName: 'Washing machine', icon: 'washing-machine', watts: 500, defaultCount: 1, defaultHoursPerDay: 1, maxHoursPerDay: 4 },
  { id: 'dryer', category: 'other', displayName: 'Clothes dryer', icon: 'wind', watts: 3000, defaultCount: 0, defaultHoursPerDay: 0.7, maxHoursPerDay: 4 },
  { id: 'chestFreezer', category: 'refrigeration', displayName: 'Chest freezer', icon: 'snowflake', watts: 130, defaultCount: 0, defaultHoursPerDay: 10, maxHoursPerDay: 24 },
]

// --- Business library ----------------------------------------------------

export const BUSINESS_LIBRARY: ApplianceDef[] = [
  { id: 'bizAc', category: 'cooling', displayName: 'Air conditioning', icon: 'wind', watts: 1800, defaultCount: 1, defaultHoursPerDay: 10, maxHoursPerDay: 24 },
  { id: 'coolers', category: 'refrigeration', displayName: 'Display coolers', icon: 'refrigerator', watts: 400, defaultCount: 2, defaultHoursPerDay: 14, maxHoursPerDay: 24 },
  { id: 'walkIn', category: 'refrigeration', displayName: 'Walk-in cold room', icon: 'snowflake', watts: 900, defaultCount: 0, defaultHoursPerDay: 12, maxHoursPerDay: 24 },
  { id: 'pos', category: 'electronics', displayName: 'POS / computers', icon: 'laptop', watts: 90, defaultCount: 2, defaultHoursPerDay: 10, maxHoursPerDay: 24 },
  { id: 'wifi', category: 'electronics', displayName: 'Wi-Fi always-on kit', icon: 'wifi', watts: 15, defaultCount: 1, defaultHoursPerDay: 24, maxHoursPerDay: 24 },
  { id: 'signage', category: 'other', displayName: 'Signage & shop lighting', icon: 'lightbulb', watts: 120, defaultCount: 1, defaultHoursPerDay: 12, maxHoursPerDay: 24 },
  { id: 'bizFans', category: 'cooling', displayName: 'Fans', icon: 'fan', watts: 60, defaultCount: 2, defaultHoursPerDay: 10, maxHoursPerDay: 24 },
  { id: 'bizWater', category: 'water', displayName: 'Water heating', icon: 'droplets', watts: 3000, defaultCount: 0, defaultHoursPerDay: 1, maxHoursPerDay: 6 },
]

export function libraryFor(mode: 'home' | 'biz'): ApplianceDef[] {
  return mode === 'home' ? HOUSEHOLD_LIBRARY : BUSINESS_LIBRARY
}

// --- Context-dependent wattage lookups ------------------------------------

export type AcType = 'none' | 'window' | 'split'
export type WaterType = 'tank' | 'instant' | 'solar' | 'gas' | 'none'
export type LightType = 'led' | 'cfl' | 'incandescent'

const AC_WATTS: Record<AcType, number> = { none: 0, window: 900, split: 550 }
const WATER_WATTS: Record<WaterType, number> = { tank: 3000, instant: 4500, solar: 0, gas: 0, none: 0 }
const LIGHT_WATTS: Record<LightType, number> = { led: 9, cfl: 15, incandescent: 60 }

/** Resolves an appliance's effective wattage — its fixed value, or a context-driven lookup for AC/water/lighting. */
export function contextWatts(appliance: ApplianceDef, ctx: { acType?: AcType; waterType?: WaterType; lightType?: LightType }): number {
  if (appliance.watts !== null) return appliance.watts
  if (appliance.id === 'ac' || appliance.id === 'bizAc') return AC_WATTS[ctx.acType ?? 'split']
  if (appliance.id === 'water' || appliance.id === 'bizWater') return WATER_WATTS[ctx.waterType ?? 'tank']
  if (appliance.id === 'lighting') return LIGHT_WATTS[ctx.lightType ?? 'led']
  return 0
}

/** Fridge-only age-based efficiency-loss multiplier. */
export function ageMultiplier(appliance: ApplianceDef, fridgeAgeBand: '<5' | '5-10' | '10+' | undefined): number {
  if (!appliance.ageSensitive) return 1
  if (fridgeAgeBand === '10+') return 1.4
  if (fridgeAgeBand === '5-10') return 1.15
  return 1.0
}
