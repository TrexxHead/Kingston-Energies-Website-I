'use client'

import dynamic from 'next/dynamic'

// MapLibre needs the browser.
const Inner = dynamic(() => import('./StationMiniMapInner'), { ssr: false, loading: () => <div className="ke-st__map" /> })

export default function StationMiniMap(props: { lat: number; lng: number; name: string; color: string }) {
  return <Inner {...props} />
}
