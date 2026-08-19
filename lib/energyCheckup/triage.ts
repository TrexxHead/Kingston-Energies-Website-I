import type { Category } from './applianceLibrary'

export type TriageTier = 'keep-running' | 'turn-off-first' | 'case-by-case'

export const TRIAGE_TIER_LABEL: Record<TriageTier, string> = {
  'keep-running': 'Keep running',
  'turn-off-first': 'Turn off first',
  'case-by-case': 'Case-by-case',
}

interface CategoryTriageMeta {
  tier: TriageTier
  guidance: string
}

/**
 * Which of the checkup's own categories to prioritise on limited backup
 * power during an outage — and which to shed first to stretch runtime.
 * Grounded in physical draw and urgency, not a Kingston Energies opinion:
 * refrigeration is food-safety-critical and comparatively cheap to run;
 * electronics covers the communication devices an outage makes most
 * important; lighting is cheap per hour; water heating and cooling are
 * consistently the largest loads in a Jamaican home (per JPS's own
 * guidance, already cited elsewhere on this page) and aren't urgent over a
 * short outage.
 */
export const CATEGORY_TRIAGE: Record<Category, CategoryTriageMeta> = {
  refrigeration: {
    tier: 'keep-running',
    guidance: 'Food safety depends on it, and it draws comparatively little for what it protects.',
  },
  electronics: {
    tier: 'keep-running',
    guidance: 'Phones, routers and communication devices matter most once the power is actually out.',
  },
  lighting: {
    tier: 'keep-running',
    guidance: 'LED lighting draws very little power for what it gives back.',
  },
  water: {
    tier: 'turn-off-first',
    guidance: 'One of the single biggest loads in most homes — not urgent to keep running during a short outage.',
  },
  cooling: {
    tier: 'turn-off-first',
    guidance: 'Air conditioning is typically the largest drain on backup power; fans are a much lighter alternative if you need airflow.',
  },
  other: {
    tier: 'case-by-case',
    guidance: 'Covers everything from a stove to a water pump — weigh each against how much runtime you can spare.',
  },
}

export interface TriageRow {
  category: Category
  kwh: number
  pct: number
  tier: TriageTier
  guidance: string
}

/**
 * Ranks the checkup's own category breakdown by triage priority during an
 * outage — no new appliance data, just re-reading what the checkup already
 * computed through a "what matters most on limited backup power" lens.
 */
export function triageCategories(categories: { category: string; kwh: number; pct: number }[]): TriageRow[] {
  return categories
    .filter((c): c is { category: Category; kwh: number; pct: number } => c.category in CATEGORY_TRIAGE)
    .map((c) => ({ ...c, ...CATEGORY_TRIAGE[c.category] }))
}
