'use client'

import 'maplibre-gl/dist/maplibre-gl.css'
import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react'
import { Plus, Minus, LocateFixed, Navigation2, Sun, Moon, Mountain, Maximize2, Minimize2, X, Navigation, List, Satellite } from 'lucide-react'
import { Protocol } from 'pmtiles'
import { JAMAICA_BOUNDS, geometryBounds } from '@/lib/map/parishes'
import { DISPLAY_LABEL } from '@/lib/map/status'
import { buildOpenStyle, openMapSources, stationMarkerState, STATE_MARKER_COLOR, POI_LAYERS, POI_LABEL, type MapTheme, type OpenMapSources, type PoiKind } from '@/lib/map/openStyle'
import { MAP_DATA } from '@/lib/map/mapData'
import { zoomForKind, type SearchHit } from '@/lib/map/search'
import MapSearch, { hitLabel } from './MapSearch'
import { clusterStations } from '@/lib/map/cluster'
import { addMapImages, stationPinSvg } from '@/lib/map/mapImages'
import type { MapViewHandle, MapViewProps } from './types'
import QuickReport from '../QuickReport'

/**
 * Kingston Energies' own map: MapLibre GL over self-hosted Jamaica data
 * (OpenStreetMap / Overture), no Google key and no third-party tile host.
 * Map style: lib/map/openStyle.ts. Icons: lib/map/mapImages.ts. Search:
 * MapSearch.tsx. The chrome (controls, legend, cards) is plain React/CSS below.
 */

const PARISH_URL = MAP_DATA.parishes
let protocolAdded = false

/** Hand-offs to the visitor's navigation app. */
export const googleDirections = (lat: number, lng: number) => `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`
export const wazeDirections = (lat: number, lng: number) => `https://waze.com/ul?ll=${lat},${lng}&navigate=yes`

interface PlaceInfo {
  name: string
  label: string
  lng: number
  lat: number
}
const THEME_KEY = 'ke-map-theme'
const ISLAND: [[number, number], [number, number]] = [
  [JAMAICA_BOUNDS.west, JAMAICA_BOUNDS.south],
  [JAMAICA_BOUNDS.east, JAMAICA_BOUNDS.north],
]
// Keep panning near the island — generous enough that a tall phone screen
// can still zoom out to the whole island.
const MAX_BOUNDS: [[number, number], [number, number]] = [
  [JAMAICA_BOUNDS.west - 2.5, JAMAICA_BOUNDS.south - 3],
  [JAMAICA_BOUNDS.east + 2.5, JAMAICA_BOUNDS.north + 3],
]
const LEGEND = [
  { label: 'Available', color: STATE_MARKER_COLOR.available },
  { label: 'Status unknown', color: STATE_MARKER_COLOR.status_unknown },
  { label: 'Out of service', color: STATE_MARKER_COLOR.out_of_service },
]

/* eslint-disable @typescript-eslint/no-explicit-any */
interface ParishFeature {
  properties: { id: string; name: string }
  geometry: { type: string; coordinates: unknown }
}

function storedTheme(): MapTheme {
  try {
    return localStorage.getItem(THEME_KEY) === 'dark' ? 'dark' : 'light'
  } catch {
    return 'light'
  }
}

function pinEl(color: string, label: string, onClick: () => void): HTMLButtonElement {
  // MapLibre positions the marker root with `transform`, so all visual
  // transforms (hover lift, selected scale) go on the inner element.
  const b = document.createElement('button')
  b.type = 'button'
  b.className = 'ke-pin'
  b.setAttribute('aria-label', label)
  b.setAttribute('aria-pressed', 'false')
  b.title = label
  const inner = document.createElement('span')
  inner.className = 'ke-pin__inner'
  inner.innerHTML = stationPinSvg(color)
  b.appendChild(inner)
  b.addEventListener('click', (e) => {
    e.stopPropagation()
    onClick()
  })
  return b
}

