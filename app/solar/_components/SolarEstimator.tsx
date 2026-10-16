'use client'

import 'maplibre-gl/dist/maplibre-gl.css'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { MousePointerClick, PenLine, Check, Undo2, X, Sun, Send, Maximize2, Minimize2, Satellite, Map as MapIcon } from 'lucide-react'
import { createKingstonMap } from '@/app/energy-map/_components/maps/mapSetup'
import MapSearch from '@/app/energy-map/_components/maps/MapSearch'
import { GOOGLE_BROWSER_KEY } from '@/app/energy-map/_components/maps/googleKeys'
import { loadGoogleMaps } from '@/app/energy-map/_components/maps/loadGoogleMaps'
import { zoomForKind, type SearchHit } from '@/lib/map/search'
import { PARISHES, parishAt } from '@/lib/map/parishes'
import { card, label, input, muted, h2, Btn, fmt } from '@/app/my-energy/_components/ui'
import {
  SOLAR_DEFAULTS,
  footprintAreaM2,
  sizeRoof,
  estimateProduction,
  estimateSavings,
  recommendSystem,
  aspectText,
  ROOF_TYPES,
  ROOF_LABEL,
  isSloped,
  type RoofType,
  type SpecificYield,
} from '@/lib/energy/engine/solar'
import { CALC_ENGINE_VERSION } from '@/lib/energy/engine/version'
import { useActiveRecord } from '@/lib/refdata/useRefData'
import { tariffFromPublic } from '@/lib/refdata/types'

/* eslint-disable @typescript-eslint/no-explicit-any */
interface Roof {
  geometry: { type: 'Polygon' | 'MultiPolygon'; coordinates: any }
  areaM2: number
  center: { lat: number; lng: number }
  parish: string | null
  source: 'map_footprint' | 'drawn'
}

const FACINGS: { label: string; aspect: number }[] = [
  { label: 'South', aspect: 0 },
  { label: 'South-east', aspect: -45 },
  { label: 'South-west', aspect: 45 },
  { label: 'East', aspect: -90 },
  { label: 'West', aspect: 90 },
  { label: 'North-east', aspect: -135 },
  { label: 'North-west', aspect: 135 },
  { label: 'North', aspect: 180 },
]
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const MIN_PICK_ZOOM = 15.5

function centroid(ring: [number, number][]) {
  const pts = ring.slice(0, ring.length > 1 && ring[0][0] === ring[ring.length - 1][0] && ring[0][1] === ring[ring.length - 1][1] ? -1 : undefined)
  return { lng: pts.reduce((a, p) => a + p[0], 0) / pts.length, lat: pts.reduce((a, p) => a + p[1], 0) / pts.length }
}
const outerRing = (g: Roof['geometry']): [number, number][] => (g.type === 'Polygon' ? g.coordinates[0] : g.coordinates[0][0])

