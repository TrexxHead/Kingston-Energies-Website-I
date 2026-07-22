import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { authOptions } from '@/lib/authOptions'
import { rateLimit, clientIp } from '@/lib/rateLimit'
import { getProduct } from '@/lib/catalog'
import { POINTS_PER_REVIEW } from '@/lib/loyalty'

// Public: list reviews, optionally filtered to one product (?productId=pb10).
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const productId = searchParams.get('productId')

  const reviews = await prisma.review.findMany({
    where: productId ? { productId } : undefined,
    orderBy: { createdAt: 'desc' },
    take: 50,
  })

  return NextResponse.json({ reviews })
}

const reviewSchema = z.object({
  productId: z.string().min(1).max(40),
  rating: z.number().int().min(1).max(5),
  body: z.string().trim().min(1).max(2000),
})

// Authenticated: submit one review per customer per product.
export async function POST(request: Request) {
  const rl = rateLimit(`review:${clientIp(request)}`, 10, 60_000)
  if (!rl.ok) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again in a moment.' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } }
    )
  }

  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Please sign in to leave a review.' }, { status: 401 })
  }

  const parsed = reviewSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Please add a rating and a short review.' }, { status: 400 })
  }

  const { productId, rating, body } = parsed.data
  if (!getProduct(productId)) {
    return NextResponse.json({ error: 'Unknown product.' }, { status: 400 })
  }

  // One review per customer per product — blocks points farming.
  const existing = await prisma.review.findFirst({
    where: { userId: session.user.id, productId },
    select: { id: true },
  })
  if (existing) {
    return NextResponse.json({ error: 'You have already reviewed this product.' }, { status: 409 })
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { name: true, email: true },
  })

  await prisma.review.create({
    data: {
      productId,
      userId: session.user.id,
      author: user?.name ?? user?.email ?? 'Customer',
      rating,
      body,
      verified: true,
    },
  })

  return NextResponse.json({ ok: true, pointsEarned: POINTS_PER_REVIEW }, { status: 201 })
}
