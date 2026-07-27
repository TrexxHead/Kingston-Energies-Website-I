import { NextResponse } from 'next/server'
import { guardAdmin } from '@/lib/requireAdmin'
import { cashForecast } from '@/lib/ledger/forecast'

/** Ledger-driven cash forecast. Confidence adapts to how much history exists. */
export async function GET(request: Request) {
  const denied = await guardAdmin()
  if (denied) return denied

  const months = Math.min(24, Math.max(1, Number(new URL(request.url).searchParams.get('months')) || 6))
  return NextResponse.json(await cashForecast(months))
}
