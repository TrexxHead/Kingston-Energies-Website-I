'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { CircleCheck, Clock, CircleX, MessageCircle, CircleHelp, History, Navigation, LocateFixed, Search, Flag, Lock } from 'lucide-react'
import { PARISHES, COVERAGE_LABEL, JAMAICA_CENTER, type CoverageState } from '@/lib/map/parishes'
import { DISPLAY_LABEL, type DisplayState, type GroupStatus } from '@/lib/map/status'
import { card, label, input, muted, h2, Btn } from '@/app/my-energy/_components/ui'
import ReportForm from './ReportForm'
import { embedKey, embedSearchUrl, embedPlaceUrl, cleanKey, keyFingerprint } from '@/lib/map/embed'

interface Group {
  id?: string
  connectorType: string
  currentType?: string
  maxPowerKw: number | null
  count: number | null
  status: GroupStatus | null
}
interface Station {
  id: string
  name: string
  operator: { name: string; website: string | null; appInfo: string | null } | null
  parish: string
  address: string | null
  lat: number
  lng: number
  access: string
  accessNotes: string | null
  hours: string | null
  paymentNotes: string | null
  pricingNotes: string | null
  pricingObservedAt: string | null
  closed: boolean
  verifiedAt: string | null
  sources: { sourceName: string; sourceType: string; verifiedAt: string | null }[]
  connectorGroups: Group[]
  statusSummary: string
  googlePlaceId?: string | null
}
interface Coverage {
  verifiedLocations: number
  parishes: { parish: string; name: string; state: CoverageState; reviewedAt: string | null }[]
  lastReviewedAt: string | null
  statement: string
}
interface DiscoveredPlace {
  placeId: string
  name: string
  address: string | null
  lat: number
  lng: number
  googleMapsUri: string | null
  connectorGroups: (Group & { observation: unknown })[]
}

const STATE_ICON: Record<DisplayState, typeof CircleCheck> = {
  available_now: CircleCheck,
  in_use: Clock,
  out_of_service: CircleX,
  recently_reported_working: MessageCircle,
  status_unavailable: CircleHelp,
  status_may_be_outdated: History,
}
const STATE_COLOR: Record<DisplayState, string> = {
  available_now: 'var(--ke-green-400)',
  in_use: 'var(--ke-sun-300)',
  out_of_service: '#f6a5a5',
  recently_reported_working: 'var(--ke-blue-300)',
  status_unavailable: 'var(--ke-gray-400)',
  status_may_be_outdated: 'var(--ke-sun-300)',
}
const ACCESS_LABEL: Record<string, string> = { public: 'Public', customers_only: 'Customers only', restricted: 'Restricted', private: 'Private' }

const BROWSER_KEY = cleanKey(process.env.NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY)
const MAP_ID = process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID ?? ''
const EMBED_KEY = embedKey()

function StatusLine({ s }: { s: GroupStatus | null }) {
  if (!s) return <span style={muted}>Closed</span>
  const Icon = STATE_ICON[s.state]
  return (
    <span style={{ display: 'grid', gap: 2 }}>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: STATE_COLOR[s.state], fontWeight: 600, fontSize: 13 }}>
        <Icon size={15} aria-hidden /> {DISPLAY_LABEL[s.state]}
      </span>
      <span style={{ ...muted, fontSize: 12.5 }}>{s.detail}</span>
    </span>
  )
}

function directionsUrl(lat: number, lng: number) {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`
}

function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371
  const dLat = ((b.lat - a.lat) * Math.PI) / 180
  const dLng = ((b.lng - a.lng) * Math.PI) / 180
  const x = Math.sin(dLat / 2) ** 2 + Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(x))
}

/* eslint-disable @typescript-eslint/no-explicit-any */
declare global {
  interface Window {
    google?: any
    __keMapsReady?: () => void
    gm_authFailure?: () => void
  }
}

function loadMaps(): Promise<any> {
  if (window.google?.maps) return Promise.resolve(window.google)
  return new Promise((resolve, reject) => {
    window.__keMapsReady = () => resolve(window.google)
    const s = document.createElement('script')
    s.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(BROWSER_KEY)}&v=weekly&loading=async&libraries=marker&callback=__keMapsReady`
    s.async = true
    s.onerror = () => reject(new Error('maps failed'))
    document.head.appendChild(s)
  })
}