export default function SolarEstimator() {
  const el = useRef<HTMLDivElement>(null)
  const map = useRef<any>(null)
  const parishes = useRef<any>(null)
  const [mapState, setMapState] = useState<'loading' | 'ready' | 'failed'>('loading')
  const [mode, setMode] = useState<'pick' | 'draw'>('pick')
  const modeRef = useRef(mode)
  modeRef.current = mode
  const [draft, setDraft] = useState<[number, number][]>([])
  const [roof, setRoof] = useState<Roof | null>(null)
  const [hint, setHint] = useState<string | null>(null)
  // Bigger map: a full-window overlay (works on phones too, unlike the Fullscreen API on iOS).
  const [full, setFull] = useState(false)
  // Satellite: Google's imagery (roof-level detail), in its own Google map. Roofs and outlines are
  // ours, drawn on top; Google imagery is never copied into the Kingston map.
  const [view, setView] = useState<'map' | 'satellite'>('map')
  const viewRef = useRef(view)
  viewRef.current = view
  const [gState, setGState] = useState<'off' | 'loading' | 'ready' | 'failed' | 'rejected'>('off')
  const gStateRef = useRef(gState)
  gStateRef.current = gState
  const gEl = useRef<HTMLDivElement>(null)
  const gMap = useRef<any>(null)
  const gShapes = useRef<{ roof: any; draft: any; dots: any[] }>({ roof: null, draft: null, dots: [] })

  // Roof settings and assumptions.
  const [roofType, setRoofType] = useState<RoofType>('flat')
  const [roofCondition, setRoofCondition] = useState<'good' | 'worn' | 'unsure'>('unsure')
  const [facing, setFacing] = useState(0)
  const [pitch, setPitch] = useState(String(SOLAR_DEFAULTS.pitchedTiltDeg))
  const [usablePct, setUsablePct] = useState('')
  const [moduleW, setModuleW] = useState(String(SOLAR_DEFAULTS.moduleWatts))
  const [moduleM2, setModuleM2] = useState(String(SOLAR_DEFAULTS.moduleAreaM2))
  const [lossPct, setLossPct] = useState(String(SOLAR_DEFAULTS.systemLossPct))

  // Solar resource.
  const [yieldState, setYieldState] = useState<{ status: 'idle' | 'loading' | 'ok' | 'error'; data?: SpecificYield; attribution?: string; error?: string }>({ status: 'idle' })

  // Savings.
  const [usage, setUsage] = useState('')
  const [daytimePct, setDaytimePct] = useState('40')
  const { record: tariffRecord } = useActiveRecord('tariff', 'residential')

  // ── Map ────────────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        if (!el.current) return
        const { ml, map: m, parishes: geo } = await createKingstonMap(el.current, 'light', { center: [-76.79, 18.01], zoom: 12, bounds: undefined })
        if (cancelled) return m.remove()
        parishes.current = geo
        m.addControl(new ml.NavigationControl({ showCompass: false }), 'bottom-right')
        m.on('load', () => {
          m.addSource('roof', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } })
          m.addLayer({ id: 'roof-fill', type: 'fill', source: 'roof', paint: { 'fill-color': '#f7b500', 'fill-opacity': 0.45 } })
          m.addLayer({ id: 'roof-line', type: 'line', source: 'roof', paint: { 'line-color': '#c07d00', 'line-width': 2.5 } })
          m.addSource('draft', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } })
          m.addLayer({ id: 'draft-line', type: 'line', source: 'draft', paint: { 'line-color': '#2f80ed', 'line-width': 2, 'line-dasharray': [2, 1] } })
          m.addLayer({ id: 'draft-pts', type: 'circle', source: 'draft', filter: ['==', ['geometry-type'], 'Point'], paint: { 'circle-radius': 5, 'circle-color': '#fff', 'circle-stroke-color': '#2f80ed', 'circle-stroke-width': 2 } })
          if (!cancelled) setMapState('ready')
        })
        m.on('mousemove', 'building', () => modeRef.current === 'pick' && (m.getCanvas().style.cursor = 'pointer'))
        m.on('mouseleave', 'building', () => (m.getCanvas().style.cursor = ''))
        m.on('click', (e: any) => {
          if (modeRef.current === 'draw') {
            setDraft((d) => [...d, [e.lngLat.lng, e.lngLat.lat]])
            return
          }
          if (m.getZoom() < MIN_PICK_ZOOM) {
            setHint('Zoom in until you can see your roof, then tap it.')
            m.easeTo({ center: e.lngLat, zoom: 17, duration: 900 })
            return
          }
          pickFeature(m.queryRenderedFeatures(e.point, { layers: ['building'] })[0])
        })
        map.current = m
      } catch {
        if (!cancelled) setMapState('failed')
      }
    })()
    return () => {
      cancelled = true
      map.current?.remove()
      map.current = null
    }
  }, [])

  // Show the chosen roof and the outline being drawn.
  useEffect(() => {
    const m = map.current
    if (mapState !== 'ready' || !m) return
    m.getSource('roof')?.setData({ type: 'FeatureCollection', features: roof ? [{ type: 'Feature', properties: {}, geometry: roof.geometry }] : [] })
  }, [roof, mapState])
  useEffect(() => {
    const m = map.current
    if (mapState !== 'ready' || !m) return
    const feats: any[] = draft.map((p) => ({ type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates: p } }))
    if (draft.length > 1) feats.push({ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: draft.length > 2 ? [...draft, draft[0]] : draft } })
    m.getSource('draft')?.setData({ type: 'FeatureCollection', features: feats })
  }, [draft, mapState])

  function pickFeature(f: any) {
    if (!f) {
      setHint('No building outline here — use “Draw my roof” and tap its corners.')
      return
    }
    const g = f.geometry as Roof['geometry']
    const c = centroid(outerRing(g))
    setHint(null)
    setRoof({ geometry: g, areaM2: footprintAreaM2(g), center: c, parish: parishes.current ? parishAt(parishes.current, c.lng, c.lat) : null, source: 'map_footprint' })
  }

  // ── Bigger map ─────────────────────────────────────────────────────────
  useEffect(() => {
    const m = map.current
    requestAnimationFrame(() => m?.resize())
    if (!full) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setFull(false)
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [full])
  useEffect(() => {
    gMap.current?.setOptions({ gestureHandling: full ? 'greedy' : 'cooperative' })
  }, [full, gState])

  // ── Satellite (Google) ─────────────────────────────────────────────────
  // Tapping a roof on the imagery uses OUR building outline at that spot: the
  // (hidden) Kingston map is moved there and asked which building is under it.
  const pickAt = useCallback(async (lng: number, lat: number, googleZoom: number) => {
    const m = map.current
    if (!m) return
    m.jumpTo({ center: [lng, lat], zoom: Math.max(16.5, googleZoom - 1) })
    await new Promise<void>((resolve) => {
      const t = setTimeout(resolve, 4000)
      m.once('idle', () => (clearTimeout(t), resolve()))
    })
    pickFeature(m.queryRenderedFeatures(m.project([lng, lat]), { layers: ['building'] })[0])
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function showSatellite() {
    setView('satellite')
    const m = map.current
    const c = m?.getCenter()
    const z = m ? Math.round(m.getZoom() + 1) : 17
    if (gMap.current) {
      if (c) gMap.current.moveCamera({ center: { lat: c.lat, lng: c.lng }, zoom: z })
      return
    }
    setGState('loading')
    window.gm_authFailure = () => setGState('rejected')
    try {
      const g = await loadGoogleMaps()
      if (gStateRef.current === 'rejected') return
      if (!gEl.current) return
      const gm = new g.maps.Map(gEl.current, {
        center: c ? { lat: c.lat, lng: c.lng } : { lat: 18.01, lng: -76.79 },
        zoom: z,
        mapTypeId: 'satellite',
        tilt: 0,
        heading: 0,
        rotateControl: false,
        streetViewControl: false,
        mapTypeControl: false,
        fullscreenControl: false,
        clickableIcons: false,
        gestureHandling: full ? 'greedy' : 'cooperative',
      })
      gm.addListener('click', (e: any) => {
        const lng = e.latLng.lng()
        const lat = e.latLng.lat()
        if (modeRef.current === 'draw') return setDraft((d) => [...d, [lng, lat]])
        if (gm.getZoom() < 17) {
          setHint('Zoom in until you can see your roof, then tap it.')
          gm.moveCamera({ center: { lat, lng }, zoom: 19 })
          return
        }
        pickAt(lng, lat, gm.getZoom())
      })
      gMap.current = gm
      setGState((st) => (st === 'rejected' ? st : 'ready'))
    } catch {
      setGState('failed')
    }
  }
  function showMap() {
    setView('map')
    const gm = gMap.current
    const m = map.current
    // A map Google refused (bad key) has no camera to hand back.
    const c = gState === 'ready' ? gm?.getCenter?.() : null
    if (c && m) m.jumpTo({ center: [c.lng(), c.lat()], zoom: (gm.getZoom() ?? 18) - 1 })
  }

  // Our roof and the outline being drawn, on top of the imagery.
  useEffect(() => {
    const g = window.google
    const gm = gMap.current
    if (gState !== 'ready' || !g || !gm) return
    const sh = gShapes.current
    sh.roof?.setMap(null)
    sh.draft?.setMap(null)
    sh.dots.forEach((d) => d.setMap(null))
    sh.dots = []
    const ll = ([lng, lat]: [number, number]) => ({ lat, lng })
    sh.roof = roof ? new g.maps.Polygon({ map: gm, paths: outerRing(roof.geometry).map(ll), strokeColor: '#ffc83d', strokeWeight: 2.5, fillColor: '#ffc83d', fillOpacity: 0.28, clickable: false }) : null
    sh.draft = draft.length > 1 ? new g.maps.Polyline({ map: gm, path: (draft.length > 2 ? [...draft, draft[0]] : draft).map(ll), strokeColor: '#4da3ff', strokeWeight: 2, clickable: false }) : null
    sh.dots = draft.map((p) => new g.maps.Marker({ map: gm, position: ll(p), clickable: false, icon: { path: g.maps.SymbolPath.CIRCLE, scale: 5, fillColor: '#fff', fillOpacity: 1, strokeColor: '#2f80ed', strokeWeight: 2 } }))
  }, [roof, draft, gState])

  const finishDraw = useCallback(() => {
    if (draft.length < 3) return setHint('Tap at least three corners of your roof.')
    const ring = [...draft, draft[0]]
    const g = { type: 'Polygon' as const, coordinates: [ring] }
    const c = centroid(ring)
    setRoof({ geometry: g, areaM2: footprintAreaM2(g), center: c, parish: parishes.current ? parishAt(parishes.current, c.lng, c.lat) : null, source: 'drawn' })
    setDraft([])
    setMode('pick')
    setHint(null)
  }, [draft])

  function pickSearch(hit: SearchHit) {
    map.current?.flyTo({ center: [hit.lng, hit.lat], zoom: Math.max(17, zoomForKind(hit.kind)), duration: viewRef.current === 'map' ? 1600 : 0, essential: true })
    if (viewRef.current === 'satellite') gMap.current?.moveCamera({ center: { lat: hit.lat, lng: hit.lng }, zoom: Math.max(18, zoomForKind(hit.kind) + 1) })
    setHint('Now tap your roof.')
  }

  // ── Solar resource (PVGIS) ─────────────────────────────────────────────
  const tilt = roofType === 'flat' ? SOLAR_DEFAULTS.flatTiltDeg : Math.min(60, Math.max(0, Number(pitch) || SOLAR_DEFAULTS.pitchedTiltDeg))
  // Flat roofs are racked facing south; pitched roofs face where the roof faces.
  const aspect = roofType === 'flat' ? 0 : facing
  const loss = Math.min(40, Math.max(0, Number(lossPct) || SOLAR_DEFAULTS.systemLossPct))
  useEffect(() => {
    if (!roof) return
    const ctrl = new AbortController()
    setYieldState({ status: 'loading' })
    const qs = new URLSearchParams({ lat: String(roof.center.lat), lng: String(roof.center.lng), tilt: String(tilt), aspect: String(aspect), loss: String(loss) })
    fetch(`/api/solar/yield?${qs}`, { signal: ctrl.signal })
      .then(async (r) => {
        const d = await r.json()
        if (!r.ok) throw new Error(d.error ?? 'Solar data unavailable.')
        setYieldState({ status: 'ok', data: d.yield, attribution: d.attribution })
      })
      .catch((e) => e.name !== 'AbortError' && setYieldState({ status: 'error', error: e.message }))
    return () => ctrl.abort()
  }, [roof, tilt, aspect, loss])

  // ── Engine ─────────────────────────────────────────────────────────────
  const sizing = useMemo(
    () =>
      roof
        ? sizeRoof({
            footprintM2: roof.areaM2,
            roofType,
            usableFraction: usablePct.trim() ? Number(usablePct) / 100 : undefined,
            moduleWatts: Number(moduleW),
            moduleAreaM2: Number(moduleM2),
          })
        : null,
    [roof, roofType, usablePct, moduleW, moduleM2],
  )
  const usageKwh = Number(usage)
  // With the household's use, size to that (capped by the roof); without it, show what the roof can hold.
  const recommendation = useMemo(
    () => (sizing?.ok && yieldState.status === 'ok' && yieldState.data && usage.trim() && usageKwh > 0 ? recommendSystem(sizing.value, yieldState.data, usageKwh, Number(moduleW) || SOLAR_DEFAULTS.moduleWatts) : null),
    [sizing, yieldState, usage, usageKwh, moduleW],
  )
  const system = recommendation?.ok ? { modules: recommendation.value.modules, kwp: recommendation.value.kwp } : sizing?.ok ? { modules: sizing.value.modules, kwp: sizing.value.kwp } : null
  const production = useMemo(() => (system && yieldState.status === 'ok' && yieldState.data ? estimateProduction(system.kwp, yieldState.data) : null), [system?.kwp, yieldState]) // eslint-disable-line react-hooks/exhaustive-deps
  const tariff = tariffRecord ? tariffFromPublic(tariffRecord) : null
  const savings = useMemo(
    () => (production?.ok && tariff && usage.trim() && usageKwh >= 0 ? estimateSavings(tariff, production.value, [usageKwh], Math.min(100, Math.max(0, Number(daytimePct))) / 100, new Date().toISOString().slice(0, 10)) : null),
    [production, tariff, usage, usageKwh, daytimePct],
  )

  const defaultUsable = Math.round((roofType === 'flat' ? SOLAR_DEFAULTS.usableFractionFlat : SOLAR_DEFAULTS.usableFractionPitched) * 100)
  const maxMonth = production?.ok ? Math.max(...production.value.monthlyKwh) : 0

  return (
    <div style={{ display: 'grid', gap: 20 }}>
      <style>{CSS}</style>
      <section className={`ke-solar-map${full ? ' is-full' : ''}`} aria-label="Choose your roof">
        <div ref={el} style={{ position: 'absolute', inset: 0, visibility: view === 'map' ? 'visible' : 'hidden' }} role="region" aria-label="Map — tap your roof" aria-hidden={view !== 'map'} />
        {view === 'satellite' && gState !== 'ready' && (
          <div className="ke-solar-gmsg" role="status">
            {gState === 'loading' ? 'Loading satellite imagery…' : gState === 'rejected' ? 'Google refused the map key, so satellite imagery isn’t available right now.' : 'Satellite imagery couldn’t load.'}
          </div>
        )}
        <div ref={gEl} style={{ position: 'absolute', inset: 0, visibility: view === 'satellite' ? 'visible' : 'hidden' }} role="region" aria-label="Satellite imagery — tap your roof" aria-hidden={view !== 'satellite'} />
        {mapState === 'ready' && (
          <>
            <div className="ke-solar-views">
              {GOOGLE_BROWSER_KEY && (
                <div className="ke-solar-seg" role="group" aria-label="Map style">
                  <button type="button" aria-pressed={view === 'map'} onClick={showMap}>
                    <MapIcon size={15} aria-hidden /> Map
                  </button>
                  <button type="button" aria-pressed={view === 'satellite'} onClick={showSatellite}>
                    <Satellite size={15} aria-hidden /> Satellite
                  </button>
                </div>
              )}
              <button type="button" className="ke-solar-full" onClick={() => setFull(!full)} aria-label={full ? 'Exit full screen' : 'Full screen map'} aria-pressed={full}>
                {full ? <Minimize2 size={16} aria-hidden /> : <Maximize2 size={16} aria-hidden />}
              </button>
            </div>
            <div data-theme="light">
              <MapSearch chargers={[]} onPick={pickSearch} />
            </div>
            <div className="ke-solar-tools">
              <button type="button" aria-pressed={mode === 'pick'} onClick={() => (setMode('pick'), setDraft([]))}>
                <MousePointerClick size={15} aria-hidden /> Tap my roof
              </button>
              <button type="button" aria-pressed={mode === 'draw'} onClick={() => (setMode('draw'), setHint('Tap each corner of your roof, then “Finish”.'))}>
                <PenLine size={15} aria-hidden /> Draw my roof
              </button>
              {mode === 'draw' && (
                <>
                  <button type="button" onClick={() => setDraft((d) => d.slice(0, -1))} disabled={!draft.length} aria-label="Undo last corner">
                    <Undo2 size={15} aria-hidden />
                  </button>
                  <button type="button" onClick={finishDraw} className="is-primary">
                    <Check size={15} aria-hidden /> Finish
                  </button>
                </>
              )}
            </div>
            {hint && (
              <p className="ke-solar-hint" role="status">
                {hint}
              </p>
            )}
          </>
        )}
        {mapState === 'loading' && <div className="ke-solar-skeleton" role="status" aria-label="Loading map" />}
        {mapState === 'failed' && <p className="ke-solar-hint" role="alert">The map couldn’t start in this browser.</p>}
      </section>

      {!roof && (
        <section style={{ ...card, display: 'grid', gap: 8 }}>
          <h2 style={h2}>How it works</h2>
          <ol style={{ ...muted, margin: 0, paddingLeft: 20, display: 'grid', gap: 4 }}>
            <li>Search your address or area, then zoom in.</li>
            <li>Tap your roof (or draw it if the outline is missing or wrong).</li>
            <li>Tell us the roof type — we estimate panels, yearly output from PVGIS solar data, and what it could save on your JPS bill.</li>
          </ol>
        </section>
      )}

      {roof && (
        <div className="ke-solar-grid">
          <section style={{ ...card, display: 'grid', gap: 14, alignContent: 'start' }} aria-labelledby="roof-title">
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'start' }}>
              <div>
                <h2 id="roof-title" style={h2}>Your roof</h2>
                <p style={{ ...muted, margin: '4px 0 0' }}>
                  ~{fmt(roof.areaM2, 0)} m² footprint · {roof.source === 'map_footprint' ? 'map building outline' : 'drawn by you'}
                  {roof.parish ? ` · ${PARISHES.find((p) => p.id === roof.parish)?.name}` : ''}
                </p>
              </div>
              <Btn variant="ghost" onClick={() => (setRoof(null), setYieldState({ status: 'idle' }))} ariaLabel="Choose a different roof">
                <X size={15} aria-hidden />
              </Btn>
            </div>
            <fieldset style={{ border: 0, padding: 0, margin: 0, display: 'grid', gap: 8 }}>
              <legend style={label}>Roof type</legend>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {ROOF_TYPES.map((t) => (
                  <button key={t} type="button" className="ke-chip" aria-pressed={roofType === t} onClick={() => setRoofType(t)}>
                    {ROOF_LABEL[t]}
                  </button>
                ))}
              </div>
            </fieldset>
            {roofType === 'zinc' && (
              <fieldset style={{ border: 0, padding: 0, margin: 0, display: 'grid', gap: 8 }}>
                <legend style={label}>What state is the zinc in?</legend>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {([['good', 'Good — no rust or leaks'], ['worn', 'Rusty or leaking'], ['unsure', 'Not sure']] as const).map(([v, t]) => (
                    <button key={v} type="button" className="ke-chip" aria-pressed={roofCondition === v} onClick={() => setRoofCondition(v)}>
                      {t}
                    </button>
                  ))}
                </div>
              </fieldset>
            )}
            <RoofNote type={roofType} condition={roofCondition} />
            {isSloped(roofType) && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label htmlFor="s-facing" style={label}>Best face points</label>
                  <select id="s-facing" style={input} value={facing} onChange={(e) => setFacing(Number(e.target.value))}>
                    {FACINGS.map((f) => (
                      <option key={f.label} value={f.aspect}>{f.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="s-pitch" style={label}>Roof pitch (°)</label>
                  <input id="s-pitch" style={input} inputMode="numeric" value={pitch} onChange={(e) => setPitch(e.target.value.replace(/[^\d.]/g, ''))} />
                </div>
              </div>
            )}
            <details>
              <summary style={{ cursor: 'pointer', color: 'var(--ke-green-400)', fontWeight: 600, fontSize: 14 }}>Assumptions you can change</summary>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(130px,1fr))', gap: 10, marginTop: 10 }}>
                <div>
                  <label htmlFor="s-usable" style={label}>Usable roof %</label>
                  <input id="s-usable" style={input} inputMode="numeric" placeholder={String(defaultUsable)} value={usablePct} onChange={(e) => setUsablePct(e.target.value.replace(/[^\d.]/g, ''))} />
                </div>
                <div>
                  <label htmlFor="s-mw" style={label}>Panel watts</label>
                  <input id="s-mw" style={input} inputMode="numeric" value={moduleW} onChange={(e) => setModuleW(e.target.value.replace(/[^\d.]/g, ''))} />
                </div>
                <div>
                  <label htmlFor="s-ma" style={label}>Panel area m²</label>
                  <input id="s-ma" style={input} inputMode="decimal" value={moduleM2} onChange={(e) => setModuleM2(e.target.value.replace(/[^\d.]/g, ''))} />
                </div>
                <div>
                  <label htmlFor="s-loss" style={label}>System losses %</label>
                  <input id="s-loss" style={input} inputMode="numeric" value={lossPct} onChange={(e) => setLossPct(e.target.value.replace(/[^\d.]/g, ''))} />
                </div>
              </div>
              <p style={{ ...muted, fontSize: 12.5, margin: '8px 0 0' }}>
                Usable share allows for edge setbacks, water tanks, AC units and row spacing ({SOLAR_DEFAULTS.usableFractionFlat * 100}% flat, {SOLAR_DEFAULTS.usableFractionPitched * 100}% zinc or sloped by default). Flat roofs are assumed racked at {SOLAR_DEFAULTS.flatTiltDeg}° facing south; on zinc and sloped roofs panels follow the roof.
              </p>
            </details>
          </section>

          <section style={{ ...card, display: 'grid', gap: 14, alignContent: 'start' }} aria-labelledby="result-title" aria-live="polite">
            <h2 id="result-title" style={h2}>Estimate</h2>
            {sizing && !sizing.ok && <p role="alert" style={muted}>{sizing.message}</p>}
            {sizing?.ok && system && (
              <>
                <div className="ke-stats">
                  <div>
                    <span>{system.modules}</span>
                    <small>panels</small>
                  </div>
                  <div>
                    <span>
                      {fmt(system.kwp, 1)}
                      <em> kWp</em>
                    </span>
                    <small>system size</small>
                  </div>
                  <div>
                    <span>
                      {production?.ok ? fmt(production.value.annualKwh.base / 12, 0) : '—'}
                      <em> kWh</em>
                    </span>
                    <small>per month (avg)</small>
                  </div>
                </div>
                <p style={{ ...muted, margin: 0, fontSize: 13 }}>
                  {recommendation?.ok
                    ? recommendation.value.limitedByRoof
                      ? `Your use needs about ${recommendation.value.neededModules} panels, but this roof fits ${sizing.value.modules} — the estimate uses all of them.`
                      : `Sized to your use. This roof could hold up to ${sizing.value.modules} panels (${fmt(sizing.value.kwp, 1)} kWp).`
                    : `The most this roof could hold. Enter your monthly kWh below to size a system to your use.`}
                </p>
              </>
            )}
            {yieldState.status === 'loading' && <p role="status" style={muted}>Getting solar data for this spot…</p>}
            {yieldState.status === 'error' && <p role="alert" style={muted}>{yieldState.error}</p>}
            {production?.ok && (
              <>
                <p style={{ ...muted, margin: 0 }}>
                  About <strong style={{ color: '#fff' }}>{fmt(production.value.annualKwh.low, 0)}–{fmt(production.value.annualKwh.high, 0)} kWh a year</strong> (typical {fmt(production.value.annualKwh.base, 0)}), roughly {fmt(production.value.annualKwh.base / 12, 0)} kWh a month, at {tilt}° facing {aspectText(aspect)}.
                </p>
                <figure style={{ margin: 0 }}>
                  <figcaption style={{ ...muted, fontSize: 12.5, marginBottom: 6 }}>Expected output by month (kWh)</figcaption>
                  <div className="ke-bars" role="img" aria-label={`Monthly output: ${production.value.monthlyKwh.map((v, i) => `${MONTHS[i]} ${Math.round(v)} kWh`).join(', ')}`}>
                    {production.value.monthlyKwh.map((v, i) => (
                      <div key={i} className="ke-bar" title={`${MONTHS[i]}: ${fmt(v, 0)} kWh`}>
                        <i style={{ height: `${maxMonth ? (v / maxMonth) * 100 : 0}%` }} />
                        <span>{MONTHS[i][0]}</span>
                        <b>{fmt(v, 0)} kWh</b>
                      </div>
                    ))}
                  </div>
                </figure>
                <ul style={{ ...muted, fontSize: 12.5, margin: 0, paddingLeft: 18 }}>
                  {[...(sizing?.ok ? sizing.assumptions : []), ...production.assumptions].map((a) => (
                    <li key={a.id}>{a.description}</li>
                  ))}
                  {production.warnings.map((w) => (
                    <li key={w}>{w}</li>
                  ))}
                </ul>
                {yieldState.attribution && <p style={{ ...muted, fontSize: 12, margin: 0 }}>Solar data: {yieldState.attribution}.</p>}
              </>
            )}
          </section>

          <section style={{ ...card, display: 'grid', gap: 12, alignContent: 'start' }} aria-labelledby="save-title">
            <h2 id="save-title" style={h2}>What it could save</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <label htmlFor="s-usage" style={label}>Your use (kWh / month)</label>
                <input id="s-usage" style={input} inputMode="numeric" placeholder="From your JPS bill" value={usage} onChange={(e) => setUsage(e.target.value.replace(/[^\d.]/g, ''))} />
              </div>
              <div>
                <label htmlFor="s-day" style={label}>Used in daytime %</label>
                <input id="s-day" style={input} inputMode="numeric" value={daytimePct} onChange={(e) => setDaytimePct(e.target.value.replace(/[^\d.]/g, ''))} />
              </div>
            </div>
            {tariffRecord === undefined ? (
              <p style={muted}>Checking the current JPS tariff…</p>
            ) : !tariff ? (
              <p style={{ ...muted, margin: 0 }}>
                Bill savings will appear here once the current JPS residential tariff has been entered and approved by our team. Until then we show output only — we don’t guess prices.
              </p>
            ) : !usage.trim() ? (
              <p style={{ ...muted, margin: 0 }}>Enter your monthly kWh (on your JPS bill) to see savings.</p>
            ) : savings && !savings.ok ? (
              <p role="alert" style={muted}>{savings.message}</p>
            ) : savings?.ok ? (
              <>
                <p style={{ ...muted, margin: 0 }}>
                  About <strong style={{ color: '#fff' }}>J${fmt(savings.value.annualDaytime, 0)}–{fmt(savings.value.annualUpper, 0)} a year</strong>. The lower figure counts only the electricity you use while the sun is up; the higher one assumes every solar kWh replaces one you’d buy (for example with batteries or net billing).
                </p>
                {savings.value.annualExcessKwh > 0 && <p style={{ ...muted, fontSize: 12.5, margin: 0 }}>The system could make about {fmt(savings.value.annualExcessKwh, 0)} kWh a year more than you use; its value depends on a JPS net-billing agreement and isn’t counted.</p>}
                <ul style={{ ...muted, fontSize: 12.5, margin: 0, paddingLeft: 18 }}>
                  {savings.assumptions.map((a) => (
                    <li key={a.id}>{a.description}</li>
                  ))}
                </ul>
                <p style={{ ...muted, fontSize: 13, margin: 0 }}>
                  {/* The lower, daytime-only saving — the cautious figure to plan repayments around. */}
                  <a href={`/financing?saving=${Math.round(savings.value.annualDaytime / 12)}`} style={{ color: 'var(--ke-green-400)', fontWeight: 600, textDecoration: 'none' }}>
                    See what financing would cost each month →
                  </a>
                </p>
              </>
            ) : null}
          </section>

          <QuoteForm roof={roof} roofType={roofType} roofCondition={roofType === 'zinc' ? roofCondition : null} sizing={system} annualKwh={production?.ok ? production.value.annualKwh.base : null} usage={usage.trim() ? usageKwh : null} />
        </div>
      )}
      <p style={{ ...muted, fontSize: 12 }}>
        Estimates use calculator version {CALC_ENGINE_VERSION}. Roof outlines © OpenStreetMap contributors / Overture Maps Foundation. A site visit confirms shading, roof condition and structure before any quote.
      </p>
    </div>
  )
}

/** What the roof type means for getting panels — plain guidance, no promises; the site visit decides. */
function RoofNote({ type, condition }: { type: RoofType; condition: 'good' | 'worn' | 'unsure' }) {
  const box = { margin: 0, padding: '12px 14px', borderRadius: 12, background: 'rgba(255,200,87,.07)', border: '1px solid rgba(255,200,87,.25)', fontSize: 13.5, lineHeight: 1.55, color: 'var(--ke-dark-text)' } as const
  if (type === 'flat')
    return <p style={box}>Panels sit on tilted frames fixed to the slab. If the slab leaks, it should be sealed first — panels make the roof harder to reach later.</p>
  if (type === 'pitched')
    return <p style={box}>Panels follow the slope on rails fixed into the rafters, with flashing so the roof stays watertight.</p>
  return (
    <div style={{ ...box, display: 'grid', gap: 6 }}>
      <p style={{ margin: 0 }}>
        <strong>Zinc roofs can take panels.</strong> The rails are fixed through the sheets into the purlins or rafters with sealed fasteners, so what really matters is the wood or steel underneath — it has to be sound, strong enough, and held down well enough for hurricane winds. An installer checks this on a site visit.
      </p>
      {condition === 'worn' && (
        <p style={{ margin: 0 }}>
          Rusty or leaking zinc is normally replaced <em>before</em> panels go on: once they’re up, re-roofing means taking them off first. Plan for new sheets as part of the job.
        </p>
      )}
      {condition === 'unsure' && <p style={{ margin: 0 }}>Not sure what shape it’s in? We’ll look at the sheets and the structure on the visit.</p>}
      <p style={{ margin: 0, color: 'var(--ke-dark-text-muted)' }}>
        Renting, or sharing the roof with neighbours? The owner has to agree before anything is fixed to it. If the roof can’t take panels, a{' '}
        <Link href="/shop?category=stations" style={{ color: 'var(--ke-green-400)', fontWeight: 600 }}>power station with portable solar panels</Link> needs no roof work.
      </p>
    </div>
  )
}

function QuoteForm({ roof, roofType, roofCondition, sizing, annualKwh, usage }: { roof: Roof; roofType: RoofType; roofCondition: 'good' | 'worn' | 'unsure' | null; sizing: { modules: number; kwp: number } | null; annualKwh: number | null; usage: number | null }) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [note, setNote] = useState('')
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [msg, setMsg] = useState<string | null>(null)

  async function send() {
    if (!sizing) return
    setState('sending')
    const res = await fetch('/api/solar/quote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        email,
        phone: phone || undefined,
        note: note || undefined,
        estimate: { lat: roof.center.lat, lng: roof.center.lng, parish: roof.parish, roofType, roofCondition, footprintM2: roof.areaM2, modules: sizing.modules, kwp: sizing.kwp, annualKwhBase: annualKwh, monthlyUsageKwh: usage, roofSource: roof.source },
      }),
    })
    const d = await res.json().catch(() => ({}))
    if (!res.ok) {
      setState('error')
      setMsg(d.error ?? 'Could not send.')
      return
    }
    setState('sent')
  }

  if (state === 'sent')
    return (
      <section style={{ ...card, display: 'grid', gap: 8 }} role="status">
        <h2 style={h2}>
          <Sun size={18} aria-hidden /> Request sent
        </h2>
        <p style={{ ...muted, margin: 0 }}>Thanks — our team will contact you to arrange a site visit and a firm quote.</p>
      </section>
    )
  return (
    <section style={{ ...card, display: 'grid', gap: 10, alignContent: 'start' }} aria-labelledby="quote-title">
      <h2 id="quote-title" style={h2}>Get a quote</h2>
      <p style={{ ...muted, margin: 0 }}>We’ll send this estimate to our team and arrange a site visit.</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 10 }}>
        <div>
          <label htmlFor="q-name" style={label}>Name</label>
          <input id="q-name" style={input} value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
        </div>
        <div>
          <label htmlFor="q-email" style={label}>E-mail</label>
          <input id="q-email" style={input} type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
        </div>
        <div>
          <label htmlFor="q-phone" style={label}>Phone (optional)</label>
          <input id="q-phone" style={input} type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" />
        </div>
      </div>
      <div>
        <label htmlFor="q-note" style={label}>Anything else? (optional)</label>
        <input id="q-note" style={input} value={note} onChange={(e) => setNote(e.target.value)} />
      </div>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <Btn onClick={send} disabled={!sizing || !name.trim() || !email.includes('@') || state === 'sending'}>
          <Send size={14} aria-hidden /> {state === 'sending' ? 'Sending…' : 'Request a quote'}
        </Btn>
        {msg && <span role="alert" style={muted}>{msg}</span>}
      </div>
    </section>
  )
}

