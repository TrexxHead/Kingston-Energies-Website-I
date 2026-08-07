'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { SidebarMotionProvider, useSidebarMotionValue, sidebarPointerHandlers, MagnifyIcon } from '@/app/_design-system/sidebarMotion'
import {
  LayoutDashboard,
  Package,
  BatteryCharging,
  Gift,
  Heart,
  MapPin,
  UserRound,
  LifeBuoy,
  Settings,
  Leaf,
  Bell,
  ExternalLink,
  Menu,
  X,
  Gauge,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { formatCo2 } from '@/lib/impact'
import { HUB_MAIN_NAV, HUB_TOOLS_NAV, HUB_FOOTER_NAV, type HubNavItem } from './hubNav'

const ICONS: Record<string, typeof LayoutDashboard> = {
  'layout-dashboard': LayoutDashboard,
  package: Package,
  bell: Bell,
  'battery-charging': BatteryCharging,
  gift: Gift,
  heart: Heart,
  'map-pin': MapPin,
  'user-round': UserRound,
  'life-buoy': LifeBuoy,
  settings: Settings,
  gauge: Gauge,
}

const COLLAPSE_KEY = 'ke-hub-sidebar-collapsed'
const EXPANDED_WIDTH = 248
const COLLAPSED_WIDTH = 64

const MotionLink = motion.create(Link)
const TAP = { scale: 0.86 }
const HOVER_LIFT = { y: -1 }
const WIDTH_SPRING = { type: 'spring', mass: 0.4, stiffness: 300, damping: 30 } as const
const PILL_SPRING = { type: 'spring', stiffness: 500, damping: 34 } as const

/**
 * Hub's nav is genuinely flat — eleven items, no subsections — so unlike the
 * admin console this doesn't get a second rail; it just gets a collapse
 * toggle so the same screen-space trade-off is available here too.
 */
export default function Sidebar() {
  const pathname = usePathname()
  const [co2, setCo2] = useState<string | null>(null)
  const [unread, setUnread] = useState(0)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const railMotion = useSidebarMotionValue()

  // Close the drawer automatically whenever the route changes.
  useEffect(() => setMobileOpen(false), [pathname])

  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem(COLLAPSE_KEY) === '1')
    } catch {
      // Private browsing — default to expanded for this session.
    }
  }, [])

  const toggleCollapsed = () => {
    setCollapsed((c) => {
      const next = !c
      try {
        localStorage.setItem(COLLAPSE_KEY, next ? '1' : '0')
      } catch {
        // Private browsing — the state still applies for this session.
      }
      return next
    })
  }

  // Keep the notifications badge fresh (also refreshes when the route changes,
  // so opening the center and marking things read updates the count).
  useEffect(() => {
    let cancelled = false
    fetch('/api/notifications')
      .then((r) => (r.ok ? r.json() : { unread: 0 }))
      .then((d) => { if (!cancelled) setUnread(Number(d.unread) || 0) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [pathname])

  useEffect(() => {
    let cancelled = false
    fetch('/api/hub/summary')
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled) setCo2(formatCo2(Number(d.co2Kg) || 0))
      })
      .catch(() => {
        if (!cancelled) setCo2(formatCo2(0))
      })
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <>
      {/* Mobile-only hamburger — the sidebar itself is off-canvas below 1000px. */}
      <motion.button
        type="button"
        className="kad-mobile-toggle"
        onClick={() => setMobileOpen(true)}
        aria-label="Open menu"
        whileHover={HOVER_LIFT}
        whileTap={TAP}
        style={{
          position: 'fixed', top: 14, left: 14, zIndex: 70,
          width: 40, height: 40, borderRadius: 10, border: 'none',
          background: 'var(--ke-dark-bg)', color: '#fff',
          alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
          boxShadow: '0 4px 14px rgba(0,0,0,.3)',
        }}
      >
        <Menu size={19} />
      </motion.button>
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            className="kad-sidebar-backdrop-motion"
            onClick={() => setMobileOpen(false)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          />
        )}
      </AnimatePresence>

      <SidebarMotionProvider value={railMotion}>
        <motion.aside
          className={`kad-sidebar kad-hide-scrollbar${mobileOpen ? ' kad-sidebar-open' : ''}`}
          animate={{ width: collapsed ? COLLAPSED_WIDTH : EXPANDED_WIDTH }}
          transition={WIDTH_SPRING}
          {...sidebarPointerHandlers(railMotion.mouseY)}
          style={{
            flex: 'none',
            background: 'var(--ke-dark-bg)',
            color: '#fff',
            display: 'flex',
            flexDirection: 'column',
            padding: collapsed ? '20px 10px' : '20px 14px',
            overflowY: 'auto',
          }}
        >
          {/* Wordmark + collapse toggle */}
          <div style={{ padding: collapsed ? '6px 0 18px' : '6px 8px 18px', display: 'flex', gap: 9, alignItems: 'center', justifyContent: collapsed ? 'center' : 'flex-start' }}>
            <Image src="/images/logo-mark.png" alt="" width={26} height={26} style={{ objectFit: 'contain', flexShrink: 0 }} />
            {!collapsed && (
              <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 15, letterSpacing: '.02em', flex: 1 }}>
                KINGSTON <span style={{ color: 'var(--ke-green-400)' }}>ENERGIES</span>
              </span>
            )}
            <motion.button
              type="button"
              className="kad-mobile-toggle"
              onClick={() => setMobileOpen(false)}
              aria-label="Close menu"
              whileTap={TAP}
              style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,.7)', cursor: 'pointer', alignItems: 'center', justifyContent: 'center' }}
            >
              <X size={20} />
            </motion.button>
          </div>

          <motion.button
            type="button"
            onClick={toggleCollapsed}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="kad-hub-toggle-btn"
            whileTap={TAP}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: collapsed ? 'center' : 'flex-start', gap: 8,
              width: '100%', border: 'none', background: 'none', cursor: 'pointer',
              padding: '4px 8px', marginBottom: 12, fontSize: 11.5, fontFamily: 'var(--font-display)', fontWeight: 600,
            }}
          >
            {collapsed ? <ChevronRight size={15} /> : <><ChevronLeft size={15} /> Collapse</>}
          </motion.button>

          <nav style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {HUB_MAIN_NAV.map((item) => (
            <NavRow key={item.href} item={item} pathname={pathname} badge={item.href === '/hub/notifications' ? unread : 0} collapsed={collapsed} />
          ))}
        </nav>

        {!collapsed && (
          <div
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              letterSpacing: '.26em',
              color: 'rgba(255,255,255,.35)',
              textTransform: 'uppercase',
              padding: '16px 12px 6px',
            }}
          >
            Tools
          </div>
        )}
        <nav style={{ display: 'flex', flexDirection: 'column', gap: 3, marginTop: collapsed ? 8 : 0 }}>
          {HUB_TOOLS_NAV.map((item) => (
            <NavRow key={item.href} item={item} pathname={pathname} collapsed={collapsed} />
          ))}
        </nav>

        {/* CO2 saved card — proportional to items purchased. Hidden when
            collapsed, there's no room for it at 64px. */}
        {!collapsed && (
          <div
            style={{
              margin: '18px 4px',
              padding: '16px 16px 18px',
              borderRadius: 14,
              background: 'linear-gradient(160deg, rgba(147,201,63,.16), rgba(147,201,63,.04))',
              border: '1px solid rgba(147,201,63,.22)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, color: 'rgba(255,255,255,.7)' }}>
              <Leaf size={14} color="var(--ke-green-400)" />
              <span style={{ fontSize: 11.5 }}>
                Lifetime CO<sub>2</sub> saved
              </span>
            </div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 26, marginTop: 6 }}>
              {co2 ?? 'N/A'}
            </div>
            <div style={{ fontSize: 10.5, color: 'rgba(255,255,255,.45)', marginTop: 4 }}>Estimated from your orders</div>
          </div>
        )}

        <nav style={{ display: 'flex', flexDirection: 'column', gap: 3, marginTop: collapsed ? 8 : 0 }}>
          {HUB_FOOTER_NAV.map((item) => (
            <NavRow key={item.href} item={item} pathname={pathname} collapsed={collapsed} />
          ))}
        </nav>

        <div style={{ marginTop: 'auto', paddingTop: 12 }}>
          <MotionLink
            href="/"
            title="Back to site"
            className="kad-hub-nav-row"
            data-active={false}
            data-collapsed={collapsed}
            whileHover={HOVER_LIFT}
            whileTap={TAP}
            style={{ ...rowBase, justifyContent: collapsed ? 'center' : 'flex-start', padding: collapsed ? '10px 0' : rowBase.padding }}
          >
            <ExternalLink size={17} />
            {!collapsed && 'Back to site'}
          </MotionLink>
        </div>
        </motion.aside>
      </SidebarMotionProvider>
    </>
  )
}

