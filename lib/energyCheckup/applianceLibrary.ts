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

// --- Where appliances live — used to group Stage 2 into foldable sections ---

export type Room =
  | 'kitchen' | 'living' | 'bedroom' | 'bathroom' | 'laundry' | 'outdoor' | 'utility'
  | 'salesFloor' | 'backOfHouse' | 'office'

export const ROOM_META: Record<Room, { label: string; icon: string }> = {
  kitchen: { label: 'Kitchen', icon: 'chef-hat' },
  living: { label: 'Living & family room', icon: 'tv' },
  bedroom: { label: 'Bedrooms', icon: 'moon' },
  bathroom: { label: 'Bathroom', icon: 'droplets' },
  laundry: { label: 'Laundry', icon: 'washing-machine' },
  outdoor: { label: 'Outdoor', icon: 'sun' },
  utility: { label: 'Whole-home & utility', icon: 'router' },
  salesFloor: { label: 'Sales floor', icon: 'lightbulb' },
  backOfHouse: { label: 'Back of house', icon: 'refrigerator' },
  office: { label: 'Office', icon: 'laptop' },
}

export const HOUSEHOLD_ROOM_ORDER: Room[] = ['kitchen', 'living', 'bedroom', 'bathroom', 'laundry', 'outdoor', 'utility']
export const BUSINESS_ROOM_ORDER: Room[] = ['salesFloor', 'backOfHouse', 'office', 'utility']

