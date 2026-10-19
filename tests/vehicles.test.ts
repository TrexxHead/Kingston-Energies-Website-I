import { describe, it, expect } from 'vitest'
import { parseEpaMenu, parseEpaVehicle, parseVpic, bodyFromEpaClass } from '@/lib/vehicles/lookup'
import { connectorFit, stationFit } from '@/lib/vehicles/connectors'
import { vehicleSchema, primaryVehicle } from '@/lib/vehicles/vehicle'

// Shapes per fueleconomy.gov web services (JSON via Accept header) and NHTSA vPIC DecodeVinValues. Synthetic values.
describe('EPA lookup', () => {
  it('reads menus, including the single-item form', () => {
    expect(parseEpaMenu({ menuItem: [{ text: '2024', value: '2024' }, { text: '2023', value: '2023' }] })).toHaveLength(2)
    expect(parseEpaMenu({ menuItem: { text: 'Only', value: 123 } })).toEqual([{ text: 'Only', value: '123' }])
    expect(parseEpaMenu({})).toEqual([])
  })
  it('converts an EV record to metric with EPA as the basis', () => {
    const v = parseEpaVehicle({ id: '99999', year: '2024', make: 'TEST', model: 'EV', atvType: 'EV', combE: '30', comb08: '112', range: '150', VClass: 'Small Station Wagons', trany: 'Automatic (A1)', drive: 'Front-Wheel Drive' })!
    expect(v.powertrain).toBe('bev')
    expect(v.bodyStyle).toBe('hatchback')
    expect(v.specs.kwhPer100km).toEqual({ value: 18.6, basis: 'epa' }) // 30 kWh/100 mi
    expect(v.specs.rangeKm).toEqual({ value: 241, basis: 'epa' })
    expect(v.specs.litresPer100km).toBeUndefined()
  })
  it('gives hybrids petrol use and no electric figures; petrol-only cars have no powertrain', () => {
    const h = parseEpaVehicle({ id: '1', year: '2023', make: 'TEST', model: 'Hybrid', atvType: 'Hybrid', comb08: '52', combE: '0', VClass: 'Midsize Cars' })!
    expect(h.powertrain).toBe('hev')
    expect(h.specs.litresPer100km?.value).toBe(4.5)
    expect(h.specs.kwhPer100km).toBeUndefined()
    expect(parseEpaVehicle({ id: '2', make: 'TEST', model: 'Gas', atvType: '', comb08: '30' })!.powertrain).toBeNull()
    expect(bodyFromEpaClass('Standard Pickup Trucks 4WD')).toBe('pickup')
  })
})

describe('VIN decode', () => {
  it('reads electrification, battery and charger', () => {
    const d = parseVpic({ Results: [{ Make: 'TESTMAKE', Model: 'Volt', ModelYear: '2019', BodyClass: 'Hatchback/Liftback/Notchback', ElectrificationLevel: 'PHEV (Plug-in Hybrid Electric Vehicle)', BatteryKWh: '18.4', ChargerPowerKW: '3.6', ErrorCode: '0' }] })!
    expect(d).toMatchObject({ make: 'Testmake', year: 2019, powertrain: 'phev', bodyStyle: 'hatchback' })
    expect(d.specs).toEqual({ batteryKwh: { value: 18.4, basis: 'vin' }, acChargeKw: { value: 3.6, basis: 'vin' } })
    expect(d.warnings).toEqual([])
  })
  it('returns null for an undecodable VIN and flags decoder errors', () => {
    expect(parseVpic({ Results: [{ Make: '', Model: '' }] })).toBeNull()
    expect(parseVpic({ Results: [{ Make: 'X', Model: 'Y', ErrorCode: '1,11' }] })!.warnings).toHaveLength(1)
  })
})

