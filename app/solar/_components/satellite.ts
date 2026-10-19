/* eslint-disable @typescript-eslint/no-explicit-any */
import { GOOGLE_BROWSER_KEY } from '@/app/energy-map/_components/maps/googleKeys'
import { loadGoogleMaps, googleMapsErrorCode, googleMapsErrorHelp } from '@/app/energy-map/_components/maps/loadGoogleMaps'
import { cleanKey } from '@/lib/map/embed'

/**
 * Satellite imagery for the solar estimator, from Apple (MapKit JS) or Google.
 * Both are wrapped in one small interface so the estimator doesn't care which
 * is showing. Labels, points of interest and 3D/45° views are all off — just
 * the roofs. Imagery is never copied out of either provider's map; our roof
 * outlines are drawn on top.
 */

export type Provider = 'apple' | 'google'
type LngLat = [number, number]

export interface SatelliteView {
  provider: Provider
  center(): { lat: number; lng: number }
  /** Web-mercator zoom (same scale as the Kingston map), so the two views can hand over. */
  zoom(): number
  moveTo(lat: number, lng: number, zoom: number): void
  setGestures(greedy: boolean): void
  drawShapes(roof: LngLat[] | null, draft: LngLat[]): void
  destroy(): void
}

export interface SatelliteOptions {
  el: HTMLElement
  lat: number
  lng: number
  zoom: number
  greedy: boolean
  onTap: (lng: number, lat: number, zoom: number) => void
  /** The provider refused the map after it was shown (bad token/key). */
  onRejected: (reason: string | null) => void
}

/** Apple's MapKit JS token: a domain-restricted token from the Apple Developer portal (public by design). */
export const MAPKIT_TOKEN = cleanKey(process.env.NEXT_PUBLIC_MAPKIT_TOKEN)

export const availableProviders = (): Provider[] => [...(MAPKIT_TOKEN ? (['apple'] as const) : []), ...(GOOGLE_BROWSER_KEY ? (['google'] as const) : [])]

export function createSatellite(provider: Provider, o: SatelliteOptions): Promise<SatelliteView> {
  return provider === 'apple' ? createApple(o) : createGoogle(o)
}

// ── Zoom ↔ span (both maps are web-mercator; Apple speaks in regions) ──
const TILE = 256
export const spanForZoom = (zoom: number, widthPx: number, heightPx: number, lat: number) => {
  const lngDelta = (360 * widthPx) / (TILE * 2 ** zoom)
  return { lngDelta, latDelta: lngDelta * (heightPx / Math.max(1, widthPx)) * Math.cos((lat * Math.PI) / 180) }
}
export const zoomForSpan = (lngDelta: number, widthPx: number) => Math.log2((360 * widthPx) / (TILE * Math.max(1e-9, lngDelta)))

// ── Apple ────────────────────────────────────────────────────────────────
declare global {
  interface Window {
    mapkit?: any
    __keMapKitReady?: (err?: unknown) => void
  }
}

let appleLoading: Promise<any> | null = null
let appleError: string | null = null

/** Load MapKit JS once (map + overlays libraries only), initialised with the site's token. */
export function loadMapKit(timeoutMs = 15_000): Promise<any> {
  if (window.mapkit?.Map) return Promise.resolve(window.mapkit)
  if (appleLoading) return appleLoading
  appleLoading = new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('timeout')), timeoutMs)
    window.__keMapKitReady = (err?: unknown) => {
      clearTimeout(t)
      if (err || !window.mapkit?.Map) return reject(new Error('load'))
      window.mapkit.addEventListener('error', (e: any) => (appleError = String(e?.status ?? 'error')))
      resolve(window.mapkit)
    }
    const s = document.createElement('script')
    s.src = 'https://cdn.apple-mapkit.com/mk/5.x.x/mapkit.core.js'
    s.crossOrigin = 'anonymous'
    s.async = true
    s.dataset.callback = '__keMapKitReady'
    s.dataset.libraries = 'map,overlays'
    s.dataset.token = MAPKIT_TOKEN
    s.dataset.language = 'en-JM'
    s.onerror = () => (clearTimeout(t), reject(new Error('blocked')))
    document.head.appendChild(s)
  }).catch((e) => {
    appleLoading = null
    throw e
  })
  return appleLoading
}

