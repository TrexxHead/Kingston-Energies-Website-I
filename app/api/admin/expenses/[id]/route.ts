import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { guardAdmin } from '@/lib/requireAdmin'

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await guardAdmin()
  if (denied) return denied

  const { id } = await params
  try {
    await prisma.expense.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Expense not found' }, { status: 404 })
  }
}
