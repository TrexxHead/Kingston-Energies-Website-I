'use client'

import { useEffect, useRef, useState } from 'react'
import 'maplibre-gl/dist/maplibre-gl.css'
import { createKingstonMap, ISLAND } from '@/app/energy-map/_components/maps/mapSetup'
import { JAMAICA_PLACES } from '@/lib/storm/cone'

const JAMAICA_PLACE_COUNT = JAMAICA_PLACES.length

/* eslint-disable @typescript-eslint/no-explicit-any */
type Cone = { geojson: any; placesInCone: string[]; advisoryNumber: string | null; lastUpdate: string; attribution: string }

/**
 * NHC's forecast cone and track for one storm, drawn on our Jamaica map.
 * This is NHC's product as issued — not our forecast — and the caption says
 * so, along with NHC's own caution that impacts reach outside the cone.
 */
export default function StormConeMap({ id, name }: { id: string; name: string }) {
  const el = useRef<HTMLDivElement>(null)
  const [cone, setCone] = useState<Cone | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/storm/cone?id=${encodeURIComponent(id)}`)
      .then(async (r) => {
        const d = await r.json().catch(() => ({}))
        if (!r.ok) throw new Error(d.error ?? 'The forecast cone isn’t available.')
        setCone(d)
      })
      .catch((e) => setError(e.message))
  }, [id])

  useEffect(() => {
    if (!cone || !el.current) return
    let cancelled = false
    let map: any
    createKingstonMap(el.current, 'light', { maxBounds: null, cooperativeGestures: true }).then(({ ml, map: m }) => {
      if (cancelled) return m.remove()
      map = m
      m.addControl(new ml.NavigationControl({ showCompass: false }), 'top-right')
      m.on('load', () => {
        m.addSource('nhc', { type: 'geojson', data: cone.geojson })
        m.addLayer({ id: 'nhc-cone', type: 'fill', source: 'nhc', filter: ['==', ['get', 'kind'], 'cone'], paint: { 'fill-color': '#ffffff', 'fill-opacity': 0.55 } })
        m.addLayer({ id: 'nhc-cone-line', type: 'line', source: 'nhc', filter: ['==', ['get', 'kind'], 'cone'], paint: { 'line-color': '#c0392b', 'line-width': 2 } })
        m.addLayer({ id: 'nhc-track', type: 'line', source: 'nhc', filter: ['==', ['get', 'kind'], 'track'], paint: { 'line-color': '#1a1a1a', 'line-width': 2, 'line-dasharray': [2, 2] } })
        m.addLayer({ id: 'nhc-points', type: 'circle', source: 'nhc', filter: ['==', ['get', 'kind'], 'point'], paint: { 'circle-radius': 5, 'circle-color': '#ffffff', 'circle-stroke-color': '#1a1a1a', 'circle-stroke-width': 2 } })
        m.addLayer({ id: 'nhc-labels', type: 'symbol', source: 'nhc', filter: ['==', ['get', 'kind'], 'point'], layout: { 'text-field': ['get', 'label'], 'text-size': 11, 'text-offset': [0, 1.2], 'text-font': ['Noto Sans Regular'] }, paint: { 'text-color': '#1a1a1a', 'text-halo-color': '#ffffff', 'text-halo-width': 1.5 } })
        m.addLayer({ id: 'nhc-now', type: 'circle', source: 'nhc', filter: ['==', ['get', 'kind'], 'now'], paint: { 'circle-radius': 8, 'circle-color': '#c0392b', 'circle-stroke-color': '#ffffff', 'circle-stroke-width': 3 } })
        // Frame the cone together with Jamaica.
        const pts: number[][] = [ISLAND[0], ISLAND[1]]
        for (const f of cone.geojson.features) {
          const g = f.geometry
          if (g.type === 'Point') pts.push(g.coordinates)
          else if (g.type === 'LineString') pts.push(...g.coordinates)
          else if (g.type === 'Polygon') pts.push(...g.coordinates[0])
        }
        const lngs = pts.map((p) => p[0])
        const lats = pts.map((p) => p[1])
        m.fitBounds([[Math.min(...lngs), Math.min(...lats)], [Math.max(...lngs), Math.max(...lats)]], { padding: 32, duration: 0 })
      })
    })
    return () => {
      cancelled = true
      map?.remove()
    }
  }, [cone])

  if (error) return <p style={{ margin: 0, fontSize: 13, color: 'var(--ke-dark-text-muted)' }}>{error}</p>
  if (!cone) return <p style={{ margin: 0, fontSize: 13, color: 'var(--ke-dark-text-muted)' }}>Loading NHC’s forecast cone…</p>
  return (
    <div style={{ display: 'grid', gap: 8 }} data-testid="storm-cone">
      <div ref={el} role="region" aria-label={`NHC forecast cone for ${name}`} style={{ height: 'min(56vh, 420px)', borderRadius: 16, overflow: 'hidden', border: '1px solid rgba(255,255,255,.1)' }} />
      {cone.placesInCone.length > 0 && (
        <p style={{ margin: 0, fontSize: 13.5, color: '#f6c66b', fontWeight: 600 }}>
          {cone.placesInCone.length >= JAMAICA_PLACE_COUNT ? 'NHC’s cone currently covers all of Jamaica.' : `NHC’s cone currently covers part of Jamaica (${cone.placesInCone.join(', ')}).`} Follow the Meteorological Service for watches and warnings.
        </p>
      )}
      <p style={{ margin: 0, fontSize: 12, color: 'var(--ke-dark-text-muted)' }}>
        NHC forecast cone{cone.advisoryNumber ? ` (advisory ${cone.advisoryNumber})` : ''}: the white area is where the storm’s <strong>centre</strong> is likely to track; dashed line and dots are the forecast positions. Wind, rain and storm surge often reach well outside the cone. {cone.attribution}
      </p>
    </div>
  )
}