export default function EnergyMapClient() {
  const [stations, setStations] = useState<Station[]>([])
  const [coverage, setCoverage] = useState<Coverage | null>(null)
  const [loadError, setLoadError] = useState(false)
  const [loading, setLoading] = useState(true)
  const [parish, setParish] = useState('')
  const [connector, setConnector] = useState('')
  const [current, setCurrent] = useState('')
  const [minKw, setMinKw] = useState('')
  const [publicOnly, setPublicOnly] = useState(true)
  const [me, setMe] = useState<{ lat: number; lng: number } | null>(null)
  const [geoMsg, setGeoMsg] = useState<string | null>(null)
  const [selected, setSelected] = useState<string | null>(null)
  const [reporting, setReporting] = useState<{ stationId?: string; name?: string } | null>(null)
  const [embedFor, setEmbedFor] = useState<string | null>(null)
  const [mapState, setMapState] = useState<'off' | 'loading' | 'ready' | 'failed' | 'rejected'>(BROWSER_KEY ? 'loading' : 'off')
  const [discovered, setDiscovered] = useState<{ places: DiscoveredPlace[]; limitNote: string } | null>(null)
  const [discoverMsg, setDiscoverMsg] = useState<string | null>(null)
  const [discoverAvailable, setDiscoverAvailable] = useState(false)
  const mapEl = useRef<HTMLDivElement>(null)
  const map = useRef<any>(null)
  const markers = useRef<any[]>([])
  const discoverAbort = useRef<AbortController | null>(null)

  useEffect(() => {
    const qs = new URLSearchParams()
    if (parish) qs.set('parish', parish)
    if (connector) qs.set('connector', connector)
    if (current) qs.set('current', current)
    if (minKw) qs.set('minKw', minKw)
    if (publicOnly) qs.set('access', 'public')
    setLoading(true)
    fetch(`/api/map/stations?${qs}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => {
        setStations(d.stations)
        setCoverage(d.coverage)
        setLoadError(false)
      })
      .catch(() => setLoadError(true))
      .finally(() => setLoading(false))
  }, [parish, connector, current, minKw, publicOnly])

  const connectorOptions = useMemo(() => [...new Set(stations.flatMap((s) => s.connectorGroups.map((g) => g.connectorType)))].sort(), [stations])
  const sorted = useMemo(() => (me ? [...stations].sort((a, b) => distanceKm(me, a) - distanceKm(me, b)) : stations), [stations, me])

  // Interactive map — only with a configured, restricted browser key.
  useEffect(() => {
    if (!BROWSER_KEY || !mapEl.current || map.current) return
    // Google calls this global when it rejects the key (referrer restriction, API not enabled, billing).
    window.gm_authFailure = () => setMapState('rejected')
    loadMaps()
      .then((g) => {
        map.current = new g.maps.Map(mapEl.current, { center: JAMAICA_CENTER, zoom: 9, mapId: MAP_ID || undefined, streetViewControl: false, mapTypeControl: false })
        setMapState('ready')
        fetch('/api/map/discover')
          .then((r) => (r.ok ? r.json() : { configured: false }))
          .then((d) => setDiscoverAvailable(!!d.configured))
          .catch(() => setDiscoverAvailable(false))
      })
      .catch(() => setMapState('failed'))
  }, [])

  useEffect(() => {
    const g = window.google
    if (mapState !== 'ready' || !g) return
    markers.current.forEach((m) => (m.map !== undefined ? (m.map = null) : m.setMap?.(null)))
    markers.current = sorted.map((s) => {
      const opts = { position: { lat: s.lat, lng: s.lng }, map: map.current, title: `${s.name} — ${s.statusSummary}` }
      const m = MAP_ID && g.maps.marker?.AdvancedMarkerElement ? new g.maps.marker.AdvancedMarkerElement(opts) : new g.maps.Marker(opts)
      m.addListener?.('click', () => {
        setSelected(s.id)
        document.getElementById(`station-${s.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      })
      return m
    })
  }, [sorted, mapState])

  const nearby = useCallback(() => {
    if (!('geolocation' in navigator)) {
      setGeoMsg('Location is not available in this browser — choose a parish instead.')
      return
    }
    setGeoMsg('Finding your location…')
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const p = { lat: pos.coords.latitude, lng: pos.coords.longitude }
        setMe(p)
        setGeoMsg('Sorted by straight-line distance from you. Driving distance will differ — use Directions.')
        map.current?.setCenter(p)
        map.current?.setZoom(12)
      },
      () => setGeoMsg('Location permission was not given. Parish and area search still work.'),
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 300_000 },
    )
  }, [])

  async function searchArea() {
    const b = map.current?.getBounds?.()
    if (!b) return
    discoverAbort.current?.abort()
    const ctrl = new AbortController()
    discoverAbort.current = ctrl
    setDiscoverMsg('Searching this area…')
    try {
      const ne = b.getNorthEast()
      const sw = b.getSouthWest()
      const res = await fetch('/api/map/discover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bounds: { north: ne.lat(), east: ne.lng(), south: sw.lat(), west: sw.lng() } }),
        signal: ctrl.signal,
      })
      const data = await res.json()
      if (!res.ok) {
        setDiscoverMsg(data.error ?? 'Search failed.')
        return
      }
      setDiscovered({ places: data.places, limitNote: data.limitNote })
      setDiscoverMsg(null)
    } catch (e) {
      if ((e as Error).name !== 'AbortError') setDiscoverMsg('Search failed — verified locations are still listed.')
    }
  }

  return (
    <div style={{ display: 'grid', gap: 20 }}>
      {/* Coverage — what we actually know, not a completeness claim */}
      <section style={{ ...card, display: 'grid', gap: 10 }} aria-labelledby="coverage-title">
        <h2 id="coverage-title" style={h2}>What this map covers</h2>
        <p style={{ ...muted, margin: 0 }}>
          <strong style={{ color: '#fff' }}>{coverage?.verifiedLocations ?? 0}</strong> verified location{coverage?.verifiedLocations === 1 ? '' : 's'}.{' '}
          {coverage?.statement ?? ''} {coverage?.lastReviewedAt ? `Last coverage review: ${new Date(coverage.lastReviewedAt).toLocaleDateString('en-JM')}.` : 'Parish coverage reviews have not started yet.'}
        </p>
        {coverage && (
          <details>
            <summary style={{ cursor: 'pointer', color: 'var(--ke-green-400)', fontWeight: 600, fontSize: 14 }}>Coverage by parish</summary>
            <ul style={{ ...muted, columns: 2, paddingLeft: 18, marginTop: 8 }}>
              {coverage.parishes.map((p) => (
                <li key={p.parish}>
                  {p.name}: {COVERAGE_LABEL[p.state]}
                </li>
              ))}
            </ul>
          </details>
        )}
      </section>

      {/* Filters */}
      <section style={{ ...card, display: 'grid', gap: 12 }} aria-label="Filters">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 10, alignItems: 'end' }}>
          <div>
            <label htmlFor="f-parish" style={label}>Parish</label>
            <select id="f-parish" style={input} value={parish} onChange={(e) => setParish(e.target.value)}>
              <option value="">All parishes</option>
              {PARISHES.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="f-conn" style={label}>Connector</label>
            <select id="f-conn" style={input} value={connector} onChange={(e) => setConnector(e.target.value)}>
              <option value="">Any</option>
              {connectorOptions.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="f-cur" style={label}>AC / DC</label>
            <select id="f-cur" style={input} value={current} onChange={(e) => setCurrent(e.target.value)}>
              <option value="">Any</option>
              <option value="AC">AC</option>
              <option value="DC">DC (fast)</option>
            </select>
          </div>
          <div>
            <label htmlFor="f-kw" style={label}>Minimum kW</label>
            <input id="f-kw" inputMode="decimal" style={input} value={minKw} onChange={(e) => setMinKw(e.target.value.replace(/[^\d.]/g, ''))} />
          </div>
          <label style={{ ...muted, display: 'flex', gap: 8, alignItems: 'center' }}>
            <input type="checkbox" checked={publicOnly} onChange={(e) => setPublicOnly(e.target.checked)} /> Public access only
          </label>
        </div>
        <p style={{ ...muted, margin: 0, fontSize: 12.5 }}>Chargers missing a filtered detail stay in the list and are marked unknown rather than hidden.</p>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <Btn variant="ghost" onClick={nearby}>
            <LocateFixed size={14} aria-hidden /> Nearby
          </Btn>
          <Btn variant="ghost" onClick={() => setReporting({})}>
            <Flag size={14} aria-hidden /> Tell us about a missing charger
          </Btn>
          {geoMsg && <span role="status" style={muted}>{geoMsg}</span>}
        </div>
      </section>

      {reporting && <ReportForm stationId={reporting.stationId} stationName={reporting.name} onClose={() => setReporting(null)} />}

      {/* Map */}
      {mapState !== 'off' ? (
        <section aria-label="Map" style={{ display: 'grid', gap: 8 }}>
          <div ref={mapEl} style={{ width: '100%', height: 'min(60vh, 520px)', borderRadius: 20, overflow: 'hidden', background: 'var(--ke-dark-card)' }} />
          {mapState === 'failed' && <p role="alert" style={muted}>The map could not load. Every location below still has directions.</p>}
          {mapState === 'rejected' && (
            <p role="alert" style={muted}>
              Google refused the map key. If Google says the key is invalid, the value saved in the hosting settings doesn’t match the key in Google Cloud. If it says the site isn’t authorised, add this site to the key’s website restrictions and confirm the Maps JavaScript API and billing are enabled. Key this page received: {keyFingerprint(BROWSER_KEY)}. Every location below still has directions.
            </p>
          )}
          {mapState === 'ready' && discoverAvailable && (
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              <Btn variant="ghost" onClick={searchArea}>
                <Search size={14} aria-hidden /> Search this area with Google
              </Btn>
              {discoverMsg && <span role="status" style={muted}>{discoverMsg}</span>}
            </div>
          )}
        </section>
      ) : EMBED_KEY ? (
        <section aria-labelledby="google-embed-title" style={{ display: 'grid', gap: 8 }}>
          <h2 id="google-embed-title" style={{ ...h2, fontSize: 17 }}>
            Google Maps search{parish ? ` — ${PARISHES.find((p) => p.id === parish)?.name}` : ''}
          </h2>
          <iframe
            key={parish || 'all'}
            title={`Google Maps search for EV charging stations${parish ? ` in ${PARISHES.find((p) => p.id === parish)?.name}` : ' in Jamaica'}`}
            src={embedSearchUrl(EMBED_KEY, parish || null)}
            width="100%"
            height="460"
            style={{ border: 0, borderRadius: 20, background: 'var(--ke-dark-card)', display: 'block' }}
            loading="lazy"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
          />
          <p style={{ ...muted, margin: 0, fontSize: 12.5 }}>
            Results inside this map come from Google and are not yet verified by Kingston Energies. They don’t show live availability, and one search can miss chargers — check with the operator before you rely on one. Our verified locations are listed below.
          </p>
        </section>
      ) : (
        <p style={{ ...card, ...muted, margin: 0 }}>The interactive map is not switched on yet. The list below works on its own, with directions for every location.</p>
      )}

      {/* Registry list */}
      <section aria-labelledby="list-title" style={{ display: 'grid', gap: 12 }}>
        <h2 id="list-title" style={h2}>Verified locations</h2>
        {loading && <p style={muted}>Loading…</p>}
        {loadError && <p role="alert" style={muted}>Locations could not be loaded. Please try again.</p>}
        {!loading && !loadError && sorted.length === 0 && (
          <p style={{ ...card, ...muted, margin: 0 }}>
            No verified locations match{parish || connector || current || minKw ? ' these filters' : ' yet'}. We only list chargers we have confirmed from a named source, so this does not mean there are none — if you know one, tell us above.
          </p>
        )}
        {sorted.map((s) => (
          <article id={`station-${s.id}`} key={s.id} style={{ ...card, outline: selected === s.id ? '2px solid var(--ke-green-400)' : 'none' }} aria-labelledby={`st-${s.id}`}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
              <div>
                <h3 id={`st-${s.id}`} style={{ ...h2, fontSize: 18 }}>{s.name}</h3>
                <p style={{ ...muted, margin: '4px 0 0' }}>
                  {[s.operator?.name, PARISHES.find((p) => p.id === s.parish)?.name, s.address].filter(Boolean).join(' · ')}
                  {me ? ` · ${distanceKm(me, s).toFixed(1)} km away (straight line)` : ''}
                </p>
              </div>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, ...muted }}>
                {s.access !== 'public' && <Lock size={14} aria-hidden />} {ACCESS_LABEL[s.access] ?? s.access}
              </span>
            </div>
            <p style={{ margin: '10px 0', color: '#fff', fontWeight: 600, fontSize: 14 }}>{s.statusSummary}</p>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 10 }}>
              {s.connectorGroups.map((g, i) => (
                <li key={g.id ?? i} style={{ display: 'grid', gridTemplateColumns: 'minmax(140px,200px) 1fr', gap: 10 }}>
                  <span style={{ color: '#fff', fontSize: 13.5 }}>
                    {g.connectorType} {g.currentType ? `· ${g.currentType}` : ''}
                    <br />
                    <span style={muted}>
                      {g.maxPowerKw != null ? `up to ${g.maxPowerKw} kW` : 'power unknown'} · {g.count != null ? `${g.count} connector${g.count === 1 ? '' : 's'}` : 'count unknown'}
                    </span>
                  </span>
                  <StatusLine s={g.status} />
                </li>
              ))}
            </ul>
            {(s.accessNotes || s.hours || s.paymentNotes || s.pricingNotes) && (
              <dl style={{ ...muted, display: 'grid', gridTemplateColumns: 'max-content 1fr', gap: '4px 12px', margin: '12px 0 0' }}>
                {s.hours && (<><dt>Hours</dt><dd style={{ margin: 0 }}>{s.hours}</dd></>)}
                {s.accessNotes && (<><dt>Access</dt><dd style={{ margin: 0 }}>{s.accessNotes}</dd></>)}
                {s.paymentNotes && (<><dt>Payment</dt><dd style={{ margin: 0 }}>{s.paymentNotes}</dd></>)}
                {s.pricingNotes && (<><dt>Pricing</dt><dd style={{ margin: 0 }}>{s.pricingNotes}{s.pricingObservedAt ? ` (as of ${new Date(s.pricingObservedAt).toLocaleDateString('en-JM')})` : ''}</dd></>)}
              </dl>
            )}
            <p style={{ ...muted, fontSize: 12, margin: '10px 0 0' }}>
              Source: {s.sources.map((x) => x.sourceName).join(', ') || 'Kingston Energies registry'}
              {s.verifiedAt ? ` · verified ${new Date(s.verifiedAt).toLocaleDateString('en-JM')}` : ''}
            </p>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 12 }}>
              <a href={directionsUrl(s.lat, s.lng)} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--ke-green-400)', fontWeight: 600, fontSize: 14 }}>
                <Navigation size={14} aria-hidden /> Directions
              </a>
              {s.operator?.website && (
                <a href={s.operator.website} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--ke-green-400)', fontWeight: 600, fontSize: 14 }}>
                  Operator site
                </a>
              )}
              {mapState === 'off' && EMBED_KEY && (
                <button type="button" aria-expanded={embedFor === s.id} onClick={() => setEmbedFor(embedFor === s.id ? null : s.id)} style={{ background: 'none', border: 0, color: 'var(--ke-green-400)', cursor: 'pointer', fontSize: 14, fontWeight: 600, padding: 0 }}>
                  {embedFor === s.id ? 'Hide map' : 'Show map'}
                </button>
              )}
              <button type="button" onClick={() => setReporting({ stationId: s.id, name: s.name })} style={{ background: 'none', border: 0, color: 'var(--ke-dark-text-muted)', cursor: 'pointer', fontSize: 14, padding: 0 }}>
                Report a problem
              </button>
            </div>
            {embedFor === s.id && EMBED_KEY && (
              <iframe
                title={`Map of ${s.name}`}
                src={embedPlaceUrl(EMBED_KEY, s)}
                width="100%"
                height="280"
                style={{ border: 0, borderRadius: 14, marginTop: 12, display: 'block' }}
                loading="lazy"
                referrerPolicy="strict-origin-when-cross-origin"
              />
            )}
          </article>
        ))}
      </section>

      {/* Google results — visually and textually separate from the registry */}
      {discovered && (
        <section aria-labelledby="google-title" style={{ display: 'grid', gap: 12 }}>
          <h2 id="google-title" style={h2}>Google Maps results for this area</h2>
          <p style={{ ...muted, margin: 0 }}>{discovered.limitNote} These are not yet verified by Kingston Energies.</p>
          {discovered.places.length === 0 && <p style={muted}>Google returned no charging locations for this area.</p>}
          {discovered.places.map((p) => (
            <article key={p.placeId} style={{ ...card, borderStyle: 'dashed' }}>
              <h3 style={{ ...h2, fontSize: 17 }}>{p.name}</h3>
              {p.address && <p style={{ ...muted, margin: '4px 0 8px' }}>{p.address}</p>}
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 8 }}>
                {p.connectorGroups.map((g, i) => (
                  <li key={i} style={{ display: 'grid', gridTemplateColumns: 'minmax(140px,200px) 1fr', gap: 10 }}>
                    <span style={{ color: '#fff', fontSize: 13.5 }}>
                      {g.connectorType}
                      <br />
                      <span style={muted}>{g.maxPowerKw != null ? `up to ${g.maxPowerKw} kW` : 'power unknown'}</span>
                    </span>
                    <StatusLine s={g.status} />
                  </li>
                ))}
                {p.connectorGroups.length === 0 && <li style={muted}>No connector details returned.</li>}
              </ul>
              <div style={{ display: 'flex', gap: 12, marginTop: 10, alignItems: 'center' }}>
                <a href={p.googleMapsUri ?? directionsUrl(p.lat, p.lng)} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--ke-green-400)', fontWeight: 600, fontSize: 14 }}>
                  Open in Google Maps
                </a>
                <span style={{ ...muted, fontSize: 12 }}>Data: Google Maps</span>
              </div>
            </article>
          ))}
        </section>
      )}
    </div>
  )
}
