'use client'

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'
import { Search } from 'lucide-react'
import { PARISHES, JAMAICA_CENTER } from '@/lib/map/parishes'
import { embedSearchUrl, keyFingerprint } from '@/lib/map/embed'
import { muted, h2, card, Btn } from '@/app/my-energy/_components/ui'
import { GOOGLE_BROWSER_KEY, GOOGLE_EMBED_KEY, GOOGLE_MAP_ID } from './googleKeys'
import { loadGoogleMaps as loadMaps, googleMapsErrorCode, googleMapsErrorHelp } from './loadGoogleMaps'
import type { MapViewHandle, MapViewProps } from './types'

/**
 * The Google map: Maps JavaScript API when NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY is set,
 * otherwise the free Maps Embed API search. Google results are never stored.
 */

export interface DiscoveredResults {
  places: {
    placeId: string
    name: string
    address: string | null
    lat: number
    lng: number
    googleMapsUri: string | null
    connectorGroups: { connectorType: string; maxPowerKw: number | null; status: any }[]
  }[]
  limitNote: string
}

/* eslint-disable @typescript-eslint/no-explicit-any */
interface Props extends MapViewProps {
  onDiscovered: (r: DiscoveredResults) => void
}

const GoogleMapPanel = forwardRef<MapViewHandle, Props>(function GoogleMapPanel({ stations, onSelect, onShowDetails, parish, onDiscovered }, ref) {
  const [mapState, setMapState] = useState<'off' | 'loading' | 'ready' | 'failed' | 'rejected'>(GOOGLE_BROWSER_KEY ? 'loading' : 'off')
  const [discoverAvailable, setDiscoverAvailable] = useState(false)
  const [discoverMsg, setDiscoverMsg] = useState<string | null>(null)
  const mapEl = useRef<HTMLDivElement>(null)
  const map = useRef<any>(null)
  const markers = useRef<any[]>([])
  const discoverAbort = useRef<AbortController | null>(null)
  const onSelectRef = useRef(onSelect)
  onSelectRef.current = onSelect
  const onDetailsRef = useRef(onShowDetails)
  onDetailsRef.current = onShowDetails

  useImperativeHandle(ref, () => ({
    focus: (p, zoom) => {
      map.current?.setCenter(p)
      map.current?.setZoom(zoom)
    },
  }))

  useEffect(() => {
    if (!GOOGLE_BROWSER_KEY || !mapEl.current || map.current) return
    // Google calls this global when it rejects the key (referrer restriction, API not enabled, billing).
    window.gm_authFailure = () => setTimeout(() => setMapState('rejected'), 300) // after Google logs the reason
    loadMaps()
      .then((g) => {
        if (!mapEl.current) return
        map.current = new g.maps.Map(mapEl.current, { center: JAMAICA_CENTER, zoom: 9, mapId: GOOGLE_MAP_ID || undefined, streetViewControl: false, mapTypeControl: false })
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
    markers.current = stations.map((s) => {
      const opts = { position: { lat: s.lat, lng: s.lng }, map: map.current, title: `${s.name} — ${s.statusSummary}` }
      const m = GOOGLE_MAP_ID && g.maps.marker?.AdvancedMarkerElement ? new g.maps.marker.AdvancedMarkerElement(opts) : new g.maps.Marker(opts)
      m.addListener?.('click', () => {
        onSelectRef.current(s.id)
        onDetailsRef.current(s.id)
      })
      return m
    })
  }, [stations, mapState])

  useEffect(() => {
    if (mapState !== 'ready' || !map.current) return
    const p = PARISHES.find((x) => x.id === parish)
    map.current.setCenter(p ? p.center : JAMAICA_CENTER)
    map.current.setZoom(p ? 11 : 9)
  }, [parish, mapState])

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
      onDiscovered({ places: data.places, limitNote: data.limitNote })
      setDiscoverMsg(null)
    } catch (e) {
      if ((e as Error).name !== 'AbortError') setDiscoverMsg('Search failed — verified locations are still listed.')
    }
  }

  if (mapState !== 'off') {
    return (
      <div style={{ display: 'grid', gap: 8 }}>
        <div ref={mapEl} role="region" aria-label="Google map of Jamaica" style={{ width: '100%', height: 'min(60vh, 520px)', borderRadius: 20, overflow: 'hidden', background: 'var(--ke-dark-card)' }} />
        {mapState === 'failed' && <p role="alert" style={muted}>The Google map could not load. Every location below still has directions.</p>}
        {mapState === 'rejected' && (
          <p role="alert" style={muted}>
            Google refused the map key.{' '}
            {googleMapsErrorHelp(googleMapsErrorCode(), typeof window === 'undefined' ? '' : window.location.origin) ? <>Why: {googleMapsErrorHelp(googleMapsErrorCode(), window.location.origin)} </> : null}
            If Google says the key is invalid, the value saved in the hosting settings doesn’t match the key in Google Cloud. If it says the site isn’t authorised, add this site to the key’s website restrictions and confirm the Maps JavaScript API and billing are enabled. Key this page received: {keyFingerprint(GOOGLE_BROWSER_KEY)}. Every location below still has directions.
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
      </div>
    )
  }

  if (GOOGLE_EMBED_KEY) {
    const parishName = PARISHES.find((p) => p.id === parish)?.name
    return (
      <div style={{ display: 'grid', gap: 8 }}>
        <h3 style={{ ...h2, fontSize: 17 }}>Google Maps search{parishName ? ` — ${parishName}` : ''}</h3>
        <iframe
          key={parish || 'all'}
          title={`Google Maps search for EV charging stations${parishName ? ` in ${parishName}` : ' in Jamaica'}`}
          src={embedSearchUrl(GOOGLE_EMBED_KEY, parish || null)}
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
      </div>
    )
  }

  return <p style={{ ...card, ...muted, margin: 0 }}>The Google map is not switched on yet. The Kingston Energies map and the list below work without it.</p>
})

export default GoogleMapPanel
