import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { guardAdmin } from '@/lib/requireAdmin'

const patchSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  parentId: z.string().nullable().optional(),
  sharedWith: z.array(z.string()).max(50).optional(),
})

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await guardAdmin()
  if (denied) return denied
  const { id } = await params

  const parsed = patchSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'That update looks invalid.' }, { status: 400 })
  const { name, parentId, sharedWith } = parsed.data

  if (parentId === id) return NextResponse.json({ error: 'A folder cannot be moved into itself.' }, { status: 400 })

  await prisma.hrFolder.update({
    where: { id },
    data: {
      ...(name !== undefined ? { name } : {}),
      ...(parentId !== undefined ? { parentId } : {}),
      ...(sharedWith !== undefined ? { sharedWith: { set: sharedWith.map((mid) => ({ id: mid })) } } : {}),
    },
  })

  return NextResponse.json({ ok: true })
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await guardAdmin()
  if (denied) return denied
  const { id } = await params

  const [childCount, docCount] = await Promise.all([
    prisma.hrFolder.count({ where: { parentId: id } }),
    prisma.hrDocument.count({ where: { folderId: id } }),
  ])
  if (childCount > 0 || docCount > 0) {
    return NextResponse.json({ error: 'Empty this folder before deleting it.' }, { status: 409 })
  }

  await prisma.hrFolder.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
