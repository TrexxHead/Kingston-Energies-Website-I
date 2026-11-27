import { Suspense } from 'react'
import MapStationsSection from '../../_components/sections/platform/MapStationsSection'

export default function Page() {
  return (
    <Suspense>
      <MapStationsSection />
    </Suspense>
  )
}
