import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { guardAdmin } from '@/lib/requireAdmin'
import { deleteAdminFile } from '@/lib/storage'

const patchSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  contactEmail: z.string().email().nullish().or(z.literal('')),
  contactPhone: z.string().max(40).nullish(),
  website: z.string().max(200).nullish(),
  address: z.string().max(400).nullish(),
  notes: z.string().max(2000).nullish(),
})

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await guardAdmin()
  if (denied) return denied

  const { id } = await params
  const parsed = patchSchema.safeParse(await request.json())
  if (!parsed.success) return NextResponse.json({ error: 'Invalid supplier' }, { status: 400 })

  const d = parsed.data
  try {
    const supplier = await prisma.supplier.update({
      where: { id },
      data: {
        ...(d.name !== undefined ? { name: d.name } : {}),
        ...(d.contactEmail !== undefined ? { contactEmail: d.contactEmail || null } : {}),
        ...(d.contactPhone !== undefined ? { contactPhone: d.contactPhone ?? null } : {}),
        ...(d.website !== undefined ? { website: d.website ?? null } : {}),
        ...(d.address !== undefined ? { address: d.address ?? null } : {}),
        ...(d.notes !== undefined ? { notes: d.notes ?? null } : {}),
      },
    })
    return NextResponse.json({ supplier })
  } catch {
    return NextResponse.json({ error: 'Supplier not found' }, { status: 404 })
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await guardAdmin()
  if (denied) return denied

  const { id } = await params
  try {
    // Gather stored files (supplier + its POs) so we can purge storage after the
    // cascading DB delete removes their rows.
    const supplier = await prisma.supplier.findUnique({
      where: { id },
      include: { files: true, purchaseOrders: { include: { files: true } } },
    })
    if (!supplier) return NextResponse.json({ error: 'Supplier not found' }, { status: 404 })

    const paths = [
      ...supplier.files.map((f) => f.storagePath),
      ...supplier.purchaseOrders.flatMap((po) => po.files.map((f) => f.storagePath)),
    ]

    await prisma.supplier.delete({ where: { id } }) // cascades to POs + files
    await Promise.all(paths.map((p) => deleteAdminFile(p)))
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Supplier not found' }, { status: 404 })
  }
}
