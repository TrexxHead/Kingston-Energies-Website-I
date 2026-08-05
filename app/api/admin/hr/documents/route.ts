import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { guardAdmin } from '@/lib/requireAdmin'
import { isStorageConfigured, signedUrl } from '@/lib/storage'

// Cosmetic-but-real quota — computed against actual stored bytes, not a mock
// number. Raise this if the team genuinely fills it.
const HR_STORAGE_QUOTA_BYTES = 5 * 1024 * 1024 * 1024 // 5 GB

async function breadcrumbFor(folderId: string | null): Promise<{ id: string; name: string }[]> {
  const trail: { id: string; name: string }[] = []
  let currentId = folderId
  let guard = 0
  while (currentId && guard < 30) {
    const f = await prisma.hrFolder.findUnique({ where: { id: currentId }, select: { id: true, name: true, parentId: true } })
    if (!f) break
    trail.unshift({ id: f.id, name: f.name })
    currentId = f.parentId
    guard += 1
  }
  return trail
}

export async function GET(request: Request) {
  const denied = await guardAdmin()
  if (denied) return denied

  const url = new URL(request.url)
  const folderId = url.searchParams.get('folderId')

  async function loadFolders() {
    return prisma.hrFolder.findMany({
      where: { parentId: folderId },
      include: { sharedWith: { select: { id: true, firstName: true, lastName: true, photoPath: true } }, _count: { select: { documents: true, children: true } } },
      orderBy: { name: 'asc' },
    })
  }
  async function loadFiles() {
    return prisma.hrDocument.findMany({
      where: { folderId },
      include: { owner: { select: { id: true, firstName: true, lastName: true } } },
      orderBy: { createdAt: 'desc' },
    })
  }

  let subfolders: Awaited<ReturnType<typeof loadFolders>> = []
  let files: Awaited<ReturnType<typeof loadFiles>> = []
  let totalBytes = 0

  try {
    ;[subfolders, files] = await Promise.all([loadFolders(), loadFiles()])
    const agg = await prisma.hrDocument.aggregate({ _sum: { sizeBytes: true } })
    totalBytes = agg._sum.sizeBytes ?? 0
  } catch {
    // DB unavailable — empty listing rather than erroring the dashboard.
  }

  const folderOut = await Promise.all(
    subfolders.map(async (f) => ({
      id: f.id,
      name: f.name,
      itemCount: f._count.documents + f._count.children,
      sharedWith: await Promise.all(
        f.sharedWith.map(async (m) => ({ id: m.id, name: `${m.firstName} ${m.lastName}`, photoUrl: await signedUrl(m.photoPath) })),
      ),
      createdAt: f.createdAt.toISOString(),
    })),
  )

  const fileOut = await Promise.all(
    files.map(async (doc) => ({
      id: doc.id,
      name: doc.name,
      fileName: doc.fileName,
      contentType: doc.contentType,
      sizeBytes: doc.sizeBytes,
      ownerId: doc.ownerId,
      ownerName: doc.owner ? `${doc.owner.firstName} ${doc.owner.lastName}` : null,
      uploadedBy: doc.uploadedBy,
      createdAt: doc.createdAt.toISOString(),
      updatedAt: doc.updatedAt.toISOString(),
      url: await signedUrl(doc.storagePath),
    })),
  )

  return NextResponse.json({
    folder: folderId ? { id: folderId, breadcrumb: await breadcrumbFor(folderId) } : null,
    folders: folderOut,
    files: fileOut,
    storage: { usedBytes: totalBytes, quotaBytes: HR_STORAGE_QUOTA_BYTES },
    storageEnabled: isStorageConfigured(),
  })
}
