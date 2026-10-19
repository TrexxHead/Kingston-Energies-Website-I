import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { PROFILE_VERSION, pruneScenario, type EnergyProfile, type ProfileDevice, type ProfileProperty } from './profileSchema'
import { vehicleSchema, type Vehicle } from '@/lib/vehicles/vehicle'

/**
 * Database persistence for the shared energy profile. The API always
 * exchanges the whole profile shape (lib/energy/profileSchema.ts); this
 * module maps it to rows keyed by the browser-assigned clientId so syncing
 * is idempotent.
 */

type Tx = Prisma.TransactionClient

export async function loadProfile(userId: string): Promise<EnergyProfile> {
  const vehicleRows = await prisma.energyVehicle.findMany({ where: { userId }, orderBy: { createdAt: 'asc' } })
  // A row that no longer matches the schema (an older shape) is skipped rather than breaking the profile.
  const vehicles = vehicleRows.flatMap((r) => {
    const v = vehicleSchema.safeParse({ ...(r.data as object), clientId: r.clientId })
    return v.success ? [v.data] : []
  })
  const props = await prisma.energyProperty.findMany({
    where: { userId },
    orderBy: { createdAt: 'asc' },
    include: {
      devices: { orderBy: { createdAt: 'asc' } },
      scenarios: { orderBy: { createdAt: 'asc' }, include: { items: { include: { device: { select: { clientId: true, id: true } } } } } },
    },
  })
  return {
    version: PROFILE_VERSION,
    vehicles,
    properties: props.map((p) => ({
      clientId: p.clientId ?? p.id,
      name: p.name,
      kind: p.kind === 'BUSINESS' ? 'business' : 'home',
      parish: p.parish ?? undefined,
      occupants: p.occupants ?? undefined,
      devices: p.devices.map((d) => ({
        clientId: d.clientId ?? d.id,
        name: d.name,
        category: d.category as ProfileDevice['category'],
        quantity: d.quantity,
        brand: d.brand ?? undefined,
        model: d.model ?? undefined,
        load: d.load as ProfileDevice['load'],
        motorLoad: d.motorLoad,
        startupWatts: d.startupWatts != null ? { value: d.startupWatts, basis: (d.startupBasis ?? 'assumed') as 'assumed' } : undefined,
        notes: d.notes ?? undefined,
      })),
      scenarios: p.scenarios.map((s) => ({
        clientId: s.clientId ?? s.id,
        name: s.name,
        kind: s.kind as 'everyday',
        targetHours: s.targetHours ?? undefined,
        reserveFraction: s.reserveFraction ?? undefined,
        items: s.items.map((i) => ({
          deviceClientId: i.device.clientId ?? i.device.id,
          simultaneous: i.simultaneous,
          essential: i.essential,
          quantityOverride: i.quantityOverride ?? undefined,
        })),
      })),
    })),
  }
}

async function saveProperty(tx: Tx, userId: string, p: ProfileProperty) {
  const prop = await tx.energyProperty.upsert({
    where: { userId_clientId: { userId, clientId: p.clientId } },
    create: { userId, clientId: p.clientId, name: p.name, kind: p.kind === 'business' ? 'BUSINESS' : 'HOME', parish: p.parish, occupants: p.occupants },
    update: { name: p.name, kind: p.kind === 'business' ? 'BUSINESS' : 'HOME', parish: p.parish ?? null, occupants: p.occupants ?? null },
  })

  const deviceIds = new Map<string, string>()
  for (const d of p.devices) {
    const data = {
      name: d.name,
      category: d.category,
      quantity: d.quantity,
      brand: d.brand ?? null,
      model: d.model ?? null,
      load: d.load as unknown as Prisma.InputJsonValue,
      motorLoad: d.motorLoad,
      startupWatts: d.startupWatts?.value ?? null,
      startupBasis: d.startupWatts?.basis ?? null,
      notes: d.notes ?? null,
    }
    const row = await tx.energyDevice.upsert({
      where: { propertyId_clientId: { propertyId: prop.id, clientId: d.clientId } },
      create: { propertyId: prop.id, clientId: d.clientId, ...data },
      update: data,
    })
    deviceIds.set(d.clientId, row.id)
  }
  await tx.energyDevice.deleteMany({ where: { propertyId: prop.id, OR: [{ clientId: null }, { clientId: { notIn: p.devices.map((d) => d.clientId) } }] } })

  for (const raw of p.scenarios) {
    const s = pruneScenario(raw, p.devices)
    const data = { name: s.name, kind: s.kind, targetHours: s.targetHours ?? null, reserveFraction: s.reserveFraction ?? null }
    const row = await tx.energyScenario.upsert({
      where: { propertyId_clientId: { propertyId: prop.id, clientId: s.clientId } },
      create: { propertyId: prop.id, clientId: s.clientId, ...data },
      update: data,
    })
    await tx.scenarioItem.deleteMany({ where: { scenarioId: row.id } })
    if (s.items.length) {
      await tx.scenarioItem.createMany({
        data: s.items.map((i) => ({
          scenarioId: row.id,
          deviceId: deviceIds.get(i.deviceClientId) as string,
          simultaneous: i.simultaneous,
          essential: i.essential,
          quantityOverride: i.quantityOverride ?? null,
        })),
      })
    }
  }
  await tx.energyScenario.deleteMany({ where: { propertyId: prop.id, OR: [{ clientId: null }, { clientId: { notIn: p.scenarios.map((s) => s.clientId) } }] } })
  return prop.id
}

/**
 * Replace the user's stored profile with `profile`. Properties, devices and
 * scenarios missing from it are deleted (cascading to their measurements,
 * scenario items and calculation runs — see the retention note on
 * CalculationRun in prisma/schema.prisma).
 */
export async function saveProfile(userId: string, profile: EnergyProfile): Promise<void> {
  await prisma.$transaction(
    async (tx) => {
      for (const p of profile.properties) await saveProperty(tx, userId, p)
      await tx.energyProperty.deleteMany({
        where: { userId, OR: [{ clientId: null }, { clientId: { notIn: profile.properties.map((p) => p.clientId) } }] },
      })
      if (profile.vehicles) await saveVehicles(tx, userId, profile.vehicles)
    },
    { timeout: 20_000 },
  )
}

export async function deleteProperty(userId: string, clientId: string): Promise<boolean> {
  const r = await prisma.energyProperty.deleteMany({ where: { userId, clientId } })
  return r.count > 0
}

/** Replace the user's garage. Only called when the saved profile includes `vehicles`. */
async function saveVehicles(tx: Tx, userId: string, vehicles: Vehicle[]) {
  for (const v of vehicles) {
    const data = v as unknown as Prisma.InputJsonValue
    await tx.energyVehicle.upsert({ where: { userId_clientId: { userId, clientId: v.clientId } }, create: { userId, clientId: v.clientId, data }, update: { data } })
  }
  await tx.energyVehicle.deleteMany({ where: { userId, clientId: { notIn: vehicles.map((v) => v.clientId) } } })
}
