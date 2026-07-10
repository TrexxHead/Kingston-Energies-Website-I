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
