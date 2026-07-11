import { NextResponse } from 'next/server'
import { guardAdmin } from '@/lib/requireAdmin'
import { syncBusinessDataToSheet, isSheetsConfigured } from '@/lib/sheets'

export async function POST() {
  const denied = await guardAdmin()
  if (denied) return denied

  if (!isSheetsConfigured()) {
    return NextResponse.json(
      { ok: false, error: 'Google Sheets isn\'t configured yet. See DEPLOY.md for setup steps.' },
      { status: 200 }
    )
  }

  const result = await syncBusinessDataToSheet()
  return NextResponse.json(result, { status: result.ok ? 200 : 500 })
}

export async function GET() {
  const denied = await guardAdmin()
  if (denied) return denied

  return NextResponse.json({ configured: isSheetsConfigured() })
}
