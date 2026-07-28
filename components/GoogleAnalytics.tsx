'use client'

import { useEffect, useState } from 'react'
import { GoogleAnalytics as NextGoogleAnalytics } from '@next/third-parties/google'
import { GA_MEASUREMENT_ID, isAnalyticsEnabled } from '@/lib/analytics'
import { CONSENT_EVENT, getStoredConsent, type Consent } from '@/lib/consent'

/**
 * Mounts the real GA4 script — or doesn't.
 *
 * Starts assuming `'unknown'` (nothing loads on first paint, matching the
 * existing cookie banner's own default), reads the stored choice once on
 * mount, and listens for the banner's consent-change event so accepting
 * mounts GA immediately, no reload needed. This is the strongest form of
 * "reject means no data": while consent is undecided or declined, GA's
 * script is never injected and no request to googletagmanager.com happens
 * at all — there's no tag to disable, because it was never there.
 */
export default function GoogleAnalytics() {
  const [consent, setConsent] = useState<Consent>('unknown')

  useEffect(() => {
    setConsent(getStoredConsent())
    const onChange = (e: Event) => setConsent((e as CustomEvent<Consent>).detail)
    window.addEventListener(CONSENT_EVENT, onChange)
    return () => window.removeEventListener(CONSENT_EVENT, onChange)
  }, [])

  if (!isAnalyticsEnabled() || consent !== 'granted') return null
  return <NextGoogleAnalytics gaId={GA_MEASUREMENT_ID} />
}