function clusterEl(count: number, color: string, onClick: () => void): HTMLButtonElement {
  const b = document.createElement('button')
  b.type = 'button'
  b.className = 'ke-cluster'
  b.setAttribute('aria-label', `${count} charging locations — zoom in`)
  b.style.setProperty('--ring', color)
  const inner = document.createElement('span')
  inner.className = 'ke-cluster__inner'
  inner.textContent = String(count)
  b.appendChild(inner)
  b.addEventListener('click', (e) => {
    e.stopPropagation()
    onClick()
  })
  return b
}

const KingstonMap = forwardRef<MapViewHandle, MapViewProps>(function KingstonMap({ stations, selected, onSelect, onShowDetails, parish, me, onLocate }, ref) {
  const wrap = useRef<HTMLDivElement>(null)
  const el = useRef<HTMLDivElement>(null)
  const map = useRef<any>(null)
  const lib = useRef<any>(null)
  const geo = useRef<any>(null)
  const markers = useRef(new Map<string, { marker: any; el: HTMLButtonElement }>())
  const meMarker = useRef<any>(null)
  const selectedParish = useRef<string>('')
  const onSelectRef = useRef(onSelect)
  onSelectRef.current = onSelect
  const [theme, setTheme] = useState<MapTheme>(storedTheme)
  const themeRef = useRef(theme)
  themeRef.current = theme
  const [satellite, setSatellite] = useState(false)
  const satRef = useRef(satellite)
  satRef.current = satellite
  const [state, setState] = useState<'loading' | 'ready' | 'failed'>('loading')
  const [detailDown, setDetailDown] = useState(false)
  const [is3D, setIs3D] = useState(false)
  const [bearing, setBearing] = useState(0)
  const [tilted, setTilted] = useState(false)
  const [fullscreen, setFullscreen] = useState(false)
  const [canFullscreen, setCanFullscreen] = useState(false)
  const [place, setPlace] = useState<PlaceInfo | null>(null)
  const sources = useRef<OpenMapSources | null>(null)
  const placeMarker = useRef<any>(null)

  const station = stations.find((s) => s.id === selected) ?? null

  useImperativeHandle(ref, () => ({
    focus: (p, zoom) => map.current?.flyTo({ center: [p.lng, p.lat], zoom, duration: 1400, essential: true }),
  }))

  // Create the map once.
  useEffect(() => {
    let cancelled = false
    setCanFullscreen(!!document.fullscreenEnabled)
    ;(async () => {
      try {
        const [ml, parishes] = await Promise.all([import('maplibre-gl'), fetch(PARISH_URL).then((r) => (r.ok ? r.json() : Promise.reject(new Error('parishes'))))])
        if (cancelled || !el.current) return
        lib.current = ml
        geo.current = parishes
        ml.setWorkerUrl(`/maps/vendor/maplibre-${ml.getVersion()}/maplibre-gl-worker.mjs`)
        if (!protocolAdded) {
          ml.addProtocol('pmtiles', new Protocol().tile)
          protocolAdded = true
        }
        sources.current = openMapSources(window.location.origin)
        const m = new ml.Map({
          container: el.current,
          style: buildOpenStyle(sources.current, parishes, themeRef.current),
          bounds: ISLAND,
          fitBoundsOptions: { padding: 24 },
          maxBounds: MAX_BOUNDS,
          maxPitch: 70,
          attributionControl: { compact: true },
          cooperativeGestures: true,
          fadeDuration: 200,
        })
        m.addControl(new ml.ScaleControl({ unit: 'metric', maxWidth: 90 }), 'bottom-right')
        m.on('styleimagemissing', () => addMapImages(m, satRef.current ? 'dark' : themeRef.current))
        m.on('error', (e: any) => {
          console.warn('[Kingston map]', e?.error?.message ?? e)
          if (e?.sourceId === 'jamaica' || /pmtiles/i.test(String(e?.error?.message ?? ''))) setDetailDown(true)
        })
        m.on('rotate', () => setBearing(m.getBearing()))
        m.on('pitch', () => setTilted(m.getPitch() > 1))
        // Tap a business or landmark for its card; tap empty map to close cards.
        m.on('click', (e: any) => {
          const f = m.queryRenderedFeatures(e.point, { layers: [...POI_LAYERS] })[0]
          onSelectRef.current(null)
          if (f) {
            const [lng, lat] = (f.geometry as any).coordinates
            const k = f.properties.kind as PoiKind
            const cat = String(f.properties.cat ?? '').replace(/_/g, ' ')
            setPlace({ name: f.properties.name, label: cat ? cat.replace(/\b\w/g, (x: string) => x.toUpperCase()) : POI_LABEL[k] ?? 'Place', lng, lat })
          } else setPlace(null)
        })
        for (const id of POI_LAYERS) {
          m.on('mouseenter', id, () => (m.getCanvas().style.cursor = 'pointer'))
          m.on('mouseleave', id, () => (m.getCanvas().style.cursor = ''))
        }
        m.on('load', () => {
          addMapImages(m, satRef.current ? 'dark' : themeRef.current)
          if (!cancelled) setState('ready')
        })
        map.current = m
      } catch {
        if (!cancelled) setState('failed')
      }
    })()
    const onFs = () => setFullscreen(document.fullscreenElement === wrap.current)
    document.addEventListener('fullscreenchange', onFs)
    return () => {
      cancelled = true
      document.removeEventListener('fullscreenchange', onFs)
      markers.current.forEach(({ marker }) => marker.remove())
      markers.current.clear()
      map.current?.remove()
      map.current = null
    }
  }, [])

  const applyTerrain = useCallback((on: boolean) => {
    const m = map.current
    if (!m) return
    m.setTerrain(on ? { source: 'terrain', exaggeration: 1.5 } : null)
    if (m.getLayer('building-3d')) m.setLayoutProperty('building-3d', 'visibility', on ? 'visible' : 'none')
    if (m.getLayer('building')) m.setLayoutProperty('building', 'visibility', on ? 'none' : 'visible')
  }, [])

  // Theme switch: swap the style in place and redraw theme-specific icons.
  const firstTheme = useRef(true)
  useEffect(() => {
    try {
      localStorage.setItem(THEME_KEY, theme)
    } catch {
      /* private mode — theme just won't persist */
    }
    if (firstTheme.current) {
      firstTheme.current = false
      return
    }
    const m = map.current
    if (!m || !geo.current || !sources.current) return
    m.setStyle(buildOpenStyle(sources.current, geo.current, theme, { satellite }), { diff: true })
    m.once('styledata', () => {
      addMapImages(m, satellite ? 'dark' : theme)
      applyTerrain(is3D)
      if (selectedParish.current) m.setFeatureState({ source: 'parishes', id: selectedParish.current }, { selected: true })
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theme, satellite])

  // Station pins, grouped into count bubbles where they would overlap
  // (re-grouped after every move; the selected station always shows as a pin).
  const stationsRef = useRef(stations)
  stationsRef.current = stations
  const selectedRef = useRef(selected)
  selectedRef.current = selected
  const renderPins = useCallback(() => {
    const ml = lib.current
    const m = map.current
    if (!ml || !m) return
    markers.current.forEach(({ marker }) => marker.remove())
    markers.current.clear()
    const list = stationsRef.current
    const groups = clusterStations(list, (s) => m.project([s.lng, s.lat]), selectedRef.current)
    for (const g of groups) {
      if (g.length === 1) {
        const s = g[0]
        const node = pinEl(STATE_MARKER_COLOR[s.markerState], `${s.name} — ${s.statusSummary}`, () => onSelectRef.current(s.id))
        const on = s.id === selectedRef.current
        node.setAttribute('aria-pressed', on ? 'true' : 'false')
        if (on) node.style.zIndex = '3'
        markers.current.set(s.id, { marker: new ml.Marker({ element: node, anchor: 'bottom' }).setLngLat([s.lng, s.lat]).addTo(m), el: node })
      } else {
        const best = stationMarkerState(g.map((s) => s.markerState))
        const node = clusterEl(g.length, STATE_MARKER_COLOR[best], () => {
          const lngs = g.map((s) => s.lng)
          const lats = g.map((s) => s.lat)
          m.fitBounds([[Math.min(...lngs), Math.min(...lats)], [Math.max(...lngs), Math.max(...lats)]], { padding: 90, maxZoom: 16, duration: 900 })
        })
        const lng = g.reduce((a, s) => a + s.lng, 0) / g.length
        const lat = g.reduce((a, s) => a + s.lat, 0) / g.length
        markers.current.set(`cluster:${g.map((s) => s.id).join(',')}`, { marker: new ml.Marker({ element: node }).setLngLat([lng, lat]).addTo(m), el: node })
      }
    }
  }, [])

  useEffect(() => {
    const m = map.current
    if (state !== 'ready' || !m) return
    renderPins()
    m.on('moveend', renderPins)
    return () => {
      m.off('moveend', renderPins)
    }
  }, [stations, state, renderPins])

  // Selected station: re-pin it and bring it into view clear of the card.
  useEffect(() => {
    const m = map.current
    if (state !== 'ready' || !m) return
    renderPins()
    const s = selected ? stationsRef.current.find((x) => x.id === selected) : null
    if (s) {
      const narrow = (wrap.current?.clientWidth ?? 800) < 600
      m.flyTo({ center: [s.lng, s.lat], zoom: Math.max(m.getZoom(), 13), offset: narrow ? [0, -110] : [170, 0], duration: 900, essential: true })
    }
  }, [selected, state, renderPins])

  // Frame and highlight the chosen parish.
  useEffect(() => {
    const m = map.current
    if (state !== 'ready' || !m) return
    if (selectedParish.current) m.setFeatureState({ source: 'parishes', id: selectedParish.current }, { selected: false })
    selectedParish.current = parish
    const f = (geo.current?.features as ParishFeature[] | undefined)?.find((p) => p.properties.id === parish)
    const b = f ? geometryBounds(f.geometry) : null
    if (f && b) {
      m.setFeatureState({ source: 'parishes', id: parish }, { selected: true })
      m.fitBounds([[b[0], b[1]], [b[2], b[3]]], { padding: 48, maxZoom: 12, duration: 1100 })
    } else {
      m.fitBounds(ISLAND, { padding: 24, duration: 1100 })
    }
  }, [parish, state])

  // "You are here" dot.
  useEffect(() => {
    const ml = lib.current
    const m = map.current
    if (state !== 'ready' || !ml || !m || !me) return
    if (!meMarker.current) {
      const dot = document.createElement('div')
      dot.className = 'ke-me'
      dot.setAttribute('role', 'img')
      dot.setAttribute('aria-label', 'Your location')
      meMarker.current = new ml.Marker({ element: dot }).setLngLat([me.lng, me.lat]).addTo(m)
    } else meMarker.current.setLngLat([me.lng, me.lat])
  }, [me, state])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && selected && onSelectRef.current(null)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [selected])

  function toggle3D() {
    const m = map.current
    if (!m) return
    const next = !is3D
    setIs3D(next)
    applyTerrain(next)
    m.easeTo(next ? { pitch: 62, bearing: -18, zoom: Math.max(m.getZoom(), 10.5), duration: 1200 } : { pitch: 0, bearing: 0, duration: 900 })
  }

  function resetNorth() {
    map.current?.easeTo({ bearing: 0, pitch: 0, duration: 700 })
    setIs3D(false)
    applyTerrain(false)
  }

  // Registry chargers are searchable alongside places.
  const chargerHits = useMemo<SearchHit[]>(
    () => stations.map((s) => ({ id: s.id, name: s.name, kind: 'charger', lng: s.lng, lat: s.lat, parish: null, category: s.subtitle || null })),
    [stations],
  )

  function pickHit(hit: SearchHit) {
    const m = map.current
    if (!m) return
    if (hit.kind === 'charger') {
      setPlace(null)
      onSelect(hit.id)
      return
    }
    onSelect(null)
    setPlace({ name: hit.name, label: hitLabel(hit), lng: hit.lng, lat: hit.lat })
    const narrow = (wrap.current?.clientWidth ?? 800) < 600
    m.flyTo({ center: [hit.lng, hit.lat], zoom: zoomForKind(hit.kind), offset: narrow ? [0, -90] : [170, 0], duration: 1600, essential: true })
  }

  // Red "dropped pin" for the place being looked at.
  useEffect(() => {
    const ml = lib.current
    const m = map.current
    placeMarker.current?.remove()
    placeMarker.current = null
    if (!place || !ml || !m) return
    const dot = document.createElement('div')
    dot.className = 'ke-drop'
    dot.setAttribute('aria-hidden', 'true')
    placeMarker.current = new ml.Marker({ element: dot, anchor: 'bottom' }).setLngLat([place.lng, place.lat]).addTo(m)
  }, [place])

  useEffect(() => {
    if (selected) setPlace(null)
  }, [selected])

  function toggleFullscreen() {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {})
    else wrap.current?.requestFullscreen().catch(() => {})
  }

  return (
    <div ref={wrap} className={`ke-map${fullscreen ? ' is-fs' : ''}`} data-theme={theme}>
      <style>{CSS}</style>
      <div ref={el} className="ke-map__canvas" role="region" aria-label="Kingston Energies map of Jamaica" />
      {state === 'loading' && <div className="ke-map__skeleton" role="status" aria-label="Loading map" />}

      {state === 'ready' && (
        <>
          <MapSearch chargers={chargerHits} onPick={pickHit} />

          <div className={`ke-map__legend ke-glass${station || place ? ' is-hidden' : ''}`} aria-label="Map key">
            {LEGEND.map((l) => (
              <span key={l.label}>
                <i style={{ background: l.color }} aria-hidden /> {l.label}
              </span>
            ))}
          </div>

          {stations.length === 0 && <p className="ke-map__chip ke-glass">No verified chargers listed here yet</p>}

          <div className="ke-map__controls">
            <div className="ke-ctrl-group ke-glass">
              <button type="button" className="ke-ctrl" aria-label="Zoom in" onClick={() => map.current?.zoomIn()}>
                <Plus size={18} aria-hidden />
              </button>
              <button type="button" className="ke-ctrl" aria-label="Zoom out" onClick={() => map.current?.zoomOut()}>
                <Minus size={18} aria-hidden />
              </button>
            </div>
            <div className="ke-ctrl-group ke-glass">
              <button type="button" className="ke-ctrl" aria-label="Show my location" onClick={onLocate}>
                <LocateFixed size={18} aria-hidden />
              </button>
              <button type="button" className="ke-ctrl" aria-label="3D view" aria-pressed={is3D} onClick={toggle3D}>
                <Mountain size={18} aria-hidden />
              </button>
              {MAP_DATA.satellite && (
                <button type="button" className="ke-ctrl" aria-label="Satellite view" aria-pressed={satellite} onClick={() => setSatellite(!satellite)}>
                  <Satellite size={18} aria-hidden />
                </button>
              )}
              <button type="button" className="ke-ctrl" aria-label={theme === 'dark' ? 'Light map' : 'Dark map'} disabled={satellite} onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
                {theme === 'dark' ? <Sun size={18} aria-hidden /> : <Moon size={18} aria-hidden />}
              </button>
              {canFullscreen && (
                <button type="button" className="ke-ctrl" aria-label={fullscreen ? 'Exit full screen' : 'Full screen'} onClick={toggleFullscreen}>
                  {fullscreen ? <Minimize2 size={17} aria-hidden /> : <Maximize2 size={17} aria-hidden />}
                </button>
              )}
            </div>
            {(tilted || Math.abs(bearing) > 0.5) && (
              <div className="ke-ctrl-group ke-glass">
                <button type="button" className="ke-ctrl" aria-label="Reset to north, flat view" onClick={resetNorth}>
                  <Navigation2 size={18} aria-hidden style={{ transform: `rotate(${-bearing}deg)`, transition: 'transform .1s', color: '#d9534f' }} />
                </button>
              </div>
            )}
          </div>

          {station && (
            <section key={station.id} className="ke-map__card ke-glass" aria-label={`${station.name} details`}>
              <button type="button" className="ke-card__close" aria-label="Close" onClick={() => onSelect(null)}>
                <X size={16} aria-hidden />
              </button>
              <h3 className="ke-card__title">{station.name}</h3>
              {station.subtitle && <p className="ke-card__sub">{station.subtitle}</p>}
              <p className="ke-card__status">
                <i style={{ background: STATE_MARKER_COLOR[station.markerState] }} aria-hidden />
                <span>
                  <strong>{DISPLAY_LABEL[station.markerState]}</strong>
                  {(() => {
                    // "Available: CCS" → "· CCS" (which connector groups); identical summaries add nothing.
                    const rest = station.statusSummary.replace(new RegExp(`^${DISPLAY_LABEL[station.markerState]}:?\\s*`), '')
                    return rest && rest !== station.statusSummary.trim() ? ` · ${rest}` : rest && station.statusSummary !== DISPLAY_LABEL[station.markerState] ? ` · ${station.statusSummary}` : ''
                  })()}
                </span>
              </p>
              {station.statusDetail && <p className="ke-card__sub ke-card__fine">{station.statusDetail}</p>}
              {station.connectorsLine && <p className="ke-card__sub">{station.connectorsLine}</p>}
              <QuickReport key={station.id} stationId={station.id} />
              <div className="ke-card__actions">
                <a className="ke-btn ke-btn--primary" href={station.directionsUrl} target="_blank" rel="noopener noreferrer">
                  <Navigation size={15} aria-hidden /> Directions
                </a>
                <a className="ke-btn" href={wazeDirections(station.lat, station.lng)} target="_blank" rel="noopener noreferrer">
                  Waze
                </a>
                <button type="button" className="ke-btn" onClick={() => onShowDetails(station.id)}>
                  <List size={15} aria-hidden /> Details
                </button>
              </div>
            </section>
          )}

          {place && !station && (
            <section key={`${place.lng},${place.lat}`} className="ke-map__card ke-glass" aria-label={`${place.name} details`}>
              <button type="button" className="ke-card__close" aria-label="Close" onClick={() => setPlace(null)}>
                <X size={16} aria-hidden />
              </button>
              <h3 className="ke-card__title">{place.name}</h3>
              <p className="ke-card__sub">{place.label}</p>
              <p className="ke-card__sub ke-card__fine">Map data: OpenStreetMap / Overture. Not a Kingston Energies charger listing.</p>
              <div className="ke-card__actions">
                <a className="ke-btn ke-btn--primary" href={googleDirections(place.lat, place.lng)} target="_blank" rel="noopener noreferrer">
                  <Navigation size={15} aria-hidden /> Directions
                </a>
                <a className="ke-btn" href={wazeDirections(place.lat, place.lng)} target="_blank" rel="noopener noreferrer">
                  Waze
                </a>
              </div>
            </section>
          )}
        </>
      )}

      {state === 'failed' && <p className="ke-map__chip ke-glass" role="alert">This map couldn’t start in your browser. Every location below still has directions.</p>}
      {state === 'ready' && detailDown && !station && !place && (
        <p className="ke-map__note ke-glass" role="status">
          Some map detail couldn’t load — parishes and chargers are still shown.
        </p>
      )}
    </div>
  )
})

