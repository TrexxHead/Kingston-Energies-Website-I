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

/** Load the Google Maps JavaScript API once per page (shared by the Energy Map and the solar estimator). */
export function loadGoogleMaps(): Promise<any> {
  if (window.google?.maps) return Promise.resolve(window.google)
  if (loading) return loading
  loading = new Promise((resolve, reject) => {
    window.__keMapsReady = () => resolve(window.google)
    const s = document.createElement('script')
    s.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(GOOGLE_BROWSER_KEY)}&v=weekly&loading=async&libraries=marker&callback=__keMapsReady`
    s.async = true
    s.onerror = () => {
      loading = null
      reject(new Error('maps failed'))
    }
    document.head.appendChild(s)
  })
  return loading
}
