import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { guardAdmin } from '@/lib/requireAdmin'

const patchSchema = z.object({
  active: z.boolean().optional(),
  value: z.number().positive().optional(),
  minSpend: z.number().nonnegative().nullish(),
  expiresAt: z.string().nullish(),
  description: z.string().max(160).nullish(),
})

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await guardAdmin()
  if (denied) return denied

  const { id } = await params
  const parsed = patchSchema.safeParse(await request.json())
  if (!parsed.success) return NextResponse.json({ error: 'Invalid update' }, { status: 400 })

  const d = parsed.data
  try {
    const code = await prisma.discountCode.update({
      where: { id },
      data: {
        ...(d.active !== undefined ? { active: d.active } : {}),
        ...(d.value !== undefined ? { value: d.value } : {}),
        ...(d.minSpend !== undefined ? { minSpend: d.minSpend } : {}),
        ...(d.expiresAt !== undefined ? { expiresAt: d.expiresAt ? new Date(d.expiresAt) : null } : {}),
        ...(d.description !== undefined ? { description: d.description } : {}),
      },
    })
    return NextResponse.json({ code })
  } catch {
    return NextResponse.json({ error: 'Code not found' }, { status: 404 })
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await guardAdmin()
  if (denied) return denied

  const { id } = await params
  try {
    await prisma.discountCode.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Code not found' }, { status: 404 })
  }
}
