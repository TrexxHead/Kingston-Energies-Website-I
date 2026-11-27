import { profileSchema, EMPTY_PROFILE, type EnergyProfile } from './profileSchema'

/**
 * Anonymous energy profile in this browser (backlog F03): a visitor gets a
 * useful result without registering, and it survives a refresh. Storage can
 * be unavailable (private mode, blocked site data) — every access is guarded
 * and the page still works for the session.
 */
const KEY = 'ke-energy-profile-v1'

export function loadLocalProfile(): EnergyProfile {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return EMPTY_PROFILE
    const parsed = profileSchema.safeParse(JSON.parse(raw))
    return parsed.success ? parsed.data : EMPTY_PROFILE
  } catch {
    return EMPTY_PROFILE
  }
}

export function saveLocalProfile(p: EnergyProfile): void {
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...p, updatedAt: new Date().toISOString() }))
  } catch {
    /* storage unavailable — keep working in memory */
  }
}

export function clearLocalProfile(): void {
  try {
    localStorage.removeItem(KEY)
  } catch {
    /* ignore */
  }
}
