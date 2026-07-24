import type { ReactNode } from 'react'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'

export default function CommerceShell({ children, dark = false }: { children: ReactNode; dark?: boolean }) {
  return (
    <div style={{ fontFamily: 'var(--font-body)', background: dark ? 'var(--ke-dark-bg)' : '#fbfdfb', minHeight: '100vh' }}>
      <Navbar />
      <main style={{ paddingTop: 'calc(64px + var(--ke-ann-h, 0px))', color: dark ? 'var(--ke-dark-text)' : 'var(--color-text)' }} className="ke-screen">
        {children}
      </main>
      <Footer />
    </div>
  )
}
