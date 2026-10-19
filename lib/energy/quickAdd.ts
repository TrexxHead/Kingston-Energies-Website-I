import { HOUSEHOLD_LIBRARY } from '@/lib/energyCheckup/applianceLibrary'
import { newClientId, type ProfileDevice } from './profileSchema'

/**
 * One-tap starter equipment for /my-energy. Wattages and hours come from the
 * site's existing curated reference table (lib/energyCheckup/applianceLibrary)
 * and are ALWAYS marked basis "assumed", so results show the wide uncertainty
 * band until the customer replaces them with their own label or meter reading.
 * Nothing here is a product specification.
 */

export const QUICK_ADD_SOURCE = 'Typical value from the Kingston Energies reference table — replace with your label reading'

/** Assumed compressor duty cycle for a household fridge/freezer (mid-range of 35–60%). */
export const ASSUMED_FRIDGE_DUTY_PCT = 40

interface QuickItem {
  key: string
  libraryId: string
  name: string
  category: ProfileDevice['category']
  kind: 'steady' | 'cycling'
  motor?: boolean
  quantity?: number
}

export const QUICK_ITEMS: QuickItem[] = [
  { key: 'fridge', libraryId: 'fridge', name: 'Refrigerator', category: 'refrigeration', kind: 'cycling', motor: true },
  { key: 'freezer', libraryId: 'chestFreezer', name: 'Chest freezer', category: 'refrigeration', kind: 'cycling', motor: true },
  { key: 'router', libraryId: 'wifiRouter', name: 'Wi-Fi router', category: 'networking', kind: 'steady' },
  { key: 'fan', libraryId: 'fans', name: 'Fan', category: 'cooling', kind: 'steady', quantity: 1 },
  { key: 'lights', libraryId: 'lighting', name: 'LED lights', category: 'lighting', kind: 'steady' },
  { key: 'tv', libraryId: 'tv', name: 'TV', category: 'electronics', kind: 'steady' },
  { key: 'computer', libraryId: 'computers', name: 'Computer / laptop', category: 'electronics', kind: 'steady', quantity: 1 },
  { key: 'charging', libraryId: 'charging', name: 'Phone charging', category: 'electronics', kind: 'steady' },
  { key: 'cameras', libraryId: 'securityCameras', name: 'Security cameras', category: 'electronics', kind: 'steady', quantity: 1 },
  { key: 'pump', libraryId: 'pump', name: 'Water pump', category: 'motor', kind: 'steady', motor: true, quantity: 1 },
  { key: 'washer', libraryId: 'washer', name: 'Washing machine', category: 'motor', kind: 'steady', motor: true },
  { key: 'microwave', libraryId: 'microwave', name: 'Microwave', category: 'cooking', kind: 'steady', quantity: 1 },
]

const LED_WATTS = 9 // the reference table's LED value for "lit rooms"

export function quickAddDevice(key: string): ProfileDevice | null {
  const item = QUICK_ITEMS.find((i) => i.key === key)
  const lib = item && HOUSEHOLD_LIBRARY.find((a) => a.id === item.libraryId)
  if (!item || !lib) return null
  const watts = lib.watts ?? (lib.id === 'lighting' ? LED_WATTS : null)
  if (watts == null) return null
  const assumed = (value: number) => ({ value, basis: 'assumed' as const, source: QUICK_ADD_SOURCE })
  const load: ProfileDevice['load'] =
    item.kind === 'cycling'
      ? { kind: 'cycling', runningWatts: assumed(watts), dutyCyclePct: assumed(ASSUMED_FRIDGE_DUTY_PCT) }
      : { kind: 'steady', watts: assumed(watts), hoursPerDay: assumed(lib.defaultHoursPerDay) }
  return {
    clientId: newClientId('dev'),
    name: item.name,
    category: item.category,
    quantity: item.quantity ?? Math.max(1, lib.defaultCount),
    load,
    motorLoad: !!item.motor,
  }
}