/** What the site owner needs to change for each MapKit error status. */
export function appleErrorHelp(status: string | null, host: string): string | null {
  switch (status) {
    case 'Unauthorized':
      return `Apple refused the MapKit token. In the Apple Developer portal → Maps → Tokens, check the token is a MapKit JS token, not expired or revoked, and that ${host} is in its allowed domains; then update NEXT_PUBLIC_MAPKIT_TOKEN and redeploy.`
    case 'Too Many Requests':
      return 'the daily MapKit allowance for this account has been used up.'
    default:
      return status ? `Apple reported “${status}”.` : null
  }
}

async function createApple(o: SatelliteOptions): Promise<SatelliteView> {
  const mk = await loadMapKit()
  appleError = null
  const w = o.el.clientWidth || 800
  const h = o.el.clientHeight || 600
  const span = spanForZoom(o.zoom, w, h, o.lat)
  const map = new mk.Map(o.el, {
    mapType: mk.Map.MapTypes.Satellite,
    region: new mk.CoordinateRegion(new mk.Coordinate(o.lat, o.lng), new mk.CoordinateSpan(span.latDelta, span.lngDelta)),
    showsPointsOfInterest: false,
    showsMapTypeControl: false,
    showsUserLocationControl: false,
    showsCompass: mk.FeatureVisibility.Hidden,
    showsScale: mk.FeatureVisibility.Adaptive,
    showsZoomControl: true,
    isRotationEnabled: false,
    // Panels are planned on a north-up, straight-down view.
    rotation: 0,
  })
  let shapes: any[] = []
  const zoomNow = () => zoomForSpan(map.region.span.longitudeDelta, o.el.clientWidth || w)
  map.addEventListener('single-tap', (e: any) => {
    const c = map.convertPointOnPageToCoordinate(e.pointOnPage)
    if (c) o.onTap(c.longitude, c.latitude, zoomNow())
  })
  const onError = (e: any) => o.onRejected(appleErrorHelp(String(e?.status ?? appleError ?? ''), window.location.origin))
  mk.addEventListener('error', onError)
  if (appleError) onError({ status: appleError })

  const style = (s: Record<string, unknown>) => new mk.Style(s)
  const coord = ([lng, lat]: LngLat) => new mk.Coordinate(lat, lng)
  return {
    provider: 'apple',
    center: () => ({ lat: map.center.latitude, lng: map.center.longitude }),
    zoom: zoomNow,
    moveTo(lat, lng, zoom) {
      const s = spanForZoom(zoom, o.el.clientWidth || w, o.el.clientHeight || h, lat)
      map.setRegionAnimated(new mk.CoordinateRegion(new mk.Coordinate(lat, lng), new mk.CoordinateSpan(s.latDelta, s.lngDelta)), false)
    },
    setGestures(greedy) {
      // MapKit has no "cooperative" mode; page scrolling over the map is left alone unless the map is full screen.
      map.isScrollEnabled = true
      map.isZoomEnabled = true
      o.el.style.touchAction = greedy ? 'none' : 'pan-y'
    },
    drawShapes(roof, draft) {
      if (shapes.length) map.removeOverlays(shapes)
      shapes = []
      if (roof) shapes.push(new mk.PolygonOverlay([roof.map(coord)], { enabled: false, style: style({ strokeColor: '#ffc83d', lineWidth: 2.5, fillColor: '#ffc83d', fillOpacity: 0.28 }) }))
      if (draft.length > 1) shapes.push(new mk.PolylineOverlay((draft.length > 2 ? [...draft, draft[0]] : draft).map(coord), { enabled: false, style: style({ strokeColor: '#4da3ff', lineWidth: 2 }) }))
      for (const p of draft) shapes.push(new mk.CircleOverlay(coord(p), 0.45, { enabled: false, style: style({ strokeColor: '#2f80ed', lineWidth: 2, fillColor: '#ffffff', fillOpacity: 1 }) }))
      if (shapes.length) map.addOverlays(shapes)
    },
    destroy() {
      mk.removeEventListener('error', onError)
      map.destroy()
    },
  }
}