const rowBase = {
  display: 'flex',
  alignItems: 'center',
  gap: 11,
  padding: '10px 12px',
  borderRadius: 10,
  fontFamily: 'var(--font-display)',
  fontWeight: 600,
  fontSize: 13.5,
  textDecoration: 'none',
} as const

function NavRow({ item, pathname, badge = 0, collapsed = false }: { item: HubNavItem; pathname: string; badge?: number; collapsed?: boolean }) {
  const Icon = ICONS[item.icon]
  // Exact match for /hub (Overview); prefix match for the sub-routes.
  const active = item.href === '/hub' ? pathname === '/hub' : pathname.startsWith(item.href)

  return (
    <MotionLink
      href={item.href}
      title={collapsed ? item.label : undefined}
      aria-label={item.label}
      aria-current={active ? 'page' : undefined}
      className="kad-hub-nav-row"
      data-active={active}
      data-collapsed={collapsed}
      whileTap={TAP}
      style={{
        ...rowBase,
        position: 'relative',
        justifyContent: collapsed ? 'center' : 'flex-start',
        padding: collapsed ? '10px 0' : rowBase.padding,
      }}
    >
      {active && <motion.span layoutId="hub-nav-pill" className="kad-hub-pill" transition={PILL_SPRING} />}
      <span style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', gap: 11, width: '100%' }}>
        <MagnifyIcon>
          <Icon size={18} />
        </MagnifyIcon>
        {!collapsed && <span style={{ flex: 1 }}>{item.label}</span>}
        {badge > 0 && collapsed && (
          <span style={{ position: 'absolute', top: 4, right: 12, width: 8, height: 8, borderRadius: '50%', background: 'var(--ke-green-500,#4bab6b)' }} aria-hidden />
        )}
        {badge > 0 && !collapsed && (
          <span style={{ minWidth: 18, height: 18, padding: '0 5px', borderRadius: 999, background: 'var(--ke-green-500,#4bab6b)', color: '#0d1714', fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 10.5, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {badge > 99 ? '99+' : badge}
          </span>
        )}
      </span>
    </MotionLink>
  )
}
