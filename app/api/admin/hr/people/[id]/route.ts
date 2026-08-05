import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { guardAdmin } from '@/lib/requireAdmin'
import { buildPath, deleteAdminFile, isStorageConfigured, signedUrl, uploadAdminFile } from '@/lib/storage'

const TYPES = ['EMPLOYEE', 'CONTRACTOR', 'PARTNER'] as const
const STATUSES = ['ACTIVE', 'ON_LEAVE', 'INACTIVE'] as const

const patchSchema = z.object({
  firstName: z.string().min(1).max(80).optional(),
  lastName: z.string().min(1).max(80).optional(),
  email: z.string().email().max(160).optional().or(z.literal('')),
  phone: z.string().max(40).optional().or(z.literal('')),
  type: z.enum(TYPES).optional(),
  role: z.string().max(120).optional().or(z.literal('')),
  department: z.string().max(80).optional().or(z.literal('')),
  status: z.enum(STATUSES).optional(),
  managerId: z.string().nullable().optional(),
  employeeId: z.string().nullable().optional(),
  compensationNote: z.string().max(2000).optional().or(z.literal('')),
  address: z.string().max(240).optional().or(z.literal('')),
  emergencyContactName: z.string().max(120).optional().or(z.literal('')),
  emergencyContactPhone: z.string().max(40).optional().or(z.literal('')),
  startedAt: z.string().min(1).optional(),
  endedAt: z.string().nullable().optional(),
  notes: z.string().max(4000).optional().or(z.literal('')),
})

const MAX_PHOTO_BYTES = 5 * 1024 * 1024

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await guardAdmin()
  if (denied) return denied
  const { id } = await params

  const m = await prisma.teamMember.findUnique({
    where: { id },
    include: {
      manager: { select: { id: true, firstName: true, lastName: true, role: true } },
      reports: { select: { id: true, firstName: true, lastName: true, role: true, status: true } },
      employee: { select: { id: true, employeeNo: true, jobTitle: true } },
      documents: { orderBy: { createdAt: 'desc' }, take: 20 },
    },
  })
  if (!m) return NextResponse.json({ error: 'Not found.' }, { status: 404 })

  const documents = await Promise.all(
    m.documents.map(async (doc) => ({
      id: doc.id,
      name: doc.name,
      fileName: doc.fileName,
      sizeBytes: doc.sizeBytes,
      contentType: doc.contentType,
      createdAt: doc.createdAt.toISOString(),
      url: await signedUrl(doc.storagePath),
    })),
  )

  return NextResponse.json({
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
    manager: m.manager,
    reports: m.reports,
    employee: m.employee,
    compensationNote: m.compensationNote,
    address: m.address,
    emergencyContactName: m.emergencyContactName,
    emergencyContactPhone: m.emergencyContactPhone,
    startedAt: m.startedAt.toISOString(),
    endedAt: m.endedAt ? m.endedAt.toISOString() : null,
    notes: m.notes,
    documents,
  })
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await guardAdmin()
  if (denied) return denied
  const { id } = await params

  const existing = await prisma.teamMember.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: 'Not found.' }, { status: 404 })

  const contentType = request.headers.get('content-type') ?? ''
  let fields: Record<string, unknown>
  let photo: File | null = null

  if (contentType.includes('multipart/form-data')) {
    const form = await request.formData().catch(() => null)
    if (!form) return NextResponse.json({ error: 'Could not read the form.' }, { status: 400 })
    fields = {}
    for (const [key, value] of form.entries()) {
      if (key !== 'photo') fields[key] = value
    }
    const file = form.get('photo')
    if (file instanceof File && file.size > 0) photo = file
  } else {
    fields = (await request.json().catch(() => null)) ?? {}
  }

  const parsed = patchSchema.safeParse(fields)
  if (!parsed.success) return NextResponse.json({ error: 'Some of those fields look invalid.' }, { status: 400 })
  const d = parsed.data

  // A manager can't be their own report, directly or via a self-reference.
  if (d.managerId && d.managerId === id) {
    return NextResponse.json({ error: 'A person cannot be their own manager.' }, { status: 400 })
  }

  let photoPath = existing.photoPath
  if (photo) {
    if (photo.size > MAX_PHOTO_BYTES) return NextResponse.json({ error: 'Photo is over the 5 MB limit.' }, { status: 400 })
    if (!isStorageConfigured()) return NextResponse.json({ error: 'File storage is not set up yet.' }, { status: 503 })
    const path = buildPath('hr/photos', photo.name)
    try {
      await uploadAdminFile(path, await photo.arrayBuffer(), photo.type || 'image/jpeg')
    } catch (e) {
      return NextResponse.json({ error: e instanceof Error ? e.message : 'Photo upload failed.' }, { status: 500 })
    }
    const old = existing.photoPath
    photoPath = path
    if (old) void deleteAdminFile(old)
  }

  await prisma.teamMember.update({
    where: { id },
    data: {
      ...(d.firstName !== undefined ? { firstName: d.firstName } : {}),
      ...(d.lastName !== undefined ? { lastName: d.lastName } : {}),
      ...(d.email !== undefined ? { email: d.email || null } : {}),
      ...(d.phone !== undefined ? { phone: d.phone || null } : {}),
      ...(d.type !== undefined ? { type: d.type } : {}),
      ...(d.role !== undefined ? { role: d.role || null } : {}),
      ...(d.department !== undefined ? { department: d.department || null } : {}),
      ...(d.status !== undefined ? { status: d.status } : {}),
      ...(d.managerId !== undefined ? { managerId: d.managerId || null } : {}),
      ...(d.employeeId !== undefined ? { employeeId: d.employeeId || null } : {}),
      ...(d.compensationNote !== undefined ? { compensationNote: d.compensationNote || null } : {}),
      ...(d.address !== undefined ? { address: d.address || null } : {}),
      ...(d.emergencyContactName !== undefined ? { emergencyContactName: d.emergencyContactName || null } : {}),
      ...(d.emergencyContactPhone !== undefined ? { emergencyContactPhone: d.emergencyContactPhone || null } : {}),
      ...(d.startedAt !== undefined ? { startedAt: new Date(d.startedAt) } : {}),
      ...(d.endedAt !== undefined ? { endedAt: d.endedAt ? new Date(d.endedAt) : null } : {}),
      ...(d.notes !== undefined ? { notes: d.notes || null } : {}),
      photoPath,
    },
  })

  return NextResponse.json({ ok: true })
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await guardAdmin()
  if (denied) return denied
  const { id } = await params

  const reportCount = await prisma.teamMember.count({ where: { managerId: id } })
  if (reportCount > 0) {
    return NextResponse.json({ error: 'Reassign this person’s direct reports to another manager first.' }, { status: 409 })
  }

  const existing = await prisma.teamMember.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: 'Not found.' }, { status: 404 })

  await prisma.teamMember.delete({ where: { id } })
  if (existing.photoPath) void deleteAdminFile(existing.photoPath)

  return NextResponse.json({ ok: true })
}
