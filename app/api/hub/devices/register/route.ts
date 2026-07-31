import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import { prisma } from '@/lib/prisma'
import { rateLimit, clientIp } from '@/lib/rateLimit'
import { hasBattery, estimateBatteryHealthPct, monthsOwned, returnWindowDaysLeft } from '@/lib/deviceHealth'
import { POINTS_PER_DEVICE_REGISTRATION } from '@/lib/loyalty'

const schema = z.object({ serial: z.string().min(1).max(60) })

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Please sign in.' }, { status: 401 })

  const rl = rateLimit(`device-register:${clientIp(request)}`, 10, 60_000)
  if (!rl.ok) return NextResponse.json({ error: 'Too many attempts. Please try again shortly.' }, { status: 429 })

  const parsed = schema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Enter a serial number.' }, { status: 400 })

  const serial = parsed.data.serial.trim().toUpperCase()
  const unit = await prisma.productUnit.findUnique({
    where: { serial },
    include: {
      product: { select: { name: true, category: true, spec: true, warranty: true } },
      orderItem: { include: { order: { select: { userId: true, email: true, createdAt: true, orderNo: true } } } },
    },
  })

  if (!unit) {
    return NextResponse.json({ error: "We couldn't find a device with that serial number." }, { status: 404 })
  }
  if (unit.status === 'IN_STOCK') {
    return NextResponse.json({ error: "That serial hasn't been sold yet — double-check the number on your invoice." }, { status: 409 })
  }
  if (unit.status === 'REGISTERED') {
    return NextResponse.json(
      { error: unit.registeredByUserId === session.user.id ? "You've already registered this device." : 'This device is already registered to another account.' },
      { status: 409 },
    )
  }

  // SOLD — confirm the serial is actually tied to a purchase on this account
  // (registered userId match, or the same email for a guest checkout).
  const order = unit.orderItem?.order
  const owns = order && (order.userId === session.user.id || (order.email && order.email.toLowerCase() === session.user.email?.toLowerCase()))
  if (!owns) {
    return NextResponse.json({ error: "That serial isn't linked to a purchase on your account." }, { status: 403 })
  }

  const registeredAt = new Date()
  await prisma.productUnit.update({
    where: { id: unit.id },
    data: { status: 'REGISTERED', registeredByUserId: session.user.id, registeredAt },
  })

  const purchasedAt = order!.createdAt
  const battery = hasBattery(unit.product.category)

  return NextResponse.json({
    pointsAwarded: POINTS_PER_DEVICE_REGISTRATION,
    device: {
      id: unit.id,
      name: unit.product.name,
      spec: unit.product.spec,
      serial: unit.serial,
      purchasedAt: purchasedAt.toISOString(),
      orderNo: order!.orderNo,
      hasBattery: battery,
      batteryHealthPct: battery ? estimateBatteryHealthPct(purchasedAt, unit.serial) : null,
      monthsOwned: monthsOwned(purchasedAt),
      returnWindowDaysLeft: returnWindowDaysLeft(purchasedAt),
      manufacturerWarranty: unit.product.warranty,
    },
  })
}