const CSS = `
.ke-solar-map{position:relative;height:clamp(460px,72vh,820px);border-radius:24px;overflow:hidden;background:#a7d3ee;box-shadow:0 18px 50px -20px rgba(0,0,0,.6)}
.ke-solar-skeleton{position:absolute;inset:0;background:linear-gradient(100deg,rgba(255,255,255,0) 30%,rgba(255,255,255,.35) 50%,rgba(255,255,255,0) 70%) #cfe3ee;background-size:200% 100%;animation:ke-shimmer 1.4s linear infinite}
.ke-solar-tools{position:absolute;left:14px;bottom:14px;z-index:4;display:flex;gap:6px;flex-wrap:wrap;padding:6px;border-radius:16px;background:rgba(255,255,255,.88);box-shadow:0 8px 28px rgba(0,0,0,.18);-webkit-backdrop-filter:blur(14px);backdrop-filter:blur(14px)}
.ke-solar-tools button{display:inline-flex;align-items:center;gap:6px;height:38px;padding:0 12px;border-radius:11px;border:0;background:transparent;color:#1f1f23;font-weight:600;font-size:13.5px;cursor:pointer}
.ke-solar-tools button[aria-pressed=true]{background:#1f1f23;color:#fff}
.ke-solar-tools button.is-primary{background:#2f80ed;color:#fff}
.ke-solar-tools button:disabled{opacity:.4;cursor:default}
.ke-solar-hint{position:absolute;left:50%;transform:translateX(-50%);bottom:76px;z-index:4;margin:0;padding:8px 16px;border-radius:999px;background:rgba(31,31,35,.86);color:#fff;font-size:13.5px;font-weight:500;max-width:calc(100% - 28px);text-align:center}
.ke-solar-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,340px),1fr));gap:16px}
.ke-chip{height:36px;padding:0 14px;border-radius:999px;border:1px solid rgba(255,255,255,.2);background:transparent;color:var(--ke-dark-text);font-weight:600;font-size:13.5px;cursor:pointer}
.ke-chip[aria-pressed=true]{background:var(--ke-green-400);border-color:var(--ke-green-400);color:#0d1714}
.ke-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}
.ke-stats div{display:grid;gap:2px;padding:12px;border-radius:14px;background:rgba(255,255,255,.04);border:1px solid var(--ke-dark-hairline)}
.ke-stats span{font-family:var(--font-display);font-weight:800;font-size:22px;color:#fff;letter-spacing:-.02em;white-space:nowrap}
.ke-stats em{font-style:normal;font-size:13px;font-weight:600;color:var(--ke-dark-text-muted)}
.ke-stats small{color:var(--ke-dark-text-muted);font-size:12px}
.ke-bars{display:grid;grid-template-columns:repeat(12,1fr);gap:2px;height:140px;align-items:end;padding-top:18px}
.ke-bar{position:relative;display:grid;grid-template-rows:1fr auto;height:100%;align-items:end;cursor:default}
.ke-bar i{display:block;width:100%;background:var(--ke-green-400);border-radius:4px 4px 0 0;min-height:2px}
.ke-bar span{font-size:11px;color:var(--ke-dark-text-muted);text-align:center;padding-top:4px}
.ke-bar b{position:absolute;bottom:calc(100% + 2px);left:50%;transform:translateX(-50%);white-space:nowrap;font-size:11.5px;font-weight:600;color:#fff;background:#111e1a;border:1px solid var(--ke-dark-hairline);padding:3px 7px;border-radius:8px;opacity:0;pointer-events:none;transition:opacity .12s}
.ke-bar:hover b{opacity:1}
.ke-bar:hover i{filter:brightness(1.15)}

.ke-solar-map.is-full{position:fixed;inset:0;z-index:1000;height:auto;border-radius:0;box-shadow:none}
.ke-solar-views{position:absolute;top:14px;right:14px;z-index:5;display:flex;gap:8px;align-items:center}
.ke-solar-seg{display:flex;padding:4px;border-radius:14px;background:rgba(255,255,255,.9);box-shadow:0 8px 28px rgba(0,0,0,.18)}
.ke-solar-seg button{display:inline-flex;align-items:center;gap:6px;height:34px;padding:0 12px;border:0;border-radius:10px;background:transparent;color:#1f1f23;font-weight:600;font-size:13.5px;cursor:pointer}
.ke-solar-seg button[aria-pressed=true]{background:#1f1f23;color:#fff}
.ke-solar-full{display:grid;place-items:center;width:42px;height:42px;border:0;border-radius:14px;background:rgba(255,255,255,.9);color:#1f1f23;box-shadow:0 8px 28px rgba(0,0,0,.18);cursor:pointer}
.ke-solar-gmsg{position:absolute;inset:0;z-index:1;display:grid;place-items:center;background:#1b2a24;color:#fff;font-size:14px;padding:20px;text-align:center}
@media (max-width:600px){.ke-solar-views{top:66px;right:8px}}
@keyframes ke-shimmer{from{background-position:150% 0}to{background-position:-50% 0}}
@media (max-width:600px){.ke-solar-tools{left:8px;right:8px;bottom:8px;justify-content:center}.ke-solar-hint{bottom:70px}}
`