export interface ApplianceDef {
  id: string
  category: Category
  room: Room
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
//
// The original 14 rows (ac..chestFreezer) are the exact set the spec's own
// worked example is built from — their watts/hours/defaults are load-bearing
// for tests/energyCheckup.calc.test.ts and must not change. Everything below
// them is additional real-world equipment, added off by default (count: 0)
// so a customer opts each one in rather than starting from an inflated
// estimate.

export const HOUSEHOLD_LIBRARY: ApplianceDef[] = [
  // --- original 14 (spec reference set) ---
  { id: 'ac', category: 'cooling', room: 'living', displayName: 'Air conditioning', icon: 'wind', watts: null, defaultCount: 1, defaultHoursPerDay: 8, maxHoursPerDay: 24 },
  { id: 'fridge', category: 'refrigeration', room: 'kitchen', displayName: 'Refrigerator / freezer', icon: 'refrigerator', watts: 140, defaultCount: 1, defaultHoursPerDay: 10, maxHoursPerDay: 24, ageSensitive: true },
  { id: 'water', category: 'water', room: 'bathroom', displayName: 'Water heating', icon: 'droplets', watts: null, defaultCount: 1, defaultHoursPerDay: 1.2, maxHoursPerDay: 6 },
  { id: 'fans', category: 'cooling', room: 'living', displayName: 'Fans', icon: 'fan', watts: 60, defaultCount: 3, defaultHoursPerDay: 8, maxHoursPerDay: 24 },
  { id: 'lighting', category: 'lighting', room: 'utility', displayName: 'Lit rooms', icon: 'lightbulb', watts: null, defaultCount: 6, defaultHoursPerDay: 5, maxHoursPerDay: 14 },
  { id: 'tv', category: 'electronics', room: 'living', displayName: 'TV / entertainment', icon: 'tv', watts: 100, defaultCount: 1, defaultHoursPerDay: 5, maxHoursPerDay: 16 },
  { id: 'computers', category: 'electronics', room: 'living', displayName: 'Computers / router', icon: 'laptop', watts: 110, defaultCount: 2, defaultHoursPerDay: 6, maxHoursPerDay: 24 },
  { id: 'charging', category: 'electronics', room: 'bedroom', displayName: 'Phone & laptop charging', icon: 'smartphone', watts: 15, defaultCount: 4, defaultHoursPerDay: 3, maxHoursPerDay: 12 },
  { id: 'pump', category: 'other', room: 'outdoor', displayName: 'Water pump', icon: 'waves', watts: 750, defaultCount: 0, defaultHoursPerDay: 1.5, maxHoursPerDay: 6 },
  { id: 'iron', category: 'other', room: 'laundry', displayName: 'Iron', icon: 'shirt', watts: 1100, defaultCount: 1, defaultHoursPerDay: 0.5, maxHoursPerDay: 4 },
  { id: 'stove', category: 'other', room: 'kitchen', displayName: 'Electric stove / oven', icon: 'cooking-pot', watts: 2000, defaultCount: 1, defaultHoursPerDay: 1, maxHoursPerDay: 6 },
  { id: 'washer', category: 'other', room: 'laundry', displayName: 'Washing machine', icon: 'washing-machine', watts: 500, defaultCount: 1, defaultHoursPerDay: 1, maxHoursPerDay: 4 },
  { id: 'dryer', category: 'other', room: 'laundry', displayName: 'Clothes dryer', icon: 'wind', watts: 3000, defaultCount: 0, defaultHoursPerDay: 0.7, maxHoursPerDay: 4 },
  { id: 'chestFreezer', category: 'refrigeration', room: 'utility', displayName: 'Chest freezer', icon: 'snowflake', watts: 130, defaultCount: 0, defaultHoursPerDay: 10, maxHoursPerDay: 24 },

  // --- additional real-world equipment, off by default ---
  { id: 'microwave', category: 'other', room: 'kitchen', displayName: 'Microwave', icon: 'microwave', watts: 1000, defaultCount: 0, defaultHoursPerDay: 0.3, maxHoursPerDay: 4 },
  { id: 'kettle', category: 'other', room: 'kitchen', displayName: 'Electric kettle', icon: 'cup-soda', watts: 1500, defaultCount: 0, defaultHoursPerDay: 0.15, maxHoursPerDay: 3 },
  { id: 'toaster', category: 'other', room: 'kitchen', displayName: 'Toaster', icon: 'sandwich', watts: 900, defaultCount: 0, defaultHoursPerDay: 0.1, maxHoursPerDay: 2 },
  { id: 'blender', category: 'other', room: 'kitchen', displayName: 'Blender', icon: 'blend', watts: 400, defaultCount: 0, defaultHoursPerDay: 0.05, maxHoursPerDay: 2 },
  { id: 'dishwasher', category: 'other', room: 'kitchen', displayName: 'Dishwasher', icon: 'droplets', watts: 1800, defaultCount: 0, defaultHoursPerDay: 0.7, maxHoursPerDay: 3 },
  { id: 'riceCooker', category: 'other', room: 'kitchen', displayName: 'Rice cooker', icon: 'chef-hat', watts: 700, defaultCount: 0, defaultHoursPerDay: 0.5, maxHoursPerDay: 3 },
  { id: 'coffeeMaker', category: 'other', room: 'kitchen', displayName: 'Coffee maker', icon: 'coffee', watts: 800, defaultCount: 0, defaultHoursPerDay: 0.2, maxHoursPerDay: 3 },
  { id: 'airFryer', category: 'other', room: 'kitchen', displayName: 'Air fryer', icon: 'flame', watts: 1500, defaultCount: 0, defaultHoursPerDay: 0.4, maxHoursPerDay: 3 },

  { id: 'soundbar', category: 'electronics', room: 'living', displayName: 'Soundbar / speaker system', icon: 'speaker', watts: 60, defaultCount: 0, defaultHoursPerDay: 3, maxHoursPerDay: 12 },
  { id: 'gameConsole', category: 'electronics', room: 'living', displayName: 'Game console', icon: 'gamepad-2', watts: 150, defaultCount: 0, defaultHoursPerDay: 2, maxHoursPerDay: 10 },

  { id: 'humidifier', category: 'other', room: 'bedroom', displayName: 'Humidifier / dehumidifier', icon: 'droplet', watts: 30, defaultCount: 0, defaultHoursPerDay: 8, maxHoursPerDay: 24 },

  { id: 'hairDryer', category: 'other', room: 'bathroom', displayName: 'Hair dryer', icon: 'wind', watts: 1200, defaultCount: 0, defaultHoursPerDay: 0.1, maxHoursPerDay: 2 },
  { id: 'extractorFan', category: 'cooling', room: 'bathroom', displayName: 'Extractor fan', icon: 'fan', watts: 30, defaultCount: 0, defaultHoursPerDay: 0.5, maxHoursPerDay: 4 },

  { id: 'poolPump', category: 'other', room: 'outdoor', displayName: 'Pool pump', icon: 'waves', watts: 1000, defaultCount: 0, defaultHoursPerDay: 4, maxHoursPerDay: 12 },
  { id: 'outdoorLighting', category: 'lighting', room: 'outdoor', displayName: 'Outdoor / security lighting', icon: 'lightbulb', watts: 60, defaultCount: 0, defaultHoursPerDay: 8, maxHoursPerDay: 14 },
  { id: 'gateMotor', category: 'other', room: 'outdoor', displayName: 'Electric gate motor', icon: 'door-open', watts: 300, defaultCount: 0, defaultHoursPerDay: 0.2, maxHoursPerDay: 2 },

  { id: 'wifiRouter', category: 'electronics', room: 'utility', displayName: 'Wi-Fi router', icon: 'router', watts: 15, defaultCount: 0, defaultHoursPerDay: 24, maxHoursPerDay: 24 },
  { id: 'securityCameras', category: 'electronics', room: 'utility', displayName: 'Security cameras / alarm', icon: 'camera', watts: 25, defaultCount: 0, defaultHoursPerDay: 24, maxHoursPerDay: 24 },
]

// --- Business library ----------------------------------------------------

export const BUSINESS_LIBRARY: ApplianceDef[] = [
  { id: 'bizAc', category: 'cooling', room: 'salesFloor', displayName: 'Air conditioning', icon: 'wind', watts: 1800, defaultCount: 1, defaultHoursPerDay: 10, maxHoursPerDay: 24 },
  { id: 'coolers', category: 'refrigeration', room: 'salesFloor', displayName: 'Display coolers', icon: 'refrigerator', watts: 400, defaultCount: 2, defaultHoursPerDay: 14, maxHoursPerDay: 24 },
  { id: 'walkIn', category: 'refrigeration', room: 'backOfHouse', displayName: 'Walk-in cold room', icon: 'snowflake', watts: 900, defaultCount: 0, defaultHoursPerDay: 12, maxHoursPerDay: 24 },
  { id: 'pos', category: 'electronics', room: 'salesFloor', displayName: 'POS / computers', icon: 'laptop', watts: 90, defaultCount: 2, defaultHoursPerDay: 10, maxHoursPerDay: 24 },
  { id: 'wifi', category: 'electronics', room: 'utility', displayName: 'Wi-Fi always-on kit', icon: 'wifi', watts: 15, defaultCount: 1, defaultHoursPerDay: 24, maxHoursPerDay: 24 },
  { id: 'signage', category: 'other', room: 'salesFloor', displayName: 'Signage & shop lighting', icon: 'lightbulb', watts: 120, defaultCount: 1, defaultHoursPerDay: 12, maxHoursPerDay: 24 },
  { id: 'bizFans', category: 'cooling', room: 'salesFloor', displayName: 'Fans', icon: 'fan', watts: 60, defaultCount: 2, defaultHoursPerDay: 10, maxHoursPerDay: 24 },
  { id: 'bizWater', category: 'water', room: 'backOfHouse', displayName: 'Water heating', icon: 'droplets', watts: 3000, defaultCount: 0, defaultHoursPerDay: 1, maxHoursPerDay: 6 },

  { id: 'bizSecurity', category: 'electronics', room: 'utility', displayName: 'Security cameras / alarm', icon: 'camera', watts: 25, defaultCount: 0, defaultHoursPerDay: 24, maxHoursPerDay: 24 },
  { id: 'officeComputer', category: 'electronics', room: 'office', displayName: 'Back-office computer', icon: 'laptop', watts: 110, defaultCount: 0, defaultHoursPerDay: 8, maxHoursPerDay: 24 },
  { id: 'kitchenEquip', category: 'other', room: 'backOfHouse', displayName: 'Kitchen equipment (F&B)', icon: 'flame', watts: 2500, defaultCount: 0, defaultHoursPerDay: 4, maxHoursPerDay: 14 },
]

export function libraryFor(mode: 'home' | 'biz'): ApplianceDef[] {
  return mode === 'home' ? HOUSEHOLD_LIBRARY : BUSINESS_LIBRARY
}

export function roomOrderFor(mode: 'home' | 'biz'): Room[] {
  return mode === 'home' ? HOUSEHOLD_ROOM_ORDER : BUSINESS_ROOM_ORDER
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