describe('plug fit', () => {
  const leaf = { powertrain: 'bev' as const, acInlet: 'J1772' as const, dcInlet: 'CHAdeMO' as const }
  const byd = { powertrain: 'bev' as const, acInlet: 'Type 2' as const, dcInlet: 'CCS2' as const }
  it('matches registry names, and never promises a plain “CCS” station', () => {
    expect(connectorFit(leaf, 'J1772').fit).toBe('yes')
    expect(connectorFit(leaf, 'CHAdeMO').fit).toBe('yes')
    expect(connectorFit(leaf, 'CCS').fit).toBe('no')
    expect(connectorFit(byd, 'CCS').fit).toBe('check')
    expect(connectorFit(byd, 'Type 2').fit).toBe('yes')
    expect(connectorFit({ powertrain: 'hev' }, 'J1772').fit).toBe('no')
    expect(stationFit(byd, ['J1772', 'CCS'])).toBe('check')
    expect(stationFit(leaf, ['J1772', 'CCS'])).toBe('yes')
  })
  it('validates vehicles and picks the primary one', () => {
    const base = { clientId: 'v1', powertrain: 'bev', make: 'TEST', model: 'A', bodyStyle: 'sedan', colour: '#ffffff' }
    expect(vehicleSchema.safeParse(base).success).toBe(true)
    expect(vehicleSchema.safeParse({ ...base, colour: 'red' }).success).toBe(false)
    const a = vehicleSchema.parse(base)
    const b = vehicleSchema.parse({ ...base, clientId: 'v2', primary: true })
    expect(primaryVehicle([a, b])?.clientId).toBe('v2')
    expect(primaryVehicle([])).toBeNull()
  })
})

import { chargeSession, vehicleBackup } from '@/lib/energy/engine'
describe('charging session and vehicle backup', () => {
  it('uses the lower of charger and car, with losses and a time range', () => {
    const r = chargeSession({ batteryKwh: 60, fromPct: 20, toPct: 80, current: 'AC', chargerKw: 22, carKw: 7.2, pricePerKwh: 50, sessionFee: 100 })
    if (!r.ok) throw new Error(r.message)
    expect(r.value.kwhToBattery).toBe(36)
    expect(r.value.kwhDrawn).toBeCloseTo(40)
    expect(r.value.limitedBy).toBe('car')
    expect(r.value.minutes.fast).toBeCloseTo((40 / 7.2) * 60)
    expect(r.value.minutes.slow).toBeCloseTo(r.value.minutes.fast * 2)
    expect(r.value.cost).toBeCloseTo(40 * 50 + 100)
  })
  it('refuses without a battery size and warns when the car limit is unknown', () => {
    expect(chargeSession({ batteryKwh: 0, fromPct: 20, toPct: 80, current: 'DC', chargerKw: 50 }).ok).toBe(false)
    const r = chargeSession({ batteryKwh: 40, fromPct: 10, toPct: 90, current: 'DC', chargerKw: 50 })
    expect(r.ok && r.warnings.length).toBe(2)
    expect(r.ok && r.value.cost).toBeNull()
  })
  it('works out V2L runtime and refuses loads above the socket limit', () => {
    const r = vehicleBackup({ batteryKwh: 60, chargePct: 80, keepForDrivingPct: 30, v2lKw: 2.2, loadW: 500 })
    expect(r.ok && r.value.usableKwh).toBe(30)
    expect(r.ok && r.value.hours).toBeCloseTo((30 * 1000 * 0.9) / 500)
    expect(vehicleBackup({ batteryKwh: 60, chargePct: 80, keepForDrivingPct: 30, v2lKw: 2.2, loadW: 3000 }).ok).toBe(false)
  })
})

import { homeChargingOptions } from '@/lib/energy/engine'
describe('home charging options', () => {
  it('works out hours per day, caps at the car, and recommends the cheapest that fits', () => {
    const r = homeChargingOptions({ dailyKwh: 12, batteryKwh: 40, carAcKw: 6.6, windowHours: 10 })
    if (!r.ok) throw new Error(r.message)
    const o = Object.fromEntries(r.value.options.map((x) => [x.id, x]))
    expect(o.outlet.chargerKw).toBeCloseTo(1.44)
    expect(o.outlet.hoursPerDay).toBeCloseTo(12 / 1.44)
    expect(o.outlet.fitsWindow).toBe(true)
    expect(o.l2_32.rateKw).toBe(6.6)
    expect(o.l2_32.limitedByCar).toBe(true)
    expect(o.l2_16.fullHours).toBeCloseTo((40 * 0.8) / 0.9 / 3.84)
    expect(r.value.recommended).toBe('outlet')
    const far = homeChargingOptions({ dailyKwh: 30, carAcKw: 11, windowHours: 8 })
    expect(far.ok && far.value.recommended).toBe('l2_16')
    expect(homeChargingOptions({ dailyKwh: 0, windowHours: 8 }).ok).toBe(false)
  })
})