// ── Google ───────────────────────────────────────────────────────────────

async function createGoogle(o: SatelliteOptions): Promise<SatelliteView> {
  window.gm_authFailure = () => {
    // Google logs the reason just before or after calling this.
    setTimeout(() => o.onRejected(googleMapsErrorHelp(googleMapsErrorCode(), window.location.origin)), 300)
  }
  const g = await loadGoogleMaps()
  const gm = new g.maps.Map(o.el, {
    center: { lat: o.lat, lng: o.lng },
    zoom: o.zoom,
    mapTypeId: 'satellite',
    tilt: 0,
    heading: 0,
    rotateControl: false,
    streetViewControl: false,
    mapTypeControl: false,
    fullscreenControl: false,
    clickableIcons: false,
    gestureHandling: o.greedy ? 'greedy' : 'cooperative',
  })
  clampToImagery(g, gm)
  gm.addListener('idle', () => clampToImagery(g, gm))
  gm.addListener('click', (e: any) => o.onTap(e.latLng.lng(), e.latLng.lat(), gm.getZoom()))
  const sh: { roof: any; draft: any; dots: any[] } = { roof: null, draft: null, dots: [] }
  const ll = ([lng, lat]: LngLat) => ({ lat, lng })
  return {
    provider: 'google',
    center: () => {
      const c = gm.getCenter()
      return { lat: c.lat(), lng: c.lng() }
    },
    zoom: () => gm.getZoom() ?? o.zoom,
    moveTo: (lat, lng, zoom) => gm.moveCamera({ center: { lat, lng }, zoom }),
    setGestures: (greedy) => gm.setOptions({ gestureHandling: greedy ? 'greedy' : 'cooperative' }),
    drawShapes(roof, draft) {
      sh.roof?.setMap(null)
      sh.draft?.setMap(null)
      sh.dots.forEach((d) => d.setMap(null))
      sh.roof = roof ? new g.maps.Polygon({ map: gm, paths: roof.map(ll), strokeColor: '#ffc83d', strokeWeight: 2.5, fillColor: '#ffc83d', fillOpacity: 0.28, clickable: false }) : null
      sh.draft = draft.length > 1 ? new g.maps.Polyline({ map: gm, path: (draft.length > 2 ? [...draft, draft[0]] : draft).map(ll), strokeColor: '#4da3ff', strokeWeight: 2, clickable: false }) : null
      sh.dots = draft.map((p) => new g.maps.Marker({ map: gm, position: ll(p), clickable: false, icon: { path: g.maps.SymbolPath.CIRCLE, scale: 5, fillColor: '#fff', fillOpacity: 1, strokeColor: '#2f80ed', strokeWeight: 2 } }))
    },
    destroy() {
      g.maps.event.clearInstanceListeners(gm)
      o.el.replaceChildren()
    },
  }
}

/**
 * Google has satellite imagery to a different depth in different places
 * (often z19–20 in Jamaica); past it, tiles read "no imagery". Ask Google how
 * deep it goes here and zoom back out to that.
 */
let maxZoomBusy = false
function clampToImagery(g: any, gm: any) {
  if (maxZoomBusy || !g?.maps?.MaxZoomService) return
  const at = gm.getCenter?.()
  if (!at) return
  maxZoomBusy = true
  new g.maps.MaxZoomService()
    .getMaxZoomAtLatLng(at)
    .then((r: any) => {
      if (r?.zoom && gm.getZoom() > r.zoom) gm.setZoom(r.zoom)
    })
    .catch(() => {})
    .finally(() => {
      maxZoomBusy = false
    })
}
