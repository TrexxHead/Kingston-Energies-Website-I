import type { SpecificYield } from '@/lib/energy/engine/solar'

/**
 * PVGIS (Photovoltaic Geographical Information System, European Commission
 * Joint Research Centre) — free, no key, covers Jamaica through its
 * NSRDB-based radiation data. We request 1 kWp and scale.
 * Terms: free reuse with acknowledgement ("PVGIS © European Union").
 * Docs: https://joint-research-centre.ec.europa.eu/pvgis-online-tool
 */
export const PVGIS_BASE = 'https://re.jrc.ec.europa.eu/api/v5_3/PVcalc'
export const PVGIS_ATTRIBUTION = 'PVGIS © European Union, 2001–2026'

export interface YieldQuery {
  lat: number
  lng: number
  tiltDeg: number
  /** 0 = south, 90 = west, -90 = east, 180 = north. */
  aspectDeg: number
  lossPct: number
}

export function pvgisUrl(q: YieldQuery): string {
  const p = new URLSearchParams({
    lat: q.lat.toFixed(4),
    lon: q.lng.toFixed(4),
    peakpower: '1',
    loss: String(q.lossPct),
    angle: String(q.tiltDeg),
    aspect: String(q.aspectDeg),
    mountingplace: 'building',
    outputformat: 'json',
  })
  // PVGIS_BASE_URL lets tests point at a local stand-in; production always uses PVGIS.
  return `${process.env.PVGIS_BASE_URL || PVGIS_BASE}?${p}`
}

/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Parse PVcalc JSON → specific yield. Strict: anything missing means we
 * report "unavailable" rather than inventing a number.
 *   outputs.totals.fixed.E_y   — kWh/yr for the requested peak power
 *   outputs.totals.fixed.SD_y  — year-to-year standard deviation
 *   outputs.monthly.fixed[].E_m — kWh per month
 *   inputs.meteo_data.radiation_db — data set used
 */
export function parsePvgis(json: any, q: YieldQuery): SpecificYield | null {
  const totals = json?.outputs?.totals?.fixed
  const monthly = json?.outputs?.monthly?.fixed
  const annual = Number(totals?.E_y)
  if (!Number.isFinite(annual) || annual <= 0 || annual > 3000) return null
  if (!Array.isArray(monthly) || monthly.length !== 12) return null
  const byMonth = [...monthly].sort((a, b) => Number(a?.month) - Number(b?.month)).map((m) => Number(m?.E_m))
  if (!byMonth.every((v) => Number.isFinite(v) && v >= 0)) return null
  const sd = Number(totals?.SD_y)
  const db = typeof json?.inputs?.meteo_data?.radiation_db === 'string' ? json.inputs.meteo_data.radiation_db : 'PVGIS'
  return {
    annual,
    annualSd: Number.isFinite(sd) && sd >= 0 ? sd : null,
    monthly: byMonth,
    tiltDeg: q.tiltDeg,
    aspectDeg: q.aspectDeg,
    lossPct: q.lossPct,
    source: `PVGIS (${db})`,
  }
}
