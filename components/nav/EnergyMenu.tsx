'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useId, useRef, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { ENERGY_GROUPS, ENERGY_HREFS } from './energyNav'

/**
 * "My Energy ▾" in the navbar: every energy tool, grouped, in one panel.
 * Opens on click (and on hover with a mouse); closes on Escape, outside
 * click, or navigation. Keyboard: Tab moves through the links.
 */
export default function EnergyMenu() {
  const [open, setOpen] = useState(false)
  const wrap = useRef<HTMLDivElement>(null)
  const btn = useRef<HTMLButtonElement>(null)
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  // A mouse click lands right after the hover opened the menu — don't let it toggle the menu shut.
  const hoverOpenedAt = useRef(0)
  const pathname = usePathname()
  const panelId = useId()
  const active = ENERGY_HREFS.some((h) => pathname === h || pathname.startsWith(`${h}/`))

  useEffect(() => setOpen(false), [pathname])
  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => !wrap.current?.contains(e.target as Node) && setOpen(false)
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false)
        btn.current?.focus()
      }
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const hover = (on: boolean) => (e: React.PointerEvent) => {
    if (e.pointerType !== 'mouse') return
    if (closeTimer.current) clearTimeout(closeTimer.current)
    if (on) {
      setOpen((o) => {
        if (!o) hoverOpenedAt.current = Date.now()
        return true
      })
    } else closeTimer.current = setTimeout(() => setOpen(false), 180)
  }

  return (
    <div ref={wrap} className="ke-em" onPointerEnter={hover(true)} onPointerLeave={hover(false)}>
      <style>{CSS}</style>
      <button ref={btn} type="button" className={`ke-em__btn${active ? ' is-active' : ''}`} aria-expanded={open} aria-controls={panelId} onClick={() => setOpen((o) => (o && Date.now() - hoverOpenedAt.current < 500 ? true : !o))}>
        My Energy <ChevronDown size={14} aria-hidden style={{ transform: open ? 'rotate(180deg)' : undefined, transition: 'transform .2s' }} />
      </button>
      {open && (
        <div id={panelId} className="ke-em__panel" role="region" aria-label="My Energy tools">
          {ENERGY_GROUPS.map((g) => (
            <div key={g.title} className="ke-em__group">
              <p className="ke-em__title">{g.title}</p>
              <ul>
                {g.links.map((l) => (
                  <li key={l.href}>
                    <Link href={l.href} className={`ke-em__link${pathname === l.href ? ' is-current' : ''}`} aria-current={pathname === l.href ? 'page' : undefined} onClick={() => setOpen(false)}>
                      <span className="ke-em__icon" aria-hidden>
                        <l.Icon size={17} />
                      </span>
                      <span>
                        <strong>{l.label}</strong>
                        <small>{l.blurb}</small>
                      </span>
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
.ke-em{position:relative}
.ke-em__btn{display:inline-flex;align-items:center;gap:4px;padding:0;border:0;background:none;font:inherit;font-size:13.5px;color:rgba(234,242,236,.72);cursor:pointer}
.ke-em__btn:hover,.ke-em__btn[aria-expanded=true],.ke-em__btn.is-active{color:#fff}
.ke-em__btn:focus-visible{outline:2px solid var(--ke-green-400);outline-offset:4px;border-radius:4px}
.ke-em__panel{position:absolute;top:calc(100% + 18px);left:50%;transform:translateX(-38%);width:min(760px,calc(100vw - 32px));display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px 18px;padding:18px;border-radius:20px;background:#0e1814;border:1px solid rgba(255,255,255,.1);box-shadow:0 24px 60px -12px rgba(0,0,0,.6);-webkit-backdrop-filter:blur(18px);backdrop-filter:blur(18px);animation:ke-em-in .16s ease-out;white-space:normal}
.ke-em__panel::before{content:'';position:absolute;left:0;right:0;top:-18px;height:18px}
@keyframes ke-em-in{from{opacity:0;transform:translateX(-38%) translateY(-4px)}to{opacity:1;transform:translateX(-38%)}}
.ke-em__group ul{list-style:none;margin:0;padding:0;display:grid;gap:2px}
.ke-em__title{margin:6px 0 6px 10px;font-family:var(--font-mono);font-size:10.5px;letter-spacing:.22em;text-transform:uppercase;color:var(--ke-green-400)}
.ke-em__link{display:flex;gap:12px;align-items:flex-start;padding:9px 10px;border-radius:12px;text-decoration:none}
.ke-em .ke-em__link,.ke-em .ke-em__link:visited,.ke-em .ke-em__link:hover{color:#fff}
.ke-em__link:hover,.ke-em__link:focus-visible{background:rgba(255,255,255,.06);outline:none}
.ke-em__link.is-current{background:rgba(110,200,90,.1)}
.ke-em__link strong{display:block;font-size:14px;font-weight:600}
.ke-em__link small{display:block;margin-top:1px;font-size:12.5px;color:rgba(234,242,236,.6);line-height:1.35}
.ke-em__icon{display:grid;place-items:center;flex:none;width:32px;height:32px;border-radius:10px;background:rgba(110,200,90,.12);color:var(--ke-green-400)}
`
