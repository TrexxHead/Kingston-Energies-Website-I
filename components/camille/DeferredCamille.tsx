'use client'

import dynamic from 'next/dynamic'
import { useEffect, useState } from 'react'

// Camille (the chat assistant) isn't needed for first paint and the user must
// click to open it. Load it after the browser is idle so its ~JS stays out of
// the critical path and initial render on every page is lighter.
const Camille = dynamic(() => import('./Camille'), { ssr: false })

export default function DeferredCamille() {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const load = () => setReady(true)
    const w = window as Window & { requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number }
    if (typeof w.requestIdleCallback === 'function') {
      w.requestIdleCallback(load, { timeout: 2500 })
    } else {
      const t = setTimeout(load, 1500)
      return () => clearTimeout(t)
    }
  }, [])

  return ready ? <Camille /> : null
}
