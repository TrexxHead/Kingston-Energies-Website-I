/**
 * Storm Profile — a short, one-time onboarding capture (property type,
 * household size, whether backup power is already owned) used to tailor
 * which parts of Storm prep get emphasized. Browser-local only, same as
 * the Family Plan and My Resources pages — nothing here is sent to a
 * server or stored against the account.
 */

export type PropertyType = 'home' | 'business'

export interface StormProfile {
  propertyType: PropertyType | null
  householdSize: number | null
  hasBackupPower: boolean | null
  completedAt: string | null
}

export const EMPTY_PROFILE: StormProfile = {
  propertyType: null,
  householdSize: null,
  hasBackupPower: null,
  completedAt: null,
}

const STORAGE_KEY = 'ke-storm-profile'

export function loadProfile(): StormProfile {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return { ...EMPTY_PROFILE, ...JSON.parse(raw) }
  } catch { /* ignore */ }
  return EMPTY_PROFILE
}

export function saveProfile(profile: StormProfile): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profile))
  } catch { /* ignore */ }
}

export function isProfileComplete(profile: StormProfile): boolean {
  return profile.completedAt !== null
}
