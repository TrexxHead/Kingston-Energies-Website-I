'use client'

import { Protocol } from 'pmtiles'
import { buildOpenStyle, openMapSources, type MapTheme } from '@/lib/map/openStyle'
import { addMapImages } from '@/lib/map/mapImages'
import { MAP_DATA } from '@/lib/map/mapData'
import { JAMAICA_BOUNDS } from '@/lib/map/parishes'

/**
 * Shared start-up for any page that shows the Kingston Energies map
 * (Energy Map, Solar estimator): loads MapLibre in the browser, registers
 * the self-hosted PMTiles protocol and worker once, and builds the style.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
let protocolAdded = false

export const ISLAND: [[number, number], [number, number]] = [
  [JAMAICA_BOUNDS.west, JAMAICA_BOUNDS.south],
  [JAMAICA_BOUNDS.east, JAMAICA_BOUNDS.north],
]
export const MAX_BOUNDS: [[number, number], [number, number]] = [
  [JAMAICA_BOUNDS.west - 2.5, JAMAICA_BOUNDS.south - 3],
  [JAMAICA_BOUNDS.east + 2.5, JAMAICA_BOUNDS.north + 3],
]

export async function createKingstonMap(container: HTMLElement, theme: MapTheme, options: Record<string, any> = {}) {
  const [ml, parishes] = await Promise.all([import('maplibre-gl'), fetch(MAP_DATA.parishes).then((r) => (r.ok ? r.json() : Promise.reject(new Error('parishes'))))])
  ml.setWorkerUrl(`/maps/vendor/maplibre-${ml.getVersion()}/maplibre-gl-worker.mjs`)
  if (!protocolAdded) {
    ml.addProtocol('pmtiles', new Protocol().tile)
    protocolAdded = true
  }
  const sources = openMapSources(window.location.origin)
  const map = new ml.Map({
    container,
    style: buildOpenStyle(sources, parishes, theme),
    bounds: ISLAND,
    fitBoundsOptions: { padding: 24 },
    maxBounds: MAX_BOUNDS,
    attributionControl: { compact: true },
    cooperativeGestures: true,
    fadeDuration: 200,
    ...options,
  })
  map.on('styleimagemissing', () => addMapImages(map, theme))
  map.on('load', () => addMapImages(map, theme))
  map.on('error', (e: any) => console.warn('[Kingston map]', e?.error?.message ?? e))
  return { ml, map, parishes, sources }
}
