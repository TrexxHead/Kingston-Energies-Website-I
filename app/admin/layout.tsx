'use client'

import { useSession } from 'next-auth/react'
import { useRouter, usePathname } from 'next/navigation'
import { useEffect } from 'react'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const pathname = usePathname()
  const isLoginPage = pathname === '/admin/login'
  const role = session?.user?.role
  const isAdmin = role === 'ADMIN' || role === 'SUPER_ADMIN'

  useEffect(() => {
    if (isLoginPage) return
    if (status === 'unauthenticated') {
      router.push('/admin/login')
    } else if (status === 'authenticated' && !isAdmin) {
      // Signed in, but not an admin — send them to their customer hub.
      router.push('/hub')
    }
  }, [status, isAdmin, router, isLoginPage])

  if (isLoginPage) {
    return <>{children}</>
  }

  if (status === 'loading') {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>
  }

  if (status !== 'authenticated' || !isAdmin) {
    return null
  }

  return <>{children}</>
}
