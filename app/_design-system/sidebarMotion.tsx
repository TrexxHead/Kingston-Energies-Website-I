'use client'

import { createContext, useContext, useRef, type ReactNode } from 'react'
import { motion, useMotionValue, useSpring, useTransform, type MotionValue, type SpringOptions } from 'framer-motion'

/**
 * Vertical adaptation of a macOS-dock-style proximity magnify: instead of
 * tracking mouseX across a horizontal row (the usual dock), this tracks
 * pointer Y down a vertical rail/list and scales whichever icon the cursor
 * is nearest, tapering off with distance. Shared by the admin rail and the
 * hub nav list rather than duplicated, since both are vertical icon+label
 * stacks with the same physics.
 */

interface SidebarMotionValue {
  mouseY: MotionValue<number>
  spring: SpringOptions
  distance: number
  magnification: number
}

const SidebarMotionContext = createContext<SidebarMotionValue | null>(null)

const DEFAULT_SPRING: SpringOptions = { mass: 0.12, stiffness: 210, damping: 15 }
const DEFAULT_DISTANCE = 90
const DEFAULT_MAGNIFICATION = 1.32

export function useSidebarMotionValue(opts?: { distance?: number; magnification?: number; spring?: SpringOptions }): SidebarMotionValue {
  const mouseY = useMotionValue(Infinity)
  return {
    mouseY,
    spring: opts?.spring ?? DEFAULT_SPRING,
    distance: opts?.distance ?? DEFAULT_DISTANCE,
    magnification: opts?.magnification ?? DEFAULT_MAGNIFICATION,
  }
}

export function SidebarMotionProvider({ value, children }: { value: SidebarMotionValue; children: ReactNode }) {
  return <SidebarMotionContext.Provider value={value}>{children}</SidebarMotionContext.Provider>
}

/** Spread onto the scrollable rail/list container the pointer moves over. */
export function sidebarPointerHandlers(mouseY: MotionValue<number>) {
  return {
    onPointerMove: (e: React.PointerEvent) => mouseY.set(e.clientY),
    onPointerLeave: () => mouseY.set(Infinity),
  }
}

function useSidebarMotion(): SidebarMotionValue {
  const ctx = useContext(SidebarMotionContext)
  if (!ctx) throw new Error('MagnifyIcon must be used within a SidebarMotionProvider')
  return ctx
}

/** Wraps a nav row's icon so it grows as the pointer nears it, settling back with a spring. */
export function MagnifyIcon({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLSpanElement>(null)
  const { mouseY, spring, distance, magnification } = useSidebarMotion()

  const delta = useTransform(mouseY, (val) => {
    const rect = ref.current?.getBoundingClientRect()
    if (!rect) return distance * 2
    return val - rect.top - rect.height / 2
  })
  const scaleRaw = useTransform(delta, [-distance, 0, distance], [1, magnification, 1])
  const scale = useSpring(scaleRaw, spring)

  return (
    <motion.span ref={ref} style={{ scale, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
      {children}
    </motion.span>
  )
}
