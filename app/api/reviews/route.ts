import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

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