export default KingstonMap

const CSS = `
.ke-map{position:relative;height:clamp(440px,72vh,760px);border-radius:24px;overflow:hidden;isolation:isolate;background:#a7d3ee;box-shadow:0 1px 0 rgba(255,255,255,.06) inset,0 18px 50px -20px rgba(0,0,0,.6);font-family:var(--font-body),system-ui,sans-serif}
.ke-map[data-theme=dark]{background:#0e2230}
.ke-map.is-fs{height:100vh;border-radius:0}
.ke-map[data-theme=light]{--g-bg:rgba(255,255,255,.82);--g-fg:#1f1f23;--g-muted:#5f5f66;--g-line:rgba(0,0,0,.08);--g-hover:rgba(0,0,0,.05);--g-shadow:0 8px 28px rgba(0,0,0,.16),0 1px 3px rgba(0,0,0,.08)}
.ke-map[data-theme=dark]{--g-bg:rgba(24,30,27,.78);--g-fg:#eef3f0;--g-muted:#a3aea8;--g-line:rgba(255,255,255,.09);--g-hover:rgba(255,255,255,.07);--g-shadow:0 8px 28px rgba(0,0,0,.45),0 1px 3px rgba(0,0,0,.3)}
.ke-map__canvas{position:absolute;inset:0}
.ke-glass{background:var(--g-bg);color:var(--g-fg);border:1px solid var(--g-line);box-shadow:var(--g-shadow);-webkit-backdrop-filter:blur(16px) saturate(1.7);backdrop-filter:blur(16px) saturate(1.7)}
.ke-map__skeleton{position:absolute;inset:0;background:linear-gradient(100deg,rgba(255,255,255,0) 30%,rgba(255,255,255,.35) 50%,rgba(255,255,255,0) 70%) #cfe3ee;background-size:200% 100%;animation:ke-shimmer 1.4s linear infinite}
.ke-map[data-theme=dark] .ke-map__skeleton{background-color:#14262f}
.ke-map__controls{position:absolute;top:14px;right:14px;display:grid;gap:10px;z-index:3}
.ke-ctrl-group{display:grid;border-radius:14px;overflow:hidden}
.ke-ctrl{width:42px;height:42px;display:grid;place-items:center;background:transparent;border:0;color:inherit;cursor:pointer;transition:background .15s,color .15s}
.ke-ctrl+.ke-ctrl{border-top:1px solid var(--g-line)}
.ke-ctrl:hover{background:var(--g-hover)}
.ke-ctrl[aria-pressed=true]{color:#5fae2e}
.ke-ctrl:focus-visible,.ke-btn:focus-visible,.ke-card__close:focus-visible,.ke-pin:focus-visible{outline:2px solid #29abe2;outline-offset:2px}
.ke-drop{width:22px;height:30px;background:no-repeat center/contain url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 22 30'%3E%3Cpath d='M11 29C11 29 2 17.5 2 10.5A9 9 0 0 1 20 10.5C20 17.5 11 29 11 29Z' fill='%23e5484d' stroke='white' stroke-width='2'/%3E%3Ccircle cx='11' cy='10.5' r='3.4' fill='white'/%3E%3C/svg%3E");filter:drop-shadow(0 3px 4px rgba(0,0,0,.35));animation:ke-drop .35s cubic-bezier(.2,.9,.3,1.3)}
@keyframes ke-drop{from{transform:translateY(-18px);opacity:0}to{transform:none;opacity:1}}
.ke-card__fine{font-size:11.5px;opacity:.85}
.ke-map__legend.is-hidden{display:none}
.ke-map__legend{position:absolute;left:14px;bottom:14px;z-index:2;display:flex;flex-wrap:wrap;gap:4px 14px;padding:8px 14px;border-radius:999px;font-size:12px;font-weight:500}
.ke-map__legend span{display:inline-flex;align-items:center;gap:6px;white-space:nowrap}
.ke-map__legend i,.ke-card__status i{width:9px;height:9px;border-radius:50%;display:inline-block;box-shadow:0 0 0 2px rgba(255,255,255,.7);flex:none}
.ke-map__chip{position:absolute;left:14px;top:72px;z-index:2;margin:0;padding:8px 16px;border-radius:999px;font-size:13px;font-weight:500;white-space:nowrap;max-width:calc(100% - 28px);overflow:hidden;text-overflow:ellipsis}
.ke-map__note{position:absolute;left:14px;bottom:58px;z-index:2;margin:0;padding:8px 14px;border-radius:12px;font-size:12.5px;max-width:calc(100% - 140px)}
.ke-map__card{position:absolute;left:14px;bottom:14px;z-index:3;width:min(360px,calc(100% - 28px));padding:18px 18px 16px;border-radius:22px;animation:ke-rise .32s cubic-bezier(.2,.8,.2,1)}
.ke-card__title{margin:0 28px 2px 0;font-family:var(--font-display),system-ui,sans-serif;font-size:18px;font-weight:700;letter-spacing:-.01em;line-height:1.25}
.ke-card__sub{margin:4px 0 0;font-size:13px;color:var(--g-muted);line-height:1.45}
.ke-card__status{display:flex;gap:9px;align-items:baseline;margin:10px 0 0;font-size:13.5px;line-height:1.45}
.ke-card__status i{transform:translateY(-1px)}
.ke-card__close{position:absolute;top:12px;right:12px;width:30px;height:30px;border-radius:50%;display:grid;place-items:center;border:0;background:var(--g-hover);color:inherit;cursor:pointer}
.ke-card__actions{display:flex;gap:8px;margin-top:14px}
.ke-map .ke-btn{flex:1;display:inline-flex;align-items:center;justify-content:center;gap:7px;height:40px;border-radius:12px;border:1px solid var(--g-line);background:var(--g-hover);color:inherit;font-size:14px;font-weight:600;cursor:pointer;text-decoration:none;transition:transform .12s,filter .12s}
.ke-btn:active{transform:scale(.97)}
.ke-map .ke-btn--primary,.ke-map .ke-btn--primary:visited,.ke-map .ke-btn--primary:hover{background:#2f80ed;border-color:transparent;color:#fff}
.ke-btn--primary:hover{filter:brightness(1.07)}
.ke-pin{display:block;padding:0;border:0;background:none;cursor:pointer;line-height:0}
.ke-pin__inner{display:block;transform-origin:50% 100%;transition:transform .2s cubic-bezier(.2,.8,.2,1);filter:drop-shadow(0 4px 5px rgba(0,0,0,.3))}
.ke-pin:hover .ke-pin__inner{transform:translateY(-2px) scale(1.06)}
.ke-pin[aria-pressed=true] .ke-pin__inner{transform:scale(1.28)}
.ke-cluster{display:block;padding:0;border:0;background:none;cursor:pointer}
.ke-cluster__inner{display:grid;place-items:center;min-width:40px;height:40px;padding:0 8px;border-radius:999px;background:var(--g-bg);color:var(--g-fg);font-weight:700;font-size:14px;box-shadow:0 0 0 3px var(--ring),0 6px 16px rgba(0,0,0,.28);-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px);transition:transform .18s cubic-bezier(.2,.8,.2,1)}
.ke-cluster:hover .ke-cluster__inner{transform:scale(1.08)}
.ke-cluster:focus-visible{outline:2px solid #29abe2;outline-offset:3px;border-radius:999px}
.ke-me{width:18px;height:18px;border-radius:50%;background:#2f80ed;border:3px solid #fff;box-shadow:0 0 0 1px rgba(0,0,0,.12),0 2px 6px rgba(0,0,0,.3);position:relative}
.ke-me::after{content:"";position:absolute;inset:-14px;border-radius:50%;background:rgba(47,128,237,.28);animation:ke-pulse 2.2s ease-out infinite;z-index:-1}
.ke-map .maplibregl-ctrl-bottom-right{display:flex;align-items:flex-end;gap:6px;padding:0 10px 10px 0}
.ke-map .maplibregl-ctrl-bottom-right .maplibregl-ctrl{margin:0}
.ke-map .maplibregl-ctrl-attrib{background:var(--g-bg);color:var(--g-muted);border-radius:10px;font-size:11px;-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px)}
.ke-map .maplibregl-ctrl-attrib a{color:inherit}
.ke-map .maplibregl-ctrl-attrib-button{background-color:transparent}
.ke-map .maplibregl-ctrl-scale{background:var(--g-bg);color:var(--g-fg);border:1.5px solid var(--g-muted);border-top:0;border-radius:0 0 4px 4px;font-size:10px;-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px)}
.ke-map .maplibregl-cooperative-gesture-screen{font-family:inherit;font-size:16px;font-weight:600;background:rgba(10,20,16,.45)}
@keyframes ke-rise{from{opacity:0;transform:translateY(14px) scale(.98)}to{opacity:1;transform:none}}
@keyframes ke-pulse{from{transform:scale(.35);opacity:1}to{transform:scale(1.25);opacity:0}}
@keyframes ke-shimmer{from{background-position:150% 0}to{background-position:-50% 0}}
@media (max-width:600px){
  .ke-map{height:clamp(420px,68vh,640px);border-radius:20px}
  .ke-map__legend{display:none}
  .ke-map__chip{top:70px;max-width:calc(100% - 84px)}
  .ke-map__card{left:0;right:0;bottom:0;width:auto;border-radius:22px 22px 0 0;padding-bottom:20px}
  .ke-map__note{bottom:46px;right:14px;max-width:none}
}
@media (prefers-reduced-motion:reduce){.ke-map *{animation:none!important;transition:none!important}}
`
