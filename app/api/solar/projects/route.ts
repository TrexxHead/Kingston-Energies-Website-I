import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import { prisma } from '@/lib/prisma'
import { rateLimit, clientIp } from '@/lib/rateLimit'
import { logServerError } from '@/lib/clientLog'
import { PARISHES } from '@/lib/map/parishes'
import { designSnapshotSchema, designSummaryLines, newProjectNo } from '@/lib/solarProjects'
import { sendSolarProjectEmail } from '@/lib/email'

const schema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(200),
  phone: z.string().trim().min(7).max(40),
  parish: z.string().refine((p) => PARISHES.some((x) => x.id === p), 'Choose a parish.'),
  address: z.string().trim().max(400).optional(),
  note: z.string().trim().max(1000).optional(),
  exportsToGrid: z.boolean().default(false),
  design: designSnapshotSchema,
  /** Honeypot — real visitors never fill it. */
  website: z.string().max(0).optional(),
})

/**
 * POST /api/solar/projects — the online design becomes a solar project:
 * staff are alerted, the customer gets a confirmation, and (signed in or
 * later, with the same e-mail) follows it in the hub.
 */
export async function POST(request: Request) {
  const rl = await rateLimit(`solar-project:${clientIp(request)}`, 4, 10 * 60_000)
  if (!rl.ok) return NextResponse.json({ error: 'Too many requests from this connection — try again later.' }, { status: 429 })
  const parsed = schema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Please check the form.' }, { status: 400 })
  const { name, email, phone, parish, address, note, exportsToGrid, design } = parsed.data
  const session = await getServerSession(authOptions)
  try {
    let project = null
    for (let i = 0; i < 4 && !project; i++) {
      try {
        project = await prisma.solarProject.create({
          data: {
            projectNo: newProjectNo(),
            userId: session?.user?.id ?? null,
            customerName: name,
            email: email.toLowerCase(),
            phone,
            parish,
            address: address || null,
            note: note || null,
            exportsToGrid,
            design,
            events: { create: { stage: 'enquiry', note: 'Design sent from the online designer.', createdBy: 'customer' } },
          },
        })
      } catch (e) {
        if ((e as { code?: string }).code !== 'P2002') throw e
      }
    }
    if (!project) throw new Error('could not allocate a project number')
    void sendSolarProjectEmail({ kind: 'created', projectNo: project.projectNo, customerName: name, email: project.email, summary: designSummaryLines(design) })
    return NextResponse.json({ projectNo: project.projectNo }, { status: 201 })
  } catch (e) {
    logServerError(e, { path: '/api/solar/projects' })
    return NextResponse.json({ error: 'We couldn’t save your design just now — please try again.' }, { status: 500 })
  }
}
