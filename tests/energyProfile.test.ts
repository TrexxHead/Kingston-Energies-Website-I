import { describe, it, expect } from 'vitest'
import { mergeProfiles, profileSchema, scenarioDevices, pruneScenario, EMPTY_PROFILE, type EnergyProfile, type ProfileDevice } from '@/lib/energy/profileSchema'
import { evaluateScenario } from '@/lib/energy/engine'

const fridge: ProfileDevice = {
  clientId: 'dev_fridge',
  name: 'Kitchen fridge',
  category: 'refrigeration',
  quantity: 1,
  load: { kind: 'cycling', runningWatts: { value: 150, basis: 'manufacturer' }, dutyCyclePct: { value: 40, basis: 'assumed' } },
  motorLoad: true,
  startupWatts: { value: 600, basis: 'assumed' },
}
const router: ProfileDevice = {
  clientId: 'dev_router',
  name: 'Router',
  category: 'networking',
  quantity: 1,
  load: { kind: 'steady', watts: { value: 12, basis: 'measured' }, hoursPerDay: { value: 24, basis: 'customer_entered' } },
  motorLoad: false,
}

function profile(devices: ProfileDevice[], propId = 'prop_home'): EnergyProfile {
  return {
    version: 1,
    properties: [
      {
        clientId: propId,
        name: 'Home',
        kind: 'home',
        devices,
        scenarios: [{ clientId: 'scn_storm', name: 'Storm', kind: 'storm', targetHours: 12, items: devices.map((d) => ({ deviceClientId: d.clientId, simultaneous: true, essential: true })) }],
      },
    ],
  }
}

describe('profile schema', () => {
  it('accepts a valid profile and rejects bad load data', () => {
    expect(profileSchema.safeParse(profile([fridge, router])).success).toBe(true)
    const bad = profile([{ ...router, load: { kind: 'steady', watts: { value: -1, basis: 'measured' }, hoursPerDay: { value: 1, basis: 'measured' } } }])
    expect(profileSchema.safeParse(bad).success).toBe(false)
  })
})

describe('one device entered once, reused by tools', () => {
  it('the same device record feeds different scenarios', () => {
    const p = profile([fridge, router]).properties[0]
    const overnight = { clientId: 'scn_night', name: 'Overnight', kind: 'overnight' as const, items: [{ deviceClientId: 'dev_fridge', simultaneous: true, essential: true }] }
    const a = evaluateScenario(scenarioDevices(p, p.scenarios[0]))
    const b = evaluateScenario(scenarioDevices({ ...p, scenarios: [overnight] }, overnight))
    expect(a.ok && b.ok).toBe(true)
    if (!a.ok || !b.ok) return
    expect(a.value.devices.find((d) => d.deviceId === 'dev_fridge')?.kwhPerDay).toEqual(b.value.devices[0].kwhPerDay)
  })

  it('removing a device prunes it from scenarios', () => {
    const p = profile([fridge, router]).properties[0]
    const pruned = pruneScenario(p.scenarios[0], [router])
    expect(pruned.items.map((i) => i.deviceClientId)).toEqual(['dev_router'])
  })
})

