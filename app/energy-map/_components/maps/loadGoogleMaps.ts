import { GOOGLE_BROWSER_KEY } from './googleKeys'

/* eslint-disable @typescript-eslint/no-explicit-any */
declare global {
  interface Window {
    google?: any
    __keMapsReady?: () => void
    gm_authFailure?: () => void
  }
}

let loading: Promise<any> | null = null
let lastError: string | null = null

/**
 * Google reports why it refused a key only as a console message
 * ("Google Maps JavaScript API error: RefererNotAllowedMapError"), so we
 * note the error code as it's logged and pass the message through unchanged.
 */
function watchGoogleErrors() {
  if ((console.error as any).__keWatched) return
  const original = console.error.bind(console)
  const wrapped = (...args: unknown[]) => {
    for (const a of args) {
      const m = typeof a === 'string' ? a.match(/Google Maps JavaScript API error: (\w+)/) : null
      if (m) lastError = m[1]
    }
    original(...args)
  }
  ;(wrapped as any).__keWatched = true
  console.error = wrapped
}

/** The last Maps error code Google logged on this page (e.g. "RefererNotAllowedMapError"), if any. */
export const googleMapsErrorCode = () => lastError

/** What the site owner needs to change for each Google error code. */
export function googleMapsErrorHelp(code: string | null, host: string): string | null {
  switch (code) {
    case 'RefererNotAllowedMapError':
      return `this web address isn’t allowed on the Google key. In Google Cloud → Credentials → the browser key → Website restrictions, add ${host}/* (and https://*.vercel.app/* for previews).`
    case 'ApiNotActivatedMapError':
      return 'the Maps JavaScript API isn’t enabled on the Google Cloud project (APIs & Services → Library → Maps JavaScript API → Enable).'
    case 'ApiTargetBlockedMapError':
      return 'the key’s API restrictions don’t include the Maps JavaScript API — add it under the key’s API restrictions.'
    case 'BillingNotEnabledMapError':
      return 'billing isn’t turned on for the Google Cloud project.'
    case 'InvalidKeyMapError':
    case 'MissingKeyMapError':
      return 'the key isn’t valid — check NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY in Vercel (Production and Preview) and redeploy.'
    case 'ExpiredKeyMapError':
      return 'the key has expired or was deleted — create a new browser key and redeploy.'
    default:
      return code ? `Google reported ${code}.` : null
  }
}

/** Load the Google Maps JavaScript API once per page (shared by the Energy Map and the solar estimator). */
export function loadGoogleMaps(timeoutMs = 15_000): Promise<any> {
  if (window.google?.maps?.Map) return Promise.resolve(window.google)
  if (loading) return loading
  watchGoogleErrors()
  loading = new Promise((resolve, reject) => {
    const fail = (why: string) => {
      loading = null
      reject(new Error(why))
    }
    // A script that loads but never calls back (blocked, or a broken response) shouldn't spin for ever.
    const timer = setTimeout(() => fail('timeout'), timeoutMs)
    window.__keMapsReady = () => {
      clearTimeout(timer)
      resolve(window.google)
    }
    const s = document.createElement('script')
    s.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(GOOGLE_BROWSER_KEY)}&v=weekly&loading=async&libraries=marker&callback=__keMapsReady`
    s.async = true
    s.onerror = () => {
      clearTimeout(timer)
      fail('blocked')
    }
    document.head.appendChild(s)
  })
  return loading
}
