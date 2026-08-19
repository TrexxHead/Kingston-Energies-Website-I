// Shared between the Storm prep dashboard (which needs completion % for the
// readiness score) and the /checklist subpage (which renders the items) —
// one definition so the two can never drift out of sync.

export const STORAGE_KEY = 'ke-storm-checklist'

export type ChecklistCategory = 'power' | 'light' | 'food' | 'records'

export interface ChecklistItem {
  id: string
  text: string
  category: ChecklistCategory
}

export const CHECKLIST: ChecklistItem[] = [
  { id: 'powerbanks', text: 'Charge every power bank to 100%', category: 'power' },
  { id: 'station', text: 'Charge your power station (if you have one) to 100%', category: 'power' },
  { id: 'devices', text: 'Charge phones, laptops and any medical devices to 100%', category: 'power' },
  { id: 'light', text: 'Have a flashlight or lantern ready — don’t rely on a phone screen for hours of light', category: 'light' },
  { id: 'cables', text: 'Keep charging cables and adapters together in one bag, not scattered around the house', category: 'power' },
  { id: 'fridge', text: 'Set the fridge/freezer as cold as it goes now — it holds temperature far longer once the power cuts', category: 'food' },
  { id: 'unplug', text: 'Know what you’ll unplug first to stretch a power station’s runtime (AC and water heating first)', category: 'power' },
  { id: 'records', text: 'Save your order numbers and warranty info somewhere you can reach offline', category: 'records' },
]

export const CATEGORY_LABEL: Record<ChecklistCategory, string> = {
  power: 'Power & charging',
  light: 'Light',
  food: 'Food & cooling',
  records: 'Records',
}

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
