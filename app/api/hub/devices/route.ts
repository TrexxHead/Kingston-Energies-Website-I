import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import { prisma } from '@/lib/prisma'
import { hasBattery, estimateBatteryHealthPct, monthsOwned, returnWindowDaysLeft } from '@/lib/deviceHealth'

/** The signed-in customer's registered devices, with a live warranty/battery estimate per unit. */
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ devices: [] })

  const units = await prisma.productUnit.findMany({
    where: { registeredByUserId: session.user.id, status: 'REGISTERED' },
    include: {
      product: { select: { name: true, category: true, spec: true, warranty: true } },
      orderItem: { include: { order: { select: { createdAt: true, orderNo: true } } } },
    },
    orderBy: { registeredAt: 'desc' },
  })

  const devices = units.map((u) => {
    const purchasedAt = u.orderItem?.order.createdAt ?? u.registeredAt ?? u.createdAt
    const battery = hasBattery(u.product.category)
    return {
      id: u.id,
      name: u.product.name,
      spec: u.product.spec,
      serial: u.serial,
      purchasedAt: purchasedAt.toISOString(),
      orderNo: u.orderItem?.order.orderNo ?? null,
      hasBattery: battery,
      batteryHealthPct: battery ? estimateBatteryHealthPct(purchasedAt, u.serial) : null,
      monthsOwned: monthsOwned(purchasedAt),
      returnWindowDaysLeft: returnWindowDaysLeft(purchasedAt),
      manufacturerWarranty: u.product.warranty,
    }
  })

  return NextResponse.json({ devices })
}
