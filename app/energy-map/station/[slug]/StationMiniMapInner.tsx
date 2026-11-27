'use client'

import { useEffect, useRef } from 'react'
import 'maplibre-gl/dist/maplibre-gl.css'
import { createKingstonMap } from '@/app/energy-map/_components/maps/mapSetup'
import { stationPinSvg } from '@/lib/map/mapImages'

/* eslint-disable @typescript-eslint/no-explicit-any */
export default function StationMiniMapInner({ lat, lng, name, color }: { lat: number; lng: number; name: string; color: string }) {
  const el = useRef<HTMLDivElement>(null)
  useEffect(() => {
    let cancelled = false
    let map: any
    if (!el.current) return
    createKingstonMap(el.current, 'light', { bounds: undefined, center: [lng, lat], zoom: 15.5 }).then(({ ml, map: m }) => {
      if (cancelled) return m.remove()
      map = m
      m.addControl(new ml.NavigationControl({ showCompass: false }), 'top-right')
      const pin = document.createElement('div')
      pin.setAttribute('role', 'img')
      pin.setAttribute('aria-label', name)
      pin.innerHTML = stationPinSvg(color)
      new ml.Marker({ element: pin, anchor: 'bottom' }).setLngLat([lng, lat]).addTo(m)
    })
    return () => {
      cancelled = true
      map?.remove()
    }
  }, [lat, lng, name, color])
  return <div ref={el} className="ke-st__map" role="region" aria-label={`Map of ${name}`} />
}
