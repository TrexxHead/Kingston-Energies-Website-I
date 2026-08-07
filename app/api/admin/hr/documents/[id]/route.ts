import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { guardAdmin } from '@/lib/requireAdmin'
import { deleteAdminFile } from '@/lib/storage'

const patchSchema = z.object({
  name: z.string().min(1).max(160).optional(),
  folderId: z.string().nullable().optional(),
  ownerId: z.string().nullable().optional(),
})

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await guardAdmin()
  if (denied) return denied
  const { id } = await params

  const parsed = patchSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'That update looks invalid.' }, { status: 400 })
  const { name, folderId, ownerId } = parsed.data

  await prisma.hrDocument.update({
    where: { id },
    data: {
      ...(name !== undefined ? { name } : {}),
      ...(folderId !== undefined ? { folderId } : {}),
      ...(ownerId !== undefined ? { ownerId } : {}),
    },
  })

  return NextResponse.json({ ok: true })
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await guardAdmin()
  if (denied) return denied
  const { id } = await params

  const doc = await prisma.hrDocument.findUnique({ where: { id } })
  if (!doc) return NextResponse.json({ error: 'Not found.' }, { status: 404 })

  await prisma.hrDocument.delete({ where: { id } })
  void deleteAdminFile(doc.storagePath)

  return NextResponse.json({ ok: true })
}