describe('mergeProfiles', () => {
  it('adds an anonymous profile to an empty account', () => {
    const r = mergeProfiles(EMPTY_PROFILE, profile([fridge, router]))
    expect(r.added).toEqual({ properties: 1, devices: 2, scenarios: 1, vehicles: 0 })
  })

  it('merging the same local profile twice does not duplicate equipment', () => {
    const once = mergeProfiles(EMPTY_PROFILE, profile([fridge, router])).profile
    const twice = mergeProfiles(once, profile([fridge, router]))
    expect(twice.profile.properties).toHaveLength(1)
    expect(twice.profile.properties[0].devices).toHaveLength(2)
    expect(twice.added).toEqual({ properties: 0, devices: 0, scenarios: 0, vehicles: 0 })
  })

  it('an identical device from another browser (different ids) is not added again', () => {
    const server = mergeProfiles(EMPTY_PROFILE, profile([fridge, router])).profile
    const otherBrowser = profile([{ ...fridge, clientId: 'dev_fridge_other' }], 'prop_other')
    const r = mergeProfiles(server, otherBrowser)
    expect(r.profile.properties).toHaveLength(1)
    expect(r.profile.properties[0].devices).toHaveLength(2)
    expect(r.skippedDuplicates).toBe(1)
    // The other browser's scenario now points at the existing fridge.
    const storm = r.profile.properties[0].scenarios.find((s) => s.clientId === 'scn_storm')
    expect(storm?.items.map((i) => i.deviceClientId)).toContain('dev_fridge')
  })

  it('duplicate detection ignores JSON key order (Postgres JSONB reorders keys)', () => {
    const server = mergeProfiles(EMPTY_PROFILE, profile([fridge])).profile
    const reordered = { ...fridge, clientId: 'dev_other', load: { dutyCyclePct: fridge.load.kind === 'cycling' ? fridge.load.dutyCyclePct : undefined, runningWatts: fridge.load.kind === 'cycling' ? fridge.load.runningWatts : undefined, kind: 'cycling' } as unknown as ProfileDevice['load'] }
    const r = mergeProfiles(server, profile([reordered], 'prop_x'))
    expect(r.skippedDuplicates).toBe(1)
  })

  it('two identical devices entered in the same browser are both kept', () => {
    const r = mergeProfiles(EMPTY_PROFILE, profile([fridge, { ...fridge, clientId: 'dev_fridge_2' }]))
    expect(r.profile.properties[0].devices).toHaveLength(2)
    expect(r.skippedDuplicates).toBe(0)
  })

  it('a locally edited device replaces the stored copy', () => {
    const server = mergeProfiles(EMPTY_PROFILE, profile([fridge])).profile
    const edited = profile([{ ...fridge, quantity: 2 }])
    const r = mergeProfiles(server, edited)
    expect(r.profile.properties[0].devices[0].quantity).toBe(2)
  })
})

describe('quick add', async () => {
  const { QUICK_ITEMS, quickAddDevice } = await import('@/lib/energy/quickAdd')
  const { deviceSchema } = await import('@/lib/energy/profileSchema')
  it('every quick-add item is a valid device with only assumed figures', () => {
    for (const item of QUICK_ITEMS) {
      const d = quickAddDevice(item.key)
      expect(d, item.key).not.toBeNull()
      expect(deviceSchema.safeParse(d).success, item.key).toBe(true)
      const bases = Object.values(d!.load).filter((v) => typeof v === 'object' && v && 'basis' in v).map((v) => (v as { basis: string }).basis)
      expect(new Set(bases), item.key).toEqual(new Set(['assumed']))
    }
  })
  it('motor items flag a startup surge without inventing its size', () => {
    const pump = quickAddDevice('pump')!
    expect(pump.motorLoad).toBe(true)
    expect(pump.startupWatts).toBeUndefined()
  })
})

describe('vehicles in the profile', () => {
  const car = { clientId: 'veh_1', powertrain: 'bev' as const, make: 'TEST', model: 'Car', year: 2024, bodyStyle: 'hatchback' as const, colour: '#1d4f91', specs: {}, primary: true }
  it('merges vehicles by id and skips the same car added in another browser', () => {
    const server = { version: 1 as const, properties: [], vehicles: [car] }
    const local = { version: 1 as const, properties: [], vehicles: [{ ...car, clientId: 'veh_2' }, { ...car, clientId: 'veh_3', model: 'Other', primary: true }] }
    const r = mergeProfiles(server, local)
    expect(r.profile.vehicles?.map((v) => v.clientId)).toEqual(['veh_1', 'veh_3'])
    expect(r.skippedDuplicates).toBe(1)
    // Only one primary car survives.
    expect(r.profile.vehicles?.filter((v) => v.primary)).toHaveLength(1)
  })
  it('keeps vehicles optional so an older page saving without them is valid', () => {
    expect(profileSchema.safeParse({ version: 1, properties: [] }).success).toBe(true)
    expect(profileSchema.safeParse({ version: 1, properties: [], vehicles: [{ ...car, vin: 'BAD' }] }).success).toBe(false)
  })
})
