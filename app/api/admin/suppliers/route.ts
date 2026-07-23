import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { guardAdmin } from '@/lib/requireAdmin'
import { isStorageConfigured, signedUrl } from '@/lib/storage'

const createSchema = z.object({
  name: z.string().min(1).max(120),
  contactEmail: z.string().email().nullish().or(z.literal('')),
  contactPhone: z.string().max(40).nullish(),
  website: z.string().max(200).nullish(),
  address: z.string().max(400).nullish(),
  notes: z.string().max(2000).nullish(),
})

export async function GET() {
  const denied = await guardAdmin()
  if (denied) return denied

  const suppliers = await prisma.supplier.findMany({
    orderBy: { name: 'asc' },
    include: {
      purchaseOrders: { orderBy: { createdAt: 'desc' }, include: { files: true } },
      files: { orderBy: { createdAt: 'desc' } },
    },
  })

  // Resolve signed download URLs for every attached file up front.
  const out = await Promise.all(
    suppliers.map(async (s) => ({
      id: s.id,
      name: s.name,
      contactEmail: s.contactEmail,
      contactPhone: s.contactPhone,
      website: s.website,
      address: s.address,
      notes: s.notes,
      openPOs: s.purchaseOrders.filter((po) => po.status === 'OPEN').length,
      files: await Promise.all(s.files.map(mapFile)),
      purchaseOrders: await Promise.all(
        s.purchaseOrders.map(async (po) => ({
          id: po.id,
          reference: po.reference,
          status: po.status,
          amount: po.amount,
          files: await Promise.all(po.files.map(mapFile)),
        })),
      ),
    })),
  )

  return NextResponse.json({ suppliers: out, storageEnabled: isStorageConfigured() })
}

async function mapFile(f: {
  id: string
  label: string
  kind: string
  url: string | null
  storagePath: string | null
  fileName: string | null
}) {
  return {
    id: f.id,
    label: f.label,
    kind: f.kind,
    isFile: Boolean(f.storagePath),
    fileName: f.fileName,
    url: f.storagePath ? await signedUrl(f.storagePath) : f.url,
  }
}

export async function POST(request: Request) {
  const denied = await guardAdmin()
  if (denied) return denied

  const parsed = createSchema.safeParse(await request.json())
  if (!parsed.success) return NextResponse.json({ error: 'Invalid supplier' }, { status: 400 })

  const d = parsed.data
  const supplier = await prisma.supplier.create({
    data: {
      name: d.name,
      contactEmail: d.contactEmail || null,
      contactPhone: d.contactPhone ?? null,
      website: d.website ?? null,
      address: d.address ?? null,
      notes: d.notes ?? null,
    },
  })
  return NextResponse.json({ supplier }, { status: 201 })
}
