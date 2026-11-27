import type { BodyStyle, Powertrain, Spec, Vehicle } from './vehicle'

/**
 * Vehicle lookups (My Garage):
 *  - US EPA fuel economy data (fueleconomy.gov web services, public, no key):
 *    year → make → model → version menus, then one vehicle's EPA figures.
 *  - NHTSA vPIC VIN decoder (public, no key).
 * Both are US data. Many cars in Jamaica are Japanese-market imports
 * (e.g. Toyota Aqua) that neither covers — the garage then takes the
 * owner's own figures. Parsers are pure and tested on the documented shapes.
 */

export interface MenuItem {
  text: string
  value: string
}

/* eslint-disable @typescript-eslint/no-explicit-any */
/** EPA menus come back as `{ menuItem: [...] }`, or a single object when there's one item. */
export function parseEpaMenu(json: any): MenuItem[] {
  const raw = json?.menuItem
  const list = Array.isArray(raw) ? raw : raw ? [raw] : []
  return list.filter((m: any) => m && typeof m.text === 'string' && m.value != null).map((m: any) => ({ text: m.text, value: String(m.value) }))
}

const MI_KM = 1.609344
const num = (v: unknown) => {
  const n = typeof v === 'number' ? v : Number(String(v ?? '').trim())
  return Number.isFinite(n) && n > 0 ? n : null
}
const round = (n: number, d = 1) => Math.round(n * 10 ** d) / 10 ** d

export function bodyFromEpaClass(vclass: string): BodyStyle {
  const c = vclass.toLowerCase()
  if (c.includes('pickup')) return 'pickup'
  if (c.includes('sport utility')) return 'suv'
  if (c.includes('van')) return 'van'
  if (c.includes('small station wagon')) return 'hatchback'
  if (c.includes('wagon')) return 'wagon'
  if (c.includes('two seater') || c.includes('minicompact')) return 'coupe'
  return 'sedan'
}

export function powertrainFromEpa(atvType: string): Powertrain | null {
  const t = atvType.toLowerCase()
  if (t === 'ev') return 'bev'
  if (t.includes('plug-in')) return 'phev'
  if (t.includes('hybrid')) return 'hev'
  return null
}

export interface EpaVehicle {
  id: string
  year: number | null
  make: string
  model: string
  trim: string | null
  /** null when the EPA lists it as petrol/diesel only. */
  powertrain: Powertrain | null
  bodyStyle: BodyStyle
  specs: Vehicle['specs']
}

/** One EPA vehicle record → our shape. EPA energy use includes charging losses (wall to wheels). */
export function parseEpaVehicle(json: any): EpaVehicle | null {
  if (!json || typeof json !== 'object' || !json.id || !json.make || !json.model) return null
  const epa = (value: number): Spec => ({ value, basis: 'epa' })
  const powertrain = powertrainFromEpa(String(json.atvType ?? ''))
  const combE = num(json.combE)
  const mpg = num(json.comb08)
  const range = num(json.range) ?? num(json.rangeA)
  const specs: Vehicle['specs'] = {}
  if (combE && powertrain !== 'hev') specs.kwhPer100km = epa(round(combE / MI_KM))
  if (range && powertrain !== 'hev') specs.rangeKm = epa(Math.round(range * MI_KM))
  if (mpg && powertrain && powertrain !== 'bev') specs.litresPer100km = epa(round(235.215 / mpg))
  const trim = [json.trany, json.drive].filter((x: unknown) => typeof x === 'string' && x).join(', ') || null
  return { id: String(json.id), year: num(json.year), make: String(json.make), model: String(json.model), trim, powertrain, bodyStyle: bodyFromEpaClass(String(json.VClass ?? '')), specs }
}

export interface VinDecode {
  make: string
  model: string
  year: number | null
  trim: string | null
  powertrain: Powertrain | null
  bodyStyle: BodyStyle | null
  specs: Vehicle['specs']
  warnings: string[]
}

export function bodyFromVpic(bodyClass: string): BodyStyle | null {
  const c = bodyClass.toLowerCase()
  if (!c) return null
  if (c.includes('pickup')) return 'pickup'
  if (c.includes('sport utility') || c.includes('suv')) return 'suv'
  if (c.includes('crossover')) return 'crossover'
  if (c.includes('minivan') || c.includes('van') || c.includes('bus')) return 'van'
  if (c.includes('hatchback')) return 'hatchback'
  if (c.includes('wagon')) return 'wagon'
  if (c.includes('coupe') || c.includes('convertible')) return 'coupe'
  if (c.includes('sedan')) return 'sedan'
  return null
}

export function powertrainFromVpic(level: string, fuelPrimary: string, fuelSecondary: string): Powertrain | null {
  const l = level.toLowerCase()
  if (l.startsWith('bev')) return 'bev'
  if (l.startsWith('phev')) return 'phev'
  if (l.includes('hev')) return 'hev'
  if (fuelPrimary.toLowerCase() === 'electric' && !fuelSecondary) return 'bev'
  return null
}

/** NHTSA vPIC DecodeVinValues → our shape; null when the VIN can't be decoded. */
export function parseVpic(json: any): VinDecode | null {
  const r = Array.isArray(json?.Results) ? json.Results[0] : null
  if (!r || !r.Make || !r.Model) return null
  const vin = (value: number): Spec => ({ value, basis: 'vin' })
  const specs: Vehicle['specs'] = {}
  const battery = num(r.BatteryKWh)
  const charger = num(r.ChargerPowerKW)
  if (battery) specs.batteryKwh = vin(battery)
  if (charger) specs.acChargeKw = vin(charger)
  const warnings: string[] = []
  const code = String(r.ErrorCode ?? '0')
  if (code !== '0' && code.split(',')[0].trim() !== '0') warnings.push('The VIN decoder flagged this VIN — check the details below.')
  return {
    make: titleCase(String(r.Make)),
    model: String(r.Model),
    year: num(r.ModelYear),
    trim: r.Trim ? String(r.Trim) : null,
    powertrain: powertrainFromVpic(String(r.ElectrificationLevel ?? ''), String(r.FuelTypePrimary ?? ''), String(r.FuelTypeSecondary ?? '')),
    bodyStyle: bodyFromVpic(String(r.BodyClass ?? '')),
    specs,
    warnings,
  }
}

const titleCase = (s: string) => (s === s.toUpperCase() ? s.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase()) : s)

export const EPA_BASE = () => process.env.VEHICLE_EPA_BASE_URL || 'https://www.fueleconomy.gov/ws/rest'
export const VPIC_BASE = () => process.env.VEHICLE_VPIC_BASE_URL || 'https://vpic.nhtsa.dot.gov/api'
