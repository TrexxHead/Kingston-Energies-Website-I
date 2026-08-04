import type { AcType, WaterType, LightType } from '@/lib/energyCheckup/applianceLibrary'

export type Mode = 'home' | 'biz'
export type FridgeAgeBand = '<5' | '5-10' | '10+'

export interface RowOverride {
  count: number
  hours: number
}

export interface CuState {
  mode: Mode | null
  stage: 0 | 1 | 2 | 3 | 4

  // Household context
  parish: string
  occupants: number
  homeType: string
  acType: AcType
  fridgeAgeBand: FridgeAgeBand
  waterType: WaterType
  lightType: LightType

  // Business context
  bizType: string
  backup: boolean

  // Appliance overrides, keyed by appliance id
  rows: Record<string, RowOverride>

  // The bill
  billKwh: string
  billJmd: string
  month: string

  // Business outage estimator
  revHour: string
  stops: string[]
}

export const INITIAL_STATE: CuState = {
  mode: null,
  stage: 0,
  parish: 'Kingston & St Andrew',
  occupants: 3,
  homeType: 'Detached house',
  acType: 'split',
  fridgeAgeBand: '5-10',
  waterType: 'tank',
  lightType: 'led',
  bizType: 'Retail shop',
  backup: false,
  rows: {},
  billKwh: '',
  billJmd: '',
  month: '',
  revHour: '',
  stops: [],
}

export interface CategoryResult {
  category: string
  kwh: number
  pct: number
}

export interface RateResult {
  rate: number
  source: 'bill' | 'reference'
}

export interface ApplianceResultDTO {
  id: string
  category: string
  kwh: number
}

export interface CheckupResults {
  id: string
  totalKwh: number
  categories: CategoryResult[]
  appliances: ApplianceResultDTO[]
  rate: RateResult
  calibration: { variance: number; withinBand: boolean } | null
  savings: { lowPct: number; highPct: number; lowJmd: number; highJmd: number }
  solar: { kw: number; costLow: number; costHigh: number; roofAreaM2: number; paybackYears: number; verdict: 'strong' | 'exploring' | 'efficiency-first' }
  benchmark: { verdict: 'below' | 'at' | 'above' | 'well-above'; typical: { low: number; high: number }; annualCost: number }
  outage: { low: number; high: number } | null
  tiers: {
    tier1: { icon: string; text: string }[]
    tier2: { icon: string; text: string }[]
    tier3: { icon: string; text: string }[]
  }
  contextualTip?: string
}
