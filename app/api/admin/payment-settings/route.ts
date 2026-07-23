import { NextResponse } from 'next/server'
import { z } from 'zod'
import { guardAdmin } from '@/lib/requireAdmin'
import { getPaymentConfig, savePaymentConfig, isWiPayConfigured, type PaymentConfig } from '@/lib/payments'

const configSchema = z.object({
  bank: z.object({
    enabled: z.boolean(),
    bankName: z.string().max(120),
    accountName: z.string().max(120),
    accountNumber: z.string().max(60),
    accountType: z.string().max(60),
    branch: z.string().max(120),
    instructions: z.string().max(500),
  }),
  lynk: z.object({
    enabled: z.boolean(),
    handle: z.string().max(120),
    phone: z.string().max(60),
    instructions: z.string().max(500),
  }),
  paypal: z.object({
    enabled: z.boolean(),
    link: z.string().max(300),
    email: z.string().max(160),
    instructions: z.string().max(500),
  }),
  cod: z.object({ enabled: z.boolean(), instructions: z.string().max(500) }),
  card: z.object({ enabled: z.boolean() }),
})

export async function GET() {
  const denied = await guardAdmin()
  if (denied) return denied

  const config = await getPaymentConfig()
  // Let the UI explain why "card" won't appear at checkout until WiPay is set.
  return NextResponse.json({ config, wipayConfigured: isWiPayConfigured() })
}

export async function PUT(request: Request) {
  const denied = await guardAdmin()
  if (denied) return denied

  const parsed = configSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid payment settings.' }, { status: 400 })
  }
  await savePaymentConfig(parsed.data as PaymentConfig)
  return NextResponse.json({ ok: true })
}
