import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { guardAdmin } from '@/lib/requireAdmin'

const createSchema = z.object({
  title: z.string().min(1).max(160),
  url: z.string().url().max(2000),
  category: z.string().max(60).optional(),
})

export async function GET() {
  const denied = await guardAdmin()
  if (denied) return denied

  let documents: { id: string; title: string; url: string; category: string | null; createdAt: Date }[] = []
  try {
    documents = await prisma.policyDoc.findMany({ orderBy: { createdAt: 'desc' } })
  } catch {
    // DB unavailable — return an empty list rather than erroring the dashboard.
  }

  return NextResponse.json({
    documents: documents.map((d) => ({
      id: d.id,
      title: d.title,
      url: d.url,
      category: d.category,
      date: new Date(d.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
    })),
  })
}

export async function POST(request: Request) {
  const denied = await guardAdmin()
  if (denied) return denied

  const parsed = createSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Provide a title and a valid URL.' }, { status: 400 })
  }

  const { title, url, category } = parsed.data
  const doc = await prisma.policyDoc.create({
    data: { title, url, category: category ?? null },
  })

  return NextResponse.json({ id: doc.id }, { status: 201 })
}
