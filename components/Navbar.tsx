'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { ShoppingBag, LogOut } from 'lucide-react'
import { initials } from '@/lib/initials'
import { useCart } from '@/components/cart/CartContext'
import { HUB_MAIN_NAV, HUB_FOOTER_NAV } from '@/app/hub/_components/hubNav'

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const pathname = usePathname()
  const { data: session, status } = useSession()
  const { count } = useCart()
  const isHome = pathname === '/'
  const navSolid = !isHome || scrolled
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Close the account menu on outside click or route change.
  useEffect(() => setMenuOpen(false), [pathname])
  useEffect(() => {
    if (!menuOpen) return
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [menuOpen])

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
            <div ref={menuRef} style={{ position: 'relative', display: 'flex' }}>
              <button
                type="button"
                onClick={() => setMenuOpen((v) => !v)}
                title="Account menu"
                aria-label="Open account menu"
                aria-expanded={menuOpen}
                aria-haspopup="menu"
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
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                {initials(session.user?.name ?? session.user?.email ?? 'U')}
              </button>

              {menuOpen && (
                <div
                  role="menu"
                  style={{
                    position: 'absolute',
                    top: 'calc(100% + 10px)',
                    right: 0,
                    width: 224,
                    background: '#fff',
                    borderRadius: 14,
                    border: '1px solid rgba(0,0,0,.06)',
                    boxShadow: '0 12px 32px rgba(0,0,0,.18)',
                    padding: 8,
                    zIndex: 60,
                  }}
                >
                  <div style={{ padding: '8px 10px 10px', borderBottom: '1px solid var(--color-border, #eee)', marginBottom: 6 }}>
                    <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13.5, color: '#1c2a25' }}>
                      {session.user?.name ?? 'My account'}
                    </div>
                    <div style={{ fontSize: 11.5, color: '#6b746f', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {session.user?.email}
                    </div>
                  </div>

                  {[...HUB_MAIN_NAV, ...HUB_FOOTER_NAV].map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      role="menuitem"
                      onClick={() => setMenuOpen(false)}
                      style={{
                        display: 'block',
                        padding: '9px 10px',
                        borderRadius: 9,
                        fontSize: 13.5,
                        color: '#1c2a25',
                        textDecoration: 'none',
                      }}
                    >
                      {item.label}
                    </Link>
                  ))}

                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setMenuOpen(false)
                      signOut({ callbackUrl: '/' })
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      width: '100%',
                      marginTop: 6,
                      paddingTop: 10,
                      padding: '10px 10px 6px',
                      borderTop: '1px solid var(--color-border, #eee)',
                      background: 'none',
                      border: 'none',
                      borderBottom: 'none',
                      borderLeft: 'none',
                      borderRight: 'none',
                      cursor: 'pointer',
                      fontSize: 13.5,
                      color: 'var(--color-danger, #c0392b)',
                      fontFamily: 'inherit',
                      textAlign: 'left',
                    }}
                  >
                    <LogOut size={15} />
                    Sign out
                  </button>
                </div>
              )}
            </div>
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
