'use client'

import { useEffect, useRef } from 'react'
import 'maplibre-gl/dist/maplibre-gl.css'
import { createKingstonMap } from '@/app/energy-map/_components/maps/mapSetup'
import type { ShelterPoint } from './Shelters'

/* eslint-disable @typescript-eslint/no-explicit-any */
function fit(m: any, shelters: ShelterPoint[], duration: number) {
  if (!shelters.length) return
  const lngs = shelters.map((s) => s.lng as number)
  const lats = shelters.map((s) => s.lat as number)
  m.fitBounds([[Math.min(...lngs), Math.min(...lats)], [Math.max(...lngs), Math.max(...lats)]], { padding: 48, maxZoom: 13, duration })
}

/** Shelters on the self-hosted Kingston map (only those with coordinates). */
export default function ShelterMap({ shelters }: { shelters: ShelterPoint[] }) {
  const el = useRef<HTMLDivElement>(null)
  const mapRef = useRef<any>(null)
  // The latest shelters, for the load handler (the filter may change before the map is ready).
  const shelterRef = useRef(shelters)
  shelterRef.current = shelters
  const dataRef = useRef<any>(null)
  const data: any = {
    type: 'FeatureCollection',
    features: shelters.map((s) => ({ type: 'Feature', properties: { name: s.name, parish: s.parish }, geometry: { type: 'Point', coordinates: [s.lng, s.lat] } })),
  }

  dataRef.current = data

  useEffect(() => {
    let cancelled = false
    let map: any
    if (!el.current) return
    createKingstonMap(el.current, 'light').then(({ ml, map: m }) => {
      if (cancelled) return m.remove()
      map = m
      mapRef.current = m
      m.addControl(new ml.NavigationControl({ showCompass: false }), 'top-right')
      m.on('load', () => {
        m.addSource('shelters', { type: 'geojson', data: dataRef.current })
        fit(m, shelterRef.current, 0)
        m.addLayer({ id: 'shelters', type: 'circle', source: 'shelters', paint: { 'circle-radius': ['interpolate', ['linear'], ['zoom'], 8, 4, 14, 8], 'circle-color': '#1f6fd1', 'circle-stroke-width': 2, 'circle-stroke-color': '#fff' } })
        m.addLayer({ id: 'shelter-labels', type: 'symbol', source: 'shelters', minzoom: 12, layout: { 'text-field': ['get', 'name'], 'text-font': ['Open Sans Semibold'], 'text-size': 12, 'text-offset': [0, 1.1], 'text-anchor': 'top' }, paint: { 'text-color': '#123a6b', 'text-halo-color': '#fff', 'text-halo-width': 1.5 } })
        const popup = new ml.Popup({ closeButton: false, offset: 10 })
        m.on('click', 'shelters', (e: any) => {
          const f = e.features?.[0]
          if (!f) return
          const div = document.createElement('div')
          const b = document.createElement('strong')
          b.textContent = f.properties.name
          div.append(b, document.createElement('br'), f.properties.parish)
          popup.setLngLat(f.geometry.coordinates).setDOMContent(div).addTo(m)
        })
        m.on('mouseenter', 'shelters', () => (m.getCanvas().style.cursor = 'pointer'))
        m.on('mouseleave', 'shelters', () => (m.getCanvas().style.cursor = ''))
      })
    })
    return () => {
      cancelled = true
      map?.remove()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const m = mapRef.current
    const src = m?.getSource?.('shelters')
    if (src) src.setData(data)
    if (src) fit(m, shelters, 600)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shelters])

  return <div ref={el} className="ke-sr-map" role="region" aria-label="Map of shelters" />
}
