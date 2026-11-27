'use client'

import { useEffect, useRef } from 'react'
import 'maplibre-gl/dist/maplibre-gl.css'
import { createKingstonMap } from '@/app/energy-map/_components/maps/mapSetup'

/* eslint-disable @typescript-eslint/no-explicit-any */
/** The route and chargers near it on the self-hosted map; planned stops are highlighted. */
export default function TripMap({ coordinates, chargers, stops }: { coordinates: [number, number][]; chargers: { id: string; name: string; lat: number; lng: number }[]; stops: string[] }) {
  const el = useRef<HTMLDivElement>(null)
  useEffect(() => {
    let cancelled = false
    let map: any
    if (!el.current) return
    const lngs = coordinates.map((c) => c[0])
    const lats = coordinates.map((c) => c[1])
    createKingstonMap(el.current, 'light', { bounds: [[Math.min(...lngs), Math.min(...lats)], [Math.max(...lngs), Math.max(...lats)]], fitBoundsOptions: { padding: 40 } }).then(({ ml, map: m }) => {
      if (cancelled) return m.remove()
      map = m
      m.addControl(new ml.NavigationControl({ showCompass: false }), 'top-right')
      m.on('load', () => {
        m.addSource('route', { type: 'geojson', data: { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates } } })
        m.addLayer({ id: 'route-casing', type: 'line', source: 'route', layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': '#1b4f9c', 'line-width': 8 } })
        m.addLayer({ id: 'route', type: 'line', source: 'route', layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': '#2f80ed', 'line-width': 5 } })
        m.addSource('chargers', { type: 'geojson', data: { type: 'FeatureCollection', features: chargers.map((c) => ({ type: 'Feature', properties: { name: c.name, stop: stops.includes(c.id) }, geometry: { type: 'Point', coordinates: [c.lng, c.lat] } })) } })
        m.addLayer({ id: 'chargers', type: 'circle', source: 'chargers', paint: { 'circle-radius': ['case', ['get', 'stop'], 9, 6], 'circle-color': ['case', ['get', 'stop'], '#3f9d2a', '#7d8a84'], 'circle-stroke-width': 2, 'circle-stroke-color': '#fff' } })
        m.addLayer({ id: 'charger-labels', type: 'symbol', source: 'chargers', filter: ['get', 'stop'], layout: { 'text-field': ['get', 'name'], 'text-font': ['Open Sans Semibold'], 'text-size': 12, 'text-offset': [0, 1.2], 'text-anchor': 'top' }, paint: { 'text-color': '#1f3d17', 'text-halo-color': '#fff', 'text-halo-width': 1.5 } })
      })
    })
    return () => {
      cancelled = true
      map?.remove()
    }
  }, [coordinates, chargers, stops])
  return <div ref={el} className="ke-tp-map" role="region" aria-label="Route map" />
}
