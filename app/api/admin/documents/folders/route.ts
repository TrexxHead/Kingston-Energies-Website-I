import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { guardAdmin } from '@/lib/requireAdmin'

const KEY = 'docFolders'

async function readFolders(): Promise<string[]> {
  try {
    const row = await prisma.siteSetting.findUnique({ where: { key: KEY } })
    return row ? (JSON.parse(row.value) as string[]) : []
  } catch {
    return []
  }
}

async function writeFolders(folders: string[]): Promise<void> {
  const value = JSON.stringify(Array.from(new Set(folders)))
  await prisma.siteSetting.upsert({ where: { key: KEY }, create: { key: KEY, value }, update: { value } })
}

const schema = z.object({ name: z.string().min(1).max(60) })

/** Create an (initially empty) folder. */
export async function POST(request: Request) {
  const denied = await guardAdmin()
  if (denied) return denied

  const parsed = schema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Enter a folder name.' }, { status: 400 })

  const name = parsed.data.name.trim()
  const folders = await readFolders()
  if (!folders.includes(name)) await writeFolders([...folders, name])
  return NextResponse.json({ ok: true, name })
}

/**
 * Remove a folder from the list. Documents keep their category label; they just
 * won't sit under a "managed" folder any more. ?name=<folder>
 */
export async function DELETE(request: Request) {
  const denied = await guardAdmin()
  if (denied) return denied

  const name = new URL(request.url).searchParams.get('name')?.trim()
  if (!name) return NextResponse.json({ error: 'Missing folder name' }, { status: 400 })

  const folders = await readFolders()
  await writeFolders(folders.filter((f) => f !== name))
  return NextResponse.json({ ok: true })
}
