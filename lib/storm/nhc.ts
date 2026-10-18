/**
 * Active tropical systems from the US National Hurricane Center
 * (NOAA, public domain): https://www.nhc.noaa.gov/CurrentStorms.json
 * Documented at https://www.nhc.noaa.gov/productexamples/NHC_JSON_Sample.json
 *
 * Parsing is strict per storm: a storm missing its position, name or update
 * time is dropped and counted, never filled in. We show what NHC says and
 * how far the centre is from Kingston — we do NOT forecast or say whether a
 * storm will hit Jamaica; that is the official forecasters' call (NHC
 * advisory + Jamaica Meteorological Service), and the page links to both.
 */

export const NHC_BASE = 'https://www.nhc.noaa.gov'
export const NHC_ATTRIBUTION = 'Source: US National Hurricane Center (NOAA). Public domain.'
export const KINGSTON = { lat: 17.9971, lng: -76.7936 }

export function nhcFeedUrl(): string {
  // NHC_BASE_URL lets tests point at a local stand-in; production always uses NHC.
  return `${process.env.NHC_BASE_URL || NHC_BASE}/CurrentStorms.json`
}

export type Basin = 'atlantic' | 'eastern_pacific' | 'central_pacific' | 'other'

export interface ActiveStorm {
  id: string
  name: string
  classification: string
  classificationLabel: string
  basin: Basin
  /** Max sustained wind, knots (NHC's unit) and converted. */
  windKt: number | null
  windKmh: number | null
  windMph: number | null
  /** Saffir–Simpson category, 1–5, for hurricanes only. */
  category: number | null
  pressureMb: number | null
  lat: number
  lng: number
  /** Direction of motion, degrees (0 = north), and speed. */
  movementDeg: number | null
  movementMph: number | null
  movementText: string | null
  lastUpdate: string
  advisoryNumber: string | null
  advisoryUrl: string | null
  graphicsUrl: string | null
  /** NHC's forecast cone and track (KMZ), when issued for this system. */
  coneKmzUrl: string | null
  trackKmzUrl: string | null
  distanceFromKingstonKm: number
}

export const CLASSIFICATION_LABEL: Record<string, string> = {
  TD: 'Tropical depression',
  TS: 'Tropical storm',
  HU: 'Hurricane',
  STD: 'Subtropical depression',
  STS: 'Subtropical storm',
  PTC: 'Potential tropical cyclone',
  PC: 'Post-tropical cyclone',
  TY: 'Typhoon',
}

const COMPASS = ['north', 'north-northeast', 'northeast', 'east-northeast', 'east', 'east-southeast', 'southeast', 'south-southeast', 'south', 'south-southwest', 'southwest', 'west-southwest', 'west', 'west-northwest', 'northwest', 'north-northwest']
export function compass(deg: number): string {
  return COMPASS[Math.round((((deg % 360) + 360) % 360) / 22.5) % 16]
}

/** Saffir–Simpson Hurricane Wind Scale from 1-minute sustained wind in knots. */
export function saffirSimpson(windKt: number): number | null {
  if (windKt >= 137) return 5
  if (windKt >= 113) return 4
  if (windKt >= 96) return 3
  if (windKt >= 83) return 2
  if (windKt >= 64) return 1
  return null
}

export function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371
  const r = Math.PI / 180
  const dLat = (b.lat - a.lat) * r
  const dLng = (b.lng - a.lng) * r
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)))
}

function basinOf(bin: unknown, id: string): Basin {
  const b = typeof bin === 'string' ? bin.toUpperCase() : ''
  if (b.startsWith('AT') || id.startsWith('al')) return 'atlantic'
  if (b.startsWith('EP') || id.startsWith('ep')) return 'eastern_pacific'
  if (b.startsWith('CP') || id.startsWith('cp')) return 'central_pacific'
  return 'other'
}

const numOrNull = (v: unknown): number | null => {
  if (v === null || v === undefined || v === '') return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}
const httpsUrl = (v: unknown): string | null => (typeof v === 'string' && /^https:\/\/www\.nhc\.noaa\.gov\//.test(v) ? v : null)

/* eslint-disable @typescript-eslint/no-explicit-any */
export function parseCurrentStorms(json: any): { storms: ActiveStorm[]; dropped: number } | null {
  if (!json || !Array.isArray(json.activeStorms)) return null
  const storms: ActiveStorm[] = []
  let dropped = 0
  for (const s of json.activeStorms) {
    const id = typeof s?.id === 'string' ? s.id.toLowerCase() : ''
    const name = typeof s?.name === 'string' ? s.name.trim() : ''
    const lat = numOrNull(s?.latitudeNumeric)
    const lng = numOrNull(s?.longitudeNumeric)
    const updated = typeof s?.lastUpdate === 'string' && !Number.isNaN(Date.parse(s.lastUpdate)) ? new Date(s.lastUpdate).toISOString() : null
    if (!id || !name || lat == null || lng == null || Math.abs(lat) > 90 || Math.abs(lng) > 180 || !updated) {
      dropped++
      continue
    }
    const cls = typeof s.classification === 'string' ? s.classification.toUpperCase() : ''
    const windKt = numOrNull(s.intensity)
    const dir = numOrNull(s.movementDir)
    const speed = numOrNull(s.movementSpeed)
    storms.push({
      id,
      name,
      classification: cls,
      classificationLabel: CLASSIFICATION_LABEL[cls] ?? (cls || 'Tropical system'),
      basin: basinOf(s.binNumber, id),
      windKt,
      windKmh: windKt == null ? null : Math.round(windKt * 1.852),
      windMph: windKt == null ? null : Math.round(windKt * 1.15078),
      category: cls === 'HU' && windKt != null ? saffirSimpson(windKt) : null,
      pressureMb: numOrNull(s.pressure),
      lat,
      lng,
      movementDeg: dir,
      movementMph: speed,
      movementText: dir != null && speed != null ? (speed === 0 ? 'Stationary' : `Moving ${compass(dir)} at ${Math.round(speed * 1.609)} km/h`) : null,
      lastUpdate: updated,
      advisoryNumber: typeof s.publicAdvisory?.advNum === 'string' ? s.publicAdvisory.advNum : null,
      advisoryUrl: httpsUrl(s.publicAdvisory?.url),
      graphicsUrl: httpsUrl(s.forecastGraphics?.url),
      coneKmzUrl: httpsUrl(s.trackCone?.kmzFile),
      trackKmzUrl: httpsUrl(s.forecastTrack?.kmzFile),
      distanceFromKingstonKm: Math.round(haversineKm(KINGSTON, { lat, lng })),
    })
  }
  storms.sort((a, b) => a.distanceFromKingstonKm - b.distanceFromKingstonKm)
  return { storms, dropped }
}
