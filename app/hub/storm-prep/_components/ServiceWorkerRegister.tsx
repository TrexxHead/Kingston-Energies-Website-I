'use client'

import { useEffect } from 'react'

/**
 * Registers the offline service worker the first time someone visits Storm
 * prep — not sitewide from first page load — so only people who've actually
 * engaged with outage prep pay the (small) cost of a background worker.
 */
export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // No offline support this session — the page still works online.
    })
  }, [])

  return null
}
