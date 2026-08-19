import { NextResponse } from 'next/server'
import { getStormPrepContent } from '@/lib/stormPrepContent'

/**
 * Public read of the admin-editable Storm prep checklist/kit content — no
 * auth required, same pattern as /api/announcement. Storm prep's client
 * pages fetch this once online and cache the result to localStorage so it
 * still renders (from the last-synced copy, or the shipped defaults if
 * never synced) with no connection.
 */
export async function GET() {
  return NextResponse.json(await getStormPrepContent())
}
