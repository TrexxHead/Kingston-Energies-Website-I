'use client'

import 'maplibre-gl/dist/maplibre-gl.css'
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'
import { JAMAICA_BOUNDS, geometryBounds } from '@/lib/map/parishes'
import { buildOpenStyle, openMapSources, STATE_MARKER_COLOR } from '@/lib/map/openStyle'
import { muted } from '@/app/my-energy/_components/ui'
import type { MapViewHandle, MapViewProps } from './types'

/**
 * Kingston Energies' own map: MapLibre GL + OpenStreetMap data, no Google key.
 * Style and colours live in lib/map/openStyle.ts.
 */

const SOURCES = openMapSources({ tiles: process.env.NEXT_PUBLIC_OPEN_MAP_TILES_URL, glyphs: process.env.NEXT_PUBLIC_OPEN_MAP_GLYPHS_URL })
const PARISH_URL = '/maps/jamaica-parishes.geojson'
const ISLAND: [[number, number], [number, number]] = [
  [JAMAICA_BOUNDS.west, JAMAICA_BOUNDS.south],
  [JAMAICA_BOUNDS.east, JAMAICA_BOUNDS.north],
]
// Keep panning near the island.
const MAX_BOUNDS: [[number, number], [number, number]] = [
  [JAMAICA_BOUNDS.west - 1.2, JAMAICA_BOUNDS.south - 0.9],
  [JAMAICA_BOUNDS.east + 1.2, JAMAICA_BOUNDS.north + 0.9],
]

/* eslint-disable @typescript-eslint/no-explicit-any */
interface ParishFeature {
  properties: { id: string; name: string }
  geometry: { type: string; coordinates: unknown }
}

function markerEl(color: string, label: string, onClick: () => void): HTMLButtonElement {
  const b = document.createElement('button')
  b.type = 'button'
  b.setAttribute('aria-label', label)
  b.title = label
  b.className = 'ke-map-marker'
  Object.assign(b.style, {
    width: '22px',
    height: '22px',
    borderRadius: '50%',
    background: color,
    border: '3px solid #0d1714',
    boxShadow: '0 0 0 2px rgba(255,255,255,.85), 0 2px 8px rgba(0,0,0,.5)',
    cursor: 'pointer',
    padding: '0',
  })
  b.addEventListener('click', (e) => {
    e.stopPropagation()
    onClick()
  })
  return b
}

const KingstonMap = forwardRef<MapViewHandle, MapViewProps>(function KingstonMap({ stations, selected, onSelect, parish }, ref) {
  const el = useRef<HTMLDivElement>(null)
  const map = useRef<any>(null)
  const lib = useRef<any>(null)
  const parishes = useRef<ParishFeature[]>([])
  const markers = useRef(new Map<string, { marker: any; el: HTMLButtonElement }>())
  const selectedParish = useRef<string>('')
  const onSelectRef = useRef(onSelect)
  onSelectRef.current = onSelect
  const [state, setState] = useState<'loading' | 'ready' | 'failed'>('loading')
  const [detailDown, setDetailDown] = useState(false)

  useImperativeHandle(ref, () => ({
    focus: (p, zoom) => map.current?.flyTo({ center: [p.lng, p.lat], zoom }),
  }))

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const [ml, geo] = await Promise.all([import('maplibre-gl'), fetch(PARISH_URL).then((r) => (r.ok ? r.json() : Promise.reject(new Error('parishes'))))])
        if (cancelled || !el.current) return
        lib.current = ml
        parishes.current = geo.features
        ml.setWorkerUrl(`/maps/vendor/maplibre-${ml.getVersion()}/maplibre-gl-worker.mjs`)
        const m = new ml.Map({
          container: el.current,
          style: buildOpenStyle(SOURCES, geo),
          bounds: ISLAND,
          fitBoundsOptions: { padding: 16 },
          maxBounds: MAX_BOUNDS,
          attributionControl: { compact: true },
          cooperativeGestures: true,
          dragRotate: false,
          pitchWithRotate: false,
        })
        m.touchZoomRotate.disableRotation()
        m.addControl(new ml.NavigationControl({ showCompass: false }), 'top-right')
        m.on('error', (e: any) => {
          if (e?.sourceId === 'osm' || /tiles|glyph|font/i.test(String(e?.error?.message ?? ''))) setDetailDown(true)
        })
        m.on('load', () => !cancelled && setState('ready'))
        map.current = m
      } catch {
        if (!cancelled) setState('failed')
      }
    })()
    return () => {
      cancelled = true
      markers.current.forEach(({ marker }) => marker.remove())
      markers.current.clear()
      map.current?.remove()
      map.current = null
    }
  }, [])

  // Station markers — rebuilt when the filtered list changes.
  useEffect(() => {
    const ml = lib.current
    const m = map.current
    if (state !== 'ready' || !ml || !m) return
    markers.current.forEach(({ marker }) => marker.remove())
    markers.current.clear()
    for (const s of stations) {
      const label = `${s.name} — ${s.statusSummary}`
      const node = markerEl(STATE_MARKER_COLOR[s.markerState], label, () => onSelectRef.current(s.id))
      const marker = new ml.Marker({ element: node }).setLngLat([s.lng, s.lat]).addTo(m)
      markers.current.set(s.id, { marker, el: node })
    }
  }, [stations, state])

  // Highlight the selected station.
  useEffect(() => {
    markers.current.forEach(({ el: node }, id) => {
      const on = id === selected
      node.style.transform = on ? 'scale(1.35)' : ''
      node.style.zIndex = on ? '2' : ''
      node.setAttribute('aria-pressed', on ? 'true' : 'false')
    })
    const hit = selected ? markers.current.get(selected) : null
    if (hit && map.current) {
      const ll = hit.marker.getLngLat()
      if (!map.current.getBounds().contains(ll)) map.current.easeTo({ center: ll })
    }
  }, [selected, stations, state])

  // Frame and highlight the chosen parish.
  useEffect(() => {
    const m = map.current
    if (state !== 'ready' || !m) return
    if (selectedParish.current) m.setFeatureState({ source: 'parishes', id: selectedParish.current }, { selected: false })
    selectedParish.current = parish
    const f = parishes.current.find((p) => p.properties.id === parish)
    const b = f ? geometryBounds(f.geometry) : null
    if (f && b) {
      m.setFeatureState({ source: 'parishes', id: parish }, { selected: true })
      m.fitBounds([[b[0], b[1]], [b[2], b[3]]], { padding: 32, maxZoom: 12 })
    } else {
      m.fitBounds(ISLAND, { padding: 16 })
    }
  }, [parish, state])

  return (
    <div style={{ display: 'grid', gap: 8 }}>
      <div
        ref={el}
        role="region"
        aria-label="Kingston Energies map of Jamaica"
        style={{ width: '100%', height: 'min(60vh, 520px)', borderRadius: 20, overflow: 'hidden', background: '#0b2634' }}
      />
      {state === 'loading' && <p role="status" style={{ ...muted, margin: 0 }}>Loading map…</p>}
      {state === 'failed' && <p role="alert" style={{ ...muted, margin: 0 }}>This map couldn’t start in your browser. Every location below still has directions.</p>}
      {state === 'ready' && detailDown && SOURCES.tiles && (
        <p role="status" style={{ ...muted, margin: 0, fontSize: 12.5 }}>Street detail couldn’t load right now. Parish outlines and charger locations are still shown.</p>
      )}
    </div>
  )
})

export default KingstonMap
