'use client'

import { useMyVehicle } from './useMyVehicle'
import { ChargeEstimate, FitBadge, type EstimateGroup } from './ChargeEstimate'
import { plugsIn } from '@/lib/vehicles/vehicle'
import type { OperatorPrice } from '@/lib/refdata/chargingPrice'

/** Station page: “Fits your car” and how long / how much a charge takes, from My Garage. Nothing when there's no plug-in car. */
export default function StationForMyCar({ groups, price }: { groups: EstimateGroup[]; price: OperatorPrice | null }) {
  const { vehicle } = useMyVehicle((v) => plugsIn(v.powertrain))
  if (!vehicle) return null
  return (
    <div style={{ display: 'grid', gap: 6, padding: '12px 14px', borderRadius: 14, background: 'rgba(62,207,142,.06)', border: '1px solid rgba(62,207,142,.2)' }}>
      {(vehicle.acInlet || vehicle.dcInlet) && <FitBadge vehicle={vehicle} groups={groups} />}
      <ChargeEstimate vehicle={vehicle} groups={groups} price={price} />
    </div>
  )
}
