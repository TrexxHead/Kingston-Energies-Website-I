'use client'

import { useEffect } from 'react'

/**
 * First-party operational telemetry — not analytics. Catches unhandled JS
 * errors and promise rejections anywhere on the site and beacons them to
 * /api/client-log, where they land on Settings → Logs alongside the admin
 * activity trail and deploy history. No third party ever sees this, no
 * cookie is set, and nothing here is gated by the analytics consent banner
 * (components/WebVitals.tsx) — this is site-health plumbing, the same
 * category as a server log file, not visitor tracking.
 */
export function ClientLogger() {
  useEffect(() => {
    const send = (level: 'ERROR', message: string, stack?: string) => {
      const body = JSON.stringify({ level, message: message.slice(0, 2000), stack: stack?.slice(0, 4000), path: location.pathname })
      try {
        if (navigator.sendBeacon) {
          navigator.sendBeacon('/api/client-log', new Blob([body], { type: 'application/json' }))
        } else {
          void fetch('/api/client-log', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, keepalive: true })
        }
      } catch {
        // A failed beacon is not worth a retry loop — the point is best-effort visibility, not guaranteed delivery.
      }
    }

    const onError = (e: ErrorEvent) => {
      send('ERROR', e.message || 'Unknown error', e.error?.stack)
    }
    const onRejection = (e: PromiseRejectionEvent) => {
      const reason = e.reason
      send('ERROR', reason instanceof Error ? reason.message : String(reason), reason instanceof Error ? reason.stack : undefined)
    }

    window.addEventListener('error', onError)
    window.addEventListener('unhandledrejection', onRejection)
    return () => {
      window.removeEventListener('error', onError)
      window.removeEventListener('unhandledrejection', onRejection)
    }
  }, [])

  return null
}
