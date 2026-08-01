import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { authOptions } from '@/lib/authOptions'
import { guardAdmin } from '@/lib/requireAdmin'
import { postEntry } from '@/lib/ledger/post'
import { assetView, runAssetDepreciation, straightLine } from '@/lib/ledger/schedules'
import { ACC } from '@/lib/ledger/chart'

/** One asset plus its full depreciation schedule. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await guardAdmin()
  if (denied) return denied

  const { id } = await params
  const asset = await prisma.fixedAsset.findUnique({ where: { id } })
  if (!asset) return NextResponse.json({ error: 'Asset not found' }, { status: 404 })

  const schedule = straightLine(asset.cost - asset.salvageValue, asset.usefulLifeMonths, asset.acquiredAt)
  const runs = await prisma.scheduleRun.findMany({ where: { kind: 'DEPRECIATION', refId: id }, select: { periodDate: true } })
  const postedKeys = new Set(runs.map((r) => r.periodDate.toISOString()))

  return NextResponse.json({
    asset: await assetView(asset),
    schedule: schedule.map((s) => ({
      periodLabel: s.periodDate.toLocaleDateString('en-GB', { month: 'short', year: 'numeric', timeZone: 'UTC' }),
      amount: s.amount,
      posted: postedKeys.has(s.periodDate.toISOString()),
    })),
  })
}

/** Run this asset's outstanding depreciation. */
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await guardAdmin()
  if (denied) return denied

  const { id } = await params
  const session = await getServerSession(authOptions)
  const posted = await runAssetDepreciation(id, session?.user?.email ?? null)
  const asset = await prisma.fixedAsset.findUnique({ where: { id } })
  return NextResponse.json({ posted, asset: asset ? await assetView(asset) : null })
}

const disposeSchema = z.object({
  disposedAt: z.string().min(1),
  proceeds: z.number().min(0).default(0),
})

/**
 * Dispose of an asset: catch depreciation up to the disposal date, remove the
 * asset and its accumulated depreciation from the books, and book the gain or
 * loss on the difference against proceeds.
 */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await guardAdmin()
  if (denied) return denied

  const { id } = await params
  const parsed = disposeSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Invalid disposal' }, { status: 400 })

  const asset = await prisma.fixedAsset.findUnique({ where: { id } })
  if (!asset) return NextResponse.json({ error: 'Asset not found' }, { status: 404 })
  if (asset.disposedAt) return NextResponse.json({ error: 'This asset has already been disposed of.' }, { status: 400 })

  const disposedAt = new Date(parsed.data.disposedAt)
  if (Number.isNaN(disposedAt.getTime())) return NextResponse.json({ error: 'Invalid disposal date' }, { status: 400 })

  const session = await getServerSession(authOptions)
  // Depreciate right up to the disposal before working out the book value.
  await runAssetDepreciation(id, session?.user?.email ?? null)

  const agg = await prisma.scheduleRun.aggregate({ _sum: { amount: true }, where: { kind: 'DEPRECIATION', refId: id } })
  const accumulated = Math.round((agg._sum.amount ?? 0) * 100) / 100
  const netBookValue = Math.round((asset.cost - accumulated) * 100) / 100
  const proceeds = parsed.data.proceeds
  const gain = Math.round((proceeds - netBookValue) * 100) / 100

  await postEntry({
    date: disposedAt,
    source: 'MANUAL',
    memo: `Disposal: ${asset.name}`,
    createdBy: session?.user?.email ?? null,
    lines: [
      { code: ACC.BANK, debit: proceeds, memo: 'Disposal proceeds' },
      { code: asset.accumDepAccountCode, debit: accumulated, memo: 'Remove accumulated depreciation' },
      { code: asset.assetAccountCode, credit: asset.cost, memo: 'Remove asset at cost' },
      // A gain credits income; a loss debits expense. Only one side is non-zero.
      { code: ACC.SALES, credit: gain > 0 ? gain : 0, memo: 'Gain on disposal' },
      { code: ACC.DEPRECIATION, debit: gain < 0 ? -gain : 0, memo: 'Loss on disposal' },
    ],
  })

  const updated = await prisma.fixedAsset.update({
    where: { id },
    data: { disposedAt, disposalProceeds: proceeds },
  })

  return NextResponse.json({ asset: await assetView(updated), netBookValue, gain })
}

/** Delete an asset that was entered by mistake and has never been depreciated. */
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await guardAdmin()
  if (denied) return denied

  const { id } = await params
  const runs = await prisma.scheduleRun.count({ where: { kind: 'DEPRECIATION', refId: id } })
  if (runs > 0) {
    return NextResponse.json(
      { error: `This asset has ${runs} posted depreciation period(s). Dispose of it instead. Deleting would break the audit trail.` },
      { status: 400 },
    )
  }
  await prisma.fixedAsset.delete({ where: { id } }).catch(() => {})
  return NextResponse.json({ ok: true })
}
