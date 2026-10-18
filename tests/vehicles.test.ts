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
