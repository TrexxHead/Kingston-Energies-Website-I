'use client'

import { useSession } from 'next-auth/react'
import { useRouter, usePathname } from 'next/navigation'
import { useEffect } from 'react'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { status } = useSession()
  const router = useRouter()
  const pathname = usePathname()
  const isLoginPage = pathname === '/admin/login'

  useEffect(() => {
    if (!isLoginPage && status === 'unauthenticated') {
      router.push('/admin/login')
    }
  }, [status, router, isLoginPage])

  if (isLoginPage) {
    return <>{children}</>
  }

  if (status === 'loading') {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>
  }

  if (status !== 'authenticated') {
    return null
  }

  return <>{children}</>
}
