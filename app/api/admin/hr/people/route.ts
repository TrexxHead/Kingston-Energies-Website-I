import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { guardAdmin } from '@/lib/requireAdmin'
import { buildPath, isStorageConfigured, signedUrl, uploadAdminFile } from '@/lib/storage'

const TYPES = ['EMPLOYEE', 'CONTRACTOR', 'PARTNER'] as const
const STATUSES = ['ACTIVE', 'ON_LEAVE', 'INACTIVE'] as const

const createSchema = z.object({
  firstName: z.string().min(1).max(80),
  lastName: z.string().min(1).max(80),
  email: z.string().email().max(160).optional().or(z.literal('')),
  phone: z.string().max(40).optional().or(z.literal('')),
  type: z.enum(TYPES),
  role: z.string().max(120).optional().or(z.literal('')),
  department: z.string().max(80).optional().or(z.literal('')),
  status: z.enum(STATUSES).optional(),
  managerId: z.string().optional().or(z.literal('')),
  employeeId: z.string().optional().or(z.literal('')),
  compensationNote: z.string().max(2000).optional().or(z.literal('')),
  address: z.string().max(240).optional().or(z.literal('')),
  emergencyContactName: z.string().max(120).optional().or(z.literal('')),
  emergencyContactPhone: z.string().max(40).optional().or(z.literal('')),
  startedAt: z.string().min(1),
  notes: z.string().max(4000).optional().or(z.literal('')),
})

// 5 MB ceiling — a profile photo, not a document.
const MAX_PHOTO_BYTES = 5 * 1024 * 1024

async function nextMemberNo(): Promise<string> {
  const count = await prisma.teamMember.count()
  return `TM-${String(count + 1).padStart(4, '0')}`
}

export async function GET(request: Request) {
  const denied = await guardAdmin()
  if (denied) return denied

  const url = new URL(request.url)
  const type = url.searchParams.get('type')
  const status = url.searchParams.get('status')
  const department = url.searchParams.get('department')
  const q = url.searchParams.get('q')?.trim()

  async function load() {
    return prisma.teamMember.findMany({
      where: {
        ...(type && (TYPES as readonly string[]).includes(type) ? { type: type as (typeof TYPES)[number] } : {}),
        ...(status && (STATUSES as readonly string[]).includes(status) ? { status: status as (typeof STATUSES)[number] } : {}),
        ...(department ? { department } : {}),
        ...(q
          ? {
              OR: [
                { firstName: { contains: q, mode: 'insensitive' as const } },
                { lastName: { contains: q, mode: 'insensitive' as const } },
                { email: { contains: q, mode: 'insensitive' as const } },
                { memberNo: { contains: q, mode: 'insensitive' as const } },
              ],
            }
          : {}),
      },
      include: { manager: { select: { id: true, firstName: true, lastName: true } }, _count: { select: { reports: true, documents: true } } },
      orderBy: [{ status: 'asc' }, { firstName: 'asc' }],
    })
  }
  let rows: Awaited<ReturnType<typeof load>> = []
  try {
    rows = await load()
  } catch {
    // DB unavailable — empty list rather than erroring the dashboard.
  }

  const people = await Promise.all(
    rows.map(async (m) => ({
      id: m.id,
      memberNo: m.memberNo,
      firstName: m.firstName,
      lastName: m.lastName,
      email: m.email,
      phone: m.phone,
      photoUrl: await signedUrl(m.photoPath),
      type: m.type,
      role: m.role,
      department: m.department,
      status: m.status,
      managerId: m.managerId,
      managerName: m.manager ? `${m.manager.firstName} ${m.manager.lastName}` : null,
      reportCount: m._count.reports,
      documentCount: m._count.documents,
      startedAt: m.startedAt.toISOString(),
      endedAt: m.endedAt ? m.endedAt.toISOString() : null,
    })),
  )

  const departments = Array.from(new Set(rows.map((m) => m.department).filter((d): d is string => Boolean(d)))).sort((a, b) => a.localeCompare(b))

  return NextResponse.json({ people, departments, storageEnabled: isStorageConfigured() })
}

export async function POST(request: Request) {
  const denied = await guardAdmin()
  if (denied) return denied

  const contentType = request.headers.get('content-type') ?? ''
  let fields: Record<string, string>
  let photo: File | null = null

  if (contentType.includes('multipart/form-data')) {
    const form = await request.formData().catch(() => null)
    if (!form) return NextResponse.json({ error: 'Could not read the form.' }, { status: 400 })
    fields = {}
    for (const key of [
      'firstName', 'lastName', 'email', 'phone', 'type', 'role', 'department', 'status',
      'managerId', 'employeeId', 'compensationNote', 'address', 'emergencyContactName',
      'emergencyContactPhone', 'startedAt', 'notes',
    ]) {
      fields[key] = String(form.get(key) ?? '')
    }
    const file = form.get('photo')
    if (file instanceof File && file.size > 0) photo = file
  } else {
    const body = await request.json().catch(() => null)
    fields = body ?? {}
  }

  const parsed = createSchema.safeParse(fields)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Check the required fields — first/last name, type and start date.' }, { status: 400 })
  }
  const d = parsed.data

  if (photo) {
    if (photo.size > MAX_PHOTO_BYTES) return NextResponse.json({ error: 'Photo is over the 5 MB limit.' }, { status: 400 })
    if (!isStorageConfigured()) return NextResponse.json({ error: 'File storage is not set up yet.' }, { status: 503 })
  }

  let photoPath: string | null = null
  if (photo) {
    const path = buildPath('hr/photos', photo.name)
    try {
      await uploadAdminFile(path, await photo.arrayBuffer(), photo.type || 'image/jpeg')
      photoPath = path
    } catch (e) {
      return NextResponse.json({ error: e instanceof Error ? e.message : 'Photo upload failed.' }, { status: 500 })
    }
  }

  const memberNo = await nextMemberNo()
  const member = await prisma.teamMember.create({
    data: {
      memberNo,
      firstName: d.firstName,
      lastName: d.lastName,
      email: d.email || null,
      phone: d.phone || null,
      photoPath,
      type: d.type,
      role: d.role || null,
      department: d.department || null,
      status: d.status ?? 'ACTIVE',
      managerId: d.managerId || null,
      employeeId: d.type === 'EMPLOYEE' && d.employeeId ? d.employeeId : null,
      compensationNote: d.compensationNote || null,
      address: d.address || null,
      emergencyContactName: d.emergencyContactName || null,
      emergencyContactPhone: d.emergencyContactPhone || null,
      startedAt: new Date(d.startedAt),
      notes: d.notes || null,
    },
  })

  return NextResponse.json({ id: member.id, memberNo: member.memberNo }, { status: 201 })
}
