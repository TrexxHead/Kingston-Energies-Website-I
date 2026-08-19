// Shared between the Storm prep dashboard (which needs completion % for the
// readiness score) and the /checklist subpage (which renders the items) —
// one definition so the two can never drift out of sync.

export const STORAGE_KEY = 'ke-storm-checklist'

export type ChecklistCategory = 'power' | 'light' | 'food' | 'records'

/**
 * When an item actually needs doing — not everything belongs on the same
 * flat list the day of. Early/logistics items don't compete for attention
 * with the things that only make sense right before (or during) an outage.
 */
export type ChecklistTiming = '5-7-days' | '72h' | '24h' | 'during'

export interface ChecklistItem {
  id: string
  text: string
  category: ChecklistCategory
  timing: ChecklistTiming
}

export const CHECKLIST: ChecklistItem[] = [
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

export function loadChecked(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return new Set(JSON.parse(raw))
  } catch { /* ignore */ }
  return new Set()
}

export function saveChecked(checked: Set<string>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...checked]))
  } catch { /* ignore */ }
}
