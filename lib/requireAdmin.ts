import { getServerSession } from 'next-auth'
import { NextResponse } from 'next/server'
import { authOptions } from '@/lib/authOptions'

export class AdminAuthError extends Error {
  constructor() {
    super('Admin authorization required')
    this.name = 'AdminAuthError'
  }
}

/**
 * Returns the admin session, or throws AdminAuthError.
 * Wrap route handlers in a try/catch that maps AdminAuthError -> 401 via unauthorized().
 */
export async function requireAdmin() {
  const session = await getServerSession(authOptions)
  const role = session?.user?.role
  if (!session || (role !== 'ADMIN' && role !== 'SUPER_ADMIN')) {
    throw new AdminAuthError()
  }
  return session
}

export function unauthorized() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}

/**
 * Returns a 401 NextResponse when the caller is not an admin, otherwise null.
 * Usage:  const denied = await guardAdmin(); if (denied) return denied
 */
export async function guardAdmin(): Promise<NextResponse | null> {
  try {
    await requireAdmin()
    return null
  } catch (e) {
    if (e instanceof AdminAuthError) return unauthorized()
    throw e
  }
}

/**
 * Stricter gate for actions that can mint or change admin accounts — only
 * SUPER_ADMIN may add a new admin, promote/demote a role, or remove one.
 * A regular ADMIN being able to create more admins (or super admins) would
 * be an easy privilege-escalation path.
 */
export async function guardSuperAdmin(): Promise<NextResponse | null> {
  const session = await getServerSession(authOptions)
  if (!session || session.user?.role !== 'SUPER_ADMIN') return unauthorized()
  return null
}
