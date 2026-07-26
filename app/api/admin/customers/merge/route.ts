import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { guardAdmin } from '@/lib/requireAdmin'

const schema = z.object({
  canonicalId: z.string().min(1),
  duplicateId: z.string().min(1),
})

function isGuestId(id: string): boolean {
  return id.startsWith('guest:')
}
function emailFromGuestId(id: string): string {
  return id.slice('guest:'.length)
}

/**
 * Fold a duplicate customer profile into the canonical one. Guest "profiles"
 * are just an email grouping over Order rows, so folding a guest duplicate is
 * a non-destructive alias (past and future orders under that email count
 * toward the canonical customer). Merging two registered accounts reassigns
 * their real records and deletes the duplicate account.
 */
export async function POST(request: Request) {
  const denied = await guardAdmin()
  if (denied) return denied

  const parsed = schema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  const { canonicalId, duplicateId } = parsed.data
  if (canonicalId === duplicateId) return NextResponse.json({ error: 'Choose two different customers.' }, { status: 400 })

  // Resolve canonical email (guest or registered).
  let canonicalEmail: string
  if (isGuestId(canonicalId)) {
    canonicalEmail = emailFromGuestId(canonicalId)
  } else {
    const canonical = await prisma.user.findUnique({ where: { id: canonicalId }, select: { email: true } })
    if (!canonical) return NextResponse.json({ error: 'Canonical customer not found.' }, { status: 404 })
    canonicalEmail = canonical.email
  }

  if (isGuestId(duplicateId)) {
    // Guest duplicate — just alias its email to the canonical one.
    const aliasEmail = emailFromGuestId(duplicateId)
    await prisma.customerAlias.upsert({
      where: { aliasEmail },
      update: { canonicalEmail },
      create: { aliasEmail, canonicalEmail },
    })
    return NextResponse.json({ ok: true })
  }

  // Registered duplicate — the canonical profile must also be a real account,
  // since we're about to reassign real rows onto it.
  if (isGuestId(canonicalId)) {
    return NextResponse.json({ error: 'Pick the registered profile as the one to keep when merging a registered account.' }, { status: 400 })
  }
  const canonicalUser = await prisma.user.findUnique({ where: { id: canonicalId } })
  const duplicateUser = await prisma.user.findUnique({ where: { id: duplicateId } })
  if (!canonicalUser || !duplicateUser) return NextResponse.json({ error: 'Customer not found.' }, { status: 404 })

  await prisma.$transaction(async (tx) => {
    await tx.order.updateMany({ where: { userId: duplicateId }, data: { userId: canonicalId } })
    await tx.address.updateMany({ where: { userId: duplicateId }, data: { userId: canonicalId } })
    await tx.notification.updateMany({ where: { userId: duplicateId }, data: { userId: canonicalId } })
    await tx.supportTicket.updateMany({ where: { userId: duplicateId }, data: { userId: canonicalId } })
    await tx.lead.updateMany({ where: { userId: duplicateId }, data: { userId: canonicalId } })

    // Favorites/reviews are unique per (userId, productId) — reassign where
    // there's no conflict, drop the duplicate's row where the canonical
    // profile already has one for that product.
    const dupFavorites = await tx.favorite.findMany({ where: { userId: duplicateId } })
    for (const f of dupFavorites) {
      await tx.favorite.update({ where: { id: f.id }, data: { userId: canonicalId } }).catch(() => tx.favorite.delete({ where: { id: f.id } }))
    }
    const dupReviews = await tx.review.findMany({ where: { userId: duplicateId } })
    for (const r of dupReviews) {
      await tx.review.update({ where: { id: r.id }, data: { userId: canonicalId } }).catch(() => tx.review.delete({ where: { id: r.id } }))
    }

    await tx.customerAlias.upsert({
      where: { aliasEmail: duplicateUser.email },
      update: { canonicalEmail },
      create: { aliasEmail: duplicateUser.email, canonicalEmail },
    })

    await tx.user.delete({ where: { id: duplicateId } })
  })

  return NextResponse.json({ ok: true })
}
