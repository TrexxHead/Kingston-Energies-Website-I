'use client'

import { useEffect, useState } from 'react'
import { useReportWebVitals } from 'next/web-vitals'
import { reportWebVitals } from '@/lib/analytics'
import { CONSENT_EVENT, getStoredConsent, type Consent } from '@/lib/consent'

/**
 * Reports Core Web Vitals to GA4 — gated on consent the same way
 * GoogleAnalytics.tsx is, since this also sends data to Google. Measuring
 * page performance is still a form of analytics; "reject" has to cover it
 * too, not just the pageview tracker.
 */
export function WebVitals() {
  const [consent, setConsent] = useState<Consent>('unknown')

  useEffect(() => {
    setConsent(getStoredConsent())
    const onChange = (e: Event) => setConsent((e as CustomEvent<Consent>).detail)
    window.addEventListener(CONSENT_EVENT, onChange)
    return () => window.removeEventListener(CONSENT_EVENT, onChange)
  }, [])

  useReportWebVitals((metric) => {
    if (consent === 'granted') reportWebVitals(metric)
  })

  return null
}
