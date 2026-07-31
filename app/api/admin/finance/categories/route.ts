import { NextResponse } from 'next/server'
import { z } from 'zod'
import { guardAdmin } from '@/lib/requireAdmin'
import { getAllCategories, addCustomCategory, removeCustomCategory } from '@/lib/expenseCategories'

export async function GET() {
  const denied = await guardAdmin()
  if (denied) return denied
  return NextResponse.json({ categories: await getAllCategories() })
}

const nameSchema = z.object({ name: z.string().min(1).max(60) })

export async function POST(request: Request) {
  const denied = await guardAdmin()
  if (denied) return denied

  const parsed = nameSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Enter a category name.' }, { status: 400 })

  const categories = await addCustomCategory(parsed.data.name)
  return NextResponse.json({ categories }, { status: 201 })
}

export async function DELETE(request: Request) {
  const denied = await guardAdmin()
  if (denied) return denied

  const parsed = nameSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Enter a category name.' }, { status: 400 })

  const categories = await removeCustomCategory(parsed.data.name)
  return NextResponse.json({ categories })
}
