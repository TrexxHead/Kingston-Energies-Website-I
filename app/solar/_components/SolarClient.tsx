'use client'

import dynamic from 'next/dynamic'

// MapLibre needs the browser — load the estimator client-side only.
const SolarEstimator = dynamic(() => import('./SolarEstimator'), {
  ssr: false,
  loading: () => <div style={{ height: 'clamp(420px,62vh,640px)', borderRadius: 24, background: '#a7d3ee' }} />,
})

export default function SolarClient() {
  return <SolarEstimator />
}
