import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

/**
 * Server-side gate for the admin dashboard. The dashboard UI itself only
 * checks the session client-side (for UX), so without this a signed-out
 * visitor could still have the dashboard shell served to their browser.
 * This runs before any admin page renders and bounces anyone who isn't an
 * ADMIN/SUPER_ADMIN to /admin/login — the only real entry point.
 */
export default withAuth(
  function middleware() {
    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token }) => {
        const role = (token as { role?: string } | null)?.role
        return role === 'ADMIN' || role === 'SUPER_ADMIN'
      },
    },
    pages: {
      signIn: '/admin/login',
    },
  }
)

export const config = {
  matcher: ['/admin/dashboard/:path*'],
}
