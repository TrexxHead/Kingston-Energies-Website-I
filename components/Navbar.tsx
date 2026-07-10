'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { ShoppingBag } from 'lucide-react'
import { initials } from '@/lib/initials'
import { useCart } from '@/components/cart/CartContext'

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const pathname = usePathname()
  const { data: session, status } = useSession()
  const { count } = useCart()
  const isHome = pathname === '/'
  const navSolid = !isHome || scrolled

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <nav
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 50,
        background: navSolid ? 'rgba(10,18,15,.82)' : 'transparent',
        backdropFilter: navSolid ? 'blur(16px)' : 'none',
        WebkitBackdropFilter: navSolid ? 'blur(16px)' : 'none',
        borderBottom: navSolid ? '1px solid rgba(255,255,255,.08)' : '1px solid transparent',
        transition: 'background .3s ease, border-color .3s ease',
      }}
    >
      <div
        style={{
          maxWidth: 1240,
          margin: '0 auto',
          padding: '0 32px',
          height: 64,
          display: 'flex',
          alignItems: 'center',
          gap: 36,
        }}
      >
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Image src="/images/logo-mark.png" alt="Kingston Energies" width={26} height={26} style={{ objectFit: 'contain' }} />
          <span
            style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 800,
              fontSize: 14,
              letterSpacing: '.22em',
              color: '#fff',
            }}
          >
            KINGSTON ENERGIES
          </span>
        </Link>

        <div className="kad-hide-sm" style={{ display: 'flex', gap: 28, marginLeft: 12 }}>
          <Link href="/shop" style={{ fontSize: 13.5, color: 'rgba(234,242,236,.72)' }}>
            Shop
          </Link>
          <Link href="/services" style={{ fontSize: 13.5, color: 'rgba(234,242,236,.72)' }}>
            Services
          </Link>
          <Link href="/about" style={{ fontSize: 13.5, color: 'rgba(234,242,236,.72)' }}>
            About
          </Link>
          <Link href="/#ke-roadmap" style={{ fontSize: 13.5, color: 'rgba(234,242,236,.72)' }}>
            Roadmap
          </Link>
        </div>

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 22 }}>
          <a
            href="tel:+18763389958"
            className="kad-hide-sm"
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 12,
              letterSpacing: '.08em',
              color: 'rgba(234,242,236,.6)',
            }}
          >
            876-338-9958
          </a>

          <Link
            href="/shop"
            style={{
              height: 36,
              display: 'flex',
              alignItems: 'center',
              padding: '0 16px',
              borderRadius: 999,
              background: 'var(--color-primary)',
              color: '#fff',
              fontFamily: 'var(--font-display)',
              fontWeight: 600,
              fontSize: 12.5,
            }}
          >
            Get yours
          </Link>

          <Link
            href="/cart"
            aria-label="Open cart"
            style={{
              position: 'relative',
              width: 34,
              height: 34,
              borderRadius: 999,
              border: '1px solid rgba(255,255,255,.16)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              flex: 'none',
            }}
          >
            <ShoppingBag size={15} />
            {count > 0 && (
              <span
                style={{
                  position: 'absolute',
                  top: -5,
                  right: -5,
                  minWidth: 16,
                  height: 16,
                  borderRadius: 999,
                  background: 'var(--ke-green-400)',
                  color: '#0d1714',
                  fontFamily: 'var(--font-display)',
                  fontWeight: 800,
                  fontSize: 10,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '0 4px',
                }}
              >
                {count}
              </span>
            )}
          </Link>

          {status === 'authenticated' ? (
            <Link
              href="/hub"
              title="My dashboard"
              aria-label="Open my dashboard"
              style={{
                width: 34,
                height: 34,
                borderRadius: 999,
                background: 'var(--gradient-brand)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontFamily: 'var(--font-display)',
                fontWeight: 700,
                fontSize: 12,
                flex: 'none',
              }}
            >
              {initials(session.user?.name ?? session.user?.email ?? 'U')}
            </Link>
          ) : (
            <Link
              href="/login"
              style={{
                fontFamily: 'var(--font-display)',
                fontWeight: 600,
                fontSize: 12.5,
                color: 'rgba(234,242,236,.8)',
              }}
            >
              Sign in
            </Link>
          )}
        </div>
      </div>
    </nav>
  )
}
