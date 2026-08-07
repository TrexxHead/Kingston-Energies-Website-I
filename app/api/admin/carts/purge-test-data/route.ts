import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { guardAdmin } from '@/lib/requireAdmin'
import { testCartWhere } from '@/lib/carts'

/**
 * One-time (repeatable) cleanup: deletes Cart rows that predate the public
 * launch or belong to a signed-in admin account — development/QA activity
 * against the live database, not real shoppers. See lib/carts.ts for the
 * exact definition, shared with the metrics endpoint so what gets deleted
 * here always matches what the dashboard would otherwise still be counting.
 */
export async function POST() {
  const denied = await guardAdmin()
  if (denied) return denied

  const where = await testCartWhere()
  const { count } = await prisma.cart.deleteMany({ where })

  return NextResponse.json({ deleted: count })
}
