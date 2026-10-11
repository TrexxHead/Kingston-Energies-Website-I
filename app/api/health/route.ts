import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/** Trivial reachability check — used by the hub Topbar's connection pill, which otherwise has no real signal to show. */
export async function GET() {
  return NextResponse.json({ ok: true })
}
