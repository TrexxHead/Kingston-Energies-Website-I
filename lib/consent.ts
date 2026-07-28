/**
 * The single source of truth for the cookie consent decision.
 *
 * The site already has a working cookie banner (`components/CookieConsent.tsx`)
 * that stores the choice under this key — this file doesn't replace it, it
 * exposes that same decision to anything else that needs to know (analytics,
 * chiefly), and lets a component react the moment the visitor chooses, without
 * a page reload.
 */

export const CONSENT_KEY = 'ke-cookie-consent'
export const CONSENT_EVENT = 'ke-consent-change'

export type Consent = 'granted' | 'denied' | 'unknown'

/** Reads the stored choice. Never throws — storage can be unavailable (private browsing, SSR). */
export function getStoredConsent(): Consent {
  try {
    const raw = localStorage.getItem(CONSENT_KEY)
    if (raw === 'accepted') return 'granted'
    if (raw === 'declined') return 'denied'
  } catch {
    /* private browsing or SSR — treat as undecided */
  }
  return 'unknown'
}

/** Fired on `window` whenever the stored choice changes, so mounted components can react live. */
export function dispatchConsentChange(consent: Consent): void {
  try {
    window.dispatchEvent(new CustomEvent<Consent>(CONSENT_EVENT, { detail: consent }))
  } catch {
    /* no window (SSR) */
  }
}
