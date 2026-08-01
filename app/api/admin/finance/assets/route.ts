import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { authOptions } from '@/lib/authOptions'
import { guardAdmin } from '@/lib/requireAdmin'
import { ensureChartOfAccounts, postEntry } from '@/lib/ledger/post'
import { assetView, runAssetDepreciation } from '@/lib/ledger/schedules'
import { ACC } from '@/lib/ledger/chart'

/** Fixed asset register with live depreciation position. */
export async function GET() {
  const denied = await guardAdmin()
  if (denied) return denied

  const assets = await prisma.fixedAsset.findMany({ orderBy: { acquiredAt: 'desc' } })
  const views = await Promise.all(assets.map(assetView))

  const active = views.filter((v) => !v.disposedAt)
  return NextResponse.json({
    assets: views,
    totals: {
      cost: Math.round(active.reduce((s, v) => s + v.cost, 0)),
      accumulatedDepreciation: Math.round(active.reduce((s, v) => s + v.accumulatedDepreciation, 0)),
      netBookValue: Math.round(active.reduce((s, v) => s + v.netBookValue, 0)),
      periodsDue: active.reduce((s, v) => s + v.periodsDue, 0),
    },
  })
}

const createSchema = z.object({
  name: z.string().min(1).max(160),
  description: z.string().max(500).optional(),
  cost: z.number().positive(),
  salvageValue: z.number().min(0).default(0),
  usefulLifeMonths: z.number().int().min(1).max(600),
  acquiredAt: z.string().min(1),
  /** Post the purchase itself to the ledger (Dr Equipment / Cr Bank). */
  recordPurchase: z.boolean().optional(),
})

export async function POST(request: Request) {
  const denied = await guardAdmin()
  if (denied) return denied

  const parsed = createSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid asset' }, { status: 400 })
  const d = parsed.data

  if (d.salvageValue >= d.cost) {
    return NextResponse.json({ error: 'Salvage value must be less than cost. There would be nothing to depreciate.' }, { status: 400 })
  }
  const acquiredAt = new Date(d.acquiredAt)
  if (Number.isNaN(acquiredAt.getTime())) return NextResponse.json({ error: 'Invalid acquisition date' }, { status: 400 })

  await ensureChartOfAccounts()
  const session = await getServerSession(authOptions)

  const asset = await prisma.fixedAsset.create({
    data: {
      name: d.name,
      description: d.description ?? null,
      cost: d.cost,
      salvageValue: d.salvageValue,
      usefulLifeMonths: d.usefulLifeMonths,
      acquiredAt,
    },
  })

  // Capitalise the purchase if it hasn't already been recorded elsewhere.
  if (d.recordPurchase) {
    await postEntry({
      date: acquiredAt,
      source: 'MANUAL',
      memo: `Purchased ${d.name}`,
      createdBy: session?.user?.email ?? null,
      lines: [
        { code: ACC.EQUIPMENT, debit: d.cost },
        { code: ACC.BANK, credit: d.cost },
      ],
    }).catch((err) => console.error('[ledger] asset purchase posting failed:', err))
  }

  return NextResponse.json({ asset: await assetView(asset) }, { status: 201 })
}

/** Run depreciation for every asset with periods due. */
export async function PUT() {
  const denied = await guardAdmin()
  if (denied) return denied

  const session = await getServerSession(authOptions)
  const assets = await prisma.fixedAsset.findMany({ where: { disposedAt: null }, select: { id: true } })

  let posted = 0
  const errors: string[] = []
  for (const a of assets) {
    try {
      posted += await runAssetDepreciation(a.id, session?.user?.email ?? null)
    } catch (err) {
      errors.push(err instanceof Error ? err.message : 'Depreciation failed')
    }
  }
  return NextResponse.json({ posted, errors })
}
