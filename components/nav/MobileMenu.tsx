'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Menu, X } from 'lucide-react'
import { ENERGY_GROUPS } from './energyNav'

const MAIN = [
  { href: '/shop', label: 'Shop' },
  { href: '/services', label: 'Services' },
  { href: '/about', label: 'About' },
  { href: '/#ke-roadmap', label: 'Roadmap' },
]

/** Phone menu (the desktop links are hidden on small screens): main pages plus the grouped My Energy tools. */
export default function MobileMenu() {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()
  useEffect(() => setOpen(false), [pathname])
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div className="ke-mm">
      <style>{CSS}</style>
      <button type="button" className="ke-mm__btn" aria-label={open ? 'Close menu' : 'Open menu'} aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        {open ? <X size={20} aria-hidden /> : <Menu size={20} aria-hidden />}
      </button>
      {open && (
        <div className="ke-mm__sheet" role="dialog" aria-modal="true" aria-label="Menu">
          <ul className="ke-mm__main">
            {MAIN.map((l) => (
              <li key={l.href}>
                <Link href={l.href} onClick={() => setOpen(false)}>{l.label}</Link>
              </li>
            ))}
          </ul>
          <p className="ke-mm__head">My Energy</p>
          {ENERGY_GROUPS.map((g) => (
            <div key={g.title} className="ke-mm__group">
              <p className="ke-mm__title">{g.title}</p>
              <ul>
                {g.links.map((l) => (
                  <li key={l.href}>
                    <Link href={l.href} aria-current={pathname === l.href ? 'page' : undefined} onClick={() => setOpen(false)}>
                      <l.Icon size={17} aria-hidden /> {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

const CSS = `
.ke-mm{display:none}
@media (max-width:767px){.ke-mm{display:block}.ke-nav-inner{gap:14px!important;padding:0 16px!important}}
@media (max-width:440px){.ke-nav-word{font-size:11.5px!important;letter-spacing:.12em!important}.ke-nav-cta{display:none!important}.ke-nav-back{display:none!important}}
@media (max-width:379px){.ke-nav-word{font-size:10.5px!important;letter-spacing:.08em!important}}
.ke-mm__btn{display:grid;place-items:center;width:40px;height:40px;border-radius:999px;border:1px solid rgba(255,255,255,.16);background:transparent;color:#fff;cursor:pointer}
.ke-mm__sheet{position:fixed;left:0;right:0;top:calc(var(--ke-ann-h, 0px) + 64px);bottom:0;z-index:60;overflow-y:auto;padding:14px 20px 40px;background:rgba(10,18,15,.98);border-top:1px solid rgba(255,255,255,.08);animation:ke-mm-in .16s ease-out}
@keyframes ke-mm-in{from{opacity:0;transform:translateY(-6px)}to{opacity:1}}
.ke-mm ul{list-style:none;margin:0;padding:0}
.ke-mm__main{display:grid;gap:2px;padding-bottom:12px;border-bottom:1px solid rgba(255,255,255,.08)}
.ke-mm .ke-mm__main a,.ke-mm .ke-mm__main a:visited{color:#fff}
.ke-mm__main a{display:block;padding:12px 4px;color:#fff;font-family:var(--font-display);font-weight:600;font-size:17px;text-decoration:none}
.ke-mm__head{margin:18px 0 4px;font-family:var(--font-display);font-weight:700;font-size:17px;color:#fff}
.ke-mm__title{margin:12px 0 4px;font-family:var(--font-mono);font-size:10.5px;letter-spacing:.22em;text-transform:uppercase;color:var(--ke-green-400)}
.ke-mm__group a{display:flex;gap:12px;align-items:center;padding:10px 4px;color:rgba(234,242,236,.86);font-size:15px;text-decoration:none}
.ke-mm__group a svg{color:var(--ke-green-400);flex:none}
.ke-mm__group a[aria-current=page]{color:#fff;font-weight:600}
`
