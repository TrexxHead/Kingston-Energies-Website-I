'use client'

import { signIn, signOut, getSession, useSession } from 'next-auth/react'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/Navbar'

export default function AdminLogin() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const router = useRouter()
  const { data: session, status } = useSession()

  // Already signed in as an admin (e.g. a bookmarked /admin/login) — skip the
  // form and go straight in, since this page is the only door in.
  useEffect(() => {
    const role = session?.user?.role
    if (status === 'authenticated' && (role === 'ADMIN' || role === 'SUPER_ADMIN')) {
      router.replace('/admin/dashboard')
    }
  }, [status, session, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)

    const result = await signIn('credentials', {
      email,
      password,
      redirect: false,
    })

    if (result?.error) {
      setError('Invalid email or password')
      setSubmitting(false)
      return
    }

    // Signing in with valid customer credentials must not grant a peek at the
    // dashboard — only ADMIN/SUPER_ADMIN accounts may pass this form.
    const fresh = await getSession()
    const role = fresh?.user?.role
    if (role !== 'ADMIN' && role !== 'SUPER_ADMIN') {
      await signOut({ redirect: false })
      setError('This account does not have admin access.')
      setSubmitting(false)
      return
    }

    router.push('/admin/dashboard')
  }

  return (
    <>
      <Navbar />
      <div className="min-h-screen flex items-center justify-center bg-gray-100 pt-16">
        <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-md">
          <h1 className="text-3xl font-bold mb-6 text-center">Admin Login</h1>

          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold mb-2">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-primary"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-primary"
              />
            </div>

            <button type="submit" className="btn-primary w-full" disabled={submitting}>
              {submitting ? 'Signing in…' : 'Login'}
            </button>
          </form>

          <p className="text-center text-sm text-gray-600 mt-4">
            Sign in with your administrator account credentials.
          </p>
        </div>
      </div>
    </>
  )
}
