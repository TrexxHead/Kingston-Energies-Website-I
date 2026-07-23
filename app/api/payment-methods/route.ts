import { NextResponse } from 'next/server'
import { getPaymentConfig, toPublicMethods } from '@/lib/payments'

/**
 * Enabled payment methods for the storefront checkout, with the customer-facing
 * "how to pay" details. These are meant to be shown to buyers (bank account,
 * Lynk handle, PayPal link), so this endpoint is public — but it only ever
 * returns methods the admin has switched on.
 */
export async function GET() {
  const config = await getPaymentConfig()
  return NextResponse.json({ methods: toPublicMethods(config) })
}
