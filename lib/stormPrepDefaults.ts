// Shared, framework-agnostic Storm prep content — no 'use client', no
// server-only imports, safe to pull into both the client checklist pages
// and the server-side admin CMS module (lib/stormPrepContent.ts). These are
// the defaults an admin edit starts from and what every page falls back to
// if the database has never been written to (or is unreachable) — so the
// site's behavior never regresses just because nobody has opened the admin
// editor yet.

export type ChecklistCategory = 'power' | 'light' | 'food' | 'records'

/**
 * When an item actually needs doing — not everything belongs on the same
 * flat list the day of. Early/logistics items don't compete for attention
 * with the things that only make sense right before (or during) an outage.
 */
export type ChecklistTiming = '5-7-days' | '72h' | '24h' | 'during'

export interface StormChecklistItem {
  id: string
  text: string
  category: ChecklistCategory
  timing: ChecklistTiming
}

export const DEFAULT_CHECKLIST: StormChecklistItem[] = [
  { id: 'records', text: 'Save your order numbers and warranty info somewhere you can reach offline', category: 'records', timing: '5-7-days' },
  { id: 'cables', text: 'Keep charging cables and adapters together in one bag, not scattered around the house', category: 'power', timing: '5-7-days' },
  { id: 'light', text: 'Have a flashlight or lantern ready — don’t rely on a phone screen for hours of light', category: 'light', timing: '72h' },
  { id: 'powerbanks', text: 'Charge every power bank to 100%', category: 'power', timing: '24h' },
  { id: 'station', text: 'Charge your power station (if you have one) to 100%', category: 'power', timing: '24h' },
  { id: 'devices', text: 'Charge phones, laptops and any medical devices to 100%', category: 'power', timing: '24h' },
  { id: 'fridge', text: 'Set the fridge/freezer as cold as it goes now — it holds temperature far longer once the power cuts', category: 'food', timing: '24h' },
  { id: 'unplug', text: 'Know what you’ll unplug first to stretch a power station’s runtime (AC and water heating first)', category: 'power', timing: 'during' },
]

export const CATEGORY_LABEL: Record<ChecklistCategory, string> = {
  power: 'Power & charging',
  light: 'Light',
  food: 'Food & cooling',
  records: 'Records',
}

export const TIMING_LABEL: Record<ChecklistTiming, string> = {
  '5-7-days': '5–7 days out',
  '72h': '72 hours out',
  '24h': '24 hours out',
  during: 'During the storm',
}

// Render order for timeline sections — not alphabetical or definition order.
export const TIMING_ORDER: ChecklistTiming[] = ['5-7-days', '72h', '24h', 'during']

// The catalog's own picks for a storm kit — real product ids, no invented
// "kit" SKU. Admin-editable (see lib/stormPrepContent.ts); this is only the
// starting default.
export const DEFAULT_KIT_PRODUCT_IDS = ['pb10', 'st300', 'chcab']

export interface StormPrepContent {
  checklist: StormChecklistItem[]
  kitProductIds: string[]
}

export const DEFAULT_STORM_PREP_CONTENT: StormPrepContent = {
  checklist: DEFAULT_CHECKLIST,
  kitProductIds: DEFAULT_KIT_PRODUCT_IDS,
}
