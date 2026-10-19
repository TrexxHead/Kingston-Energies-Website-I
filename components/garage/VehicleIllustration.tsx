'use client'

import dynamic from 'next/dynamic'
import VehicleSide2D from './VehicleSide2D'
import type { BodyStyle, Powertrain } from '@/lib/vehicles/vehicle'

/**
 * Which picture the garage shows. The 2D side view is the default; the 3D
 * model (VehicleModel3D + carBuilder) is kept and can be switched back on here.
 */
export const VEHICLE_VIEW: '2d' | '3d' = '2d'

const VehicleModel3D = dynamic(() => import('./VehicleModel3D'), { ssr: false })

export interface VehicleIllustrationProps {
  bodyStyle: BodyStyle
  colour: string
  powertrain: Powertrain
  make?: string
  model?: string
  year?: number
  height?: number
}

export default function VehicleIllustration(props: VehicleIllustrationProps) {
  if (VEHICLE_VIEW === '3d') return <VehicleModel3D {...props} />
  return (
    // Sized by its width (a side view is wide and short), up to the slot's height.
    <div style={{ minHeight: Math.min(props.height ?? 300, 200) * 0.6, maxHeight: props.height, display: 'grid', alignItems: 'center', padding: '4% 4% 0' }}>
      <VehicleSide2D {...props} height={(props.height ?? 300) * 0.9} />
    </div>
  )
}
