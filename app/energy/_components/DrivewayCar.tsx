'use client'

import VehicleSide2D from '@/components/garage/VehicleSide2D'

/** The EV on the driveway in the charging scene (2D garage drawing). */
export default function DrivewayCar() {
  return (
    <div style={{ position: 'absolute', left: '50%', bottom: '10%', width: 'min(400px, 46vw)', transform: 'translateX(-46%)', pointerEvents: 'none' }}>
      <VehicleSide2D bodyStyle="crossover" colour="#e6e8ea" powertrain="bev" make="Hyundai" model="Ioniq 5" year={2024} height={260} />
    </div>
  )
}
