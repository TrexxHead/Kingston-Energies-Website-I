import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { guardAdmin } from '@/lib/requireAdmin'
import { deleteAdminFile } from '@/lib/storage'

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await guardAdmin()
  if (denied) return denied

  const { id } = await params
  try {
    const file = await prisma.procurementFile.delete({ where: { id } })
    await deleteAdminFile(file.storagePath) // best-effort storage cleanup
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'File not found' }, { status: 404 })
  }
}
