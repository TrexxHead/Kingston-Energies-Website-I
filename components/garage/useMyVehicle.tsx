'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Car } from 'lucide-react'
import { useProfileSnapshot } from '@/lib/energy/useEnergyProfile'
import { primaryVehicle, vehicleName, type Vehicle } from '@/lib/vehicles/vehicle'

/**
 * The visitor's vehicles from My Garage, and which one a tool is using
 * (the main vehicle unless they pick another). `vehicles` is null while loading.
 */
export function useMyVehicle(filter?: (v: Vehicle) => boolean) {
  const { profile } = useProfileSnapshot()
  const all = profile ? (profile.vehicles ?? []) : null
  const vehicles = all ? (filter ? all.filter(filter) : all) : null
  const [pick, setPick] = useState<string | null>(null)
  const vehicle = vehicles ? (vehicles.find((v) => v.clientId === pick) ?? primaryVehicle(vehicles)) : null
  return { vehicles, vehicle, setPick, loading: profile === null }
}

/** “Using your 2024 Nissan Leaf · change” — shown at the top of a tool that read the garage. */
export function VehicleChip({ vehicles, vehicle, onPick, emptyText = 'Add your car in My Garage and this fills itself in.', returnTo }: { vehicles: Vehicle[] | null; vehicle: Vehicle | null; onPick: (id: string) => void; emptyText?: string; returnTo?: string }) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  if (!mounted || vehicles === null) return null
  const href = `/garage${returnTo ? `?from=${encodeURIComponent(returnTo)}` : ''}`
  return (
    <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', padding: '10px 14px', borderRadius: 14, border: '1px solid rgba(62,207,142,.25)', background: 'rgba(62,207,142,.06)', fontSize: 14 }} data-testid="vehicle-chip">
      <Car size={16} aria-hidden style={{ color: 'var(--ke-green-400)' }} />
      {vehicle ? (
        <>
          <span style={{ color: '#fff' }}>
            Using {vehicles.length > 1 ? '' : 'your '}
            {vehicles.length > 1 ? (
              <select aria-label="Which vehicle" value={vehicle.clientId} onChange={(e) => onPick(e.target.value)} style={{ background: 'transparent', color: '#fff', border: '1px solid rgba(255,255,255,.2)', borderRadius: 8, padding: '2px 6px' }}>
                {vehicles.map((v) => (
                  <option key={v.clientId} value={v.clientId} style={{ color: '#000' }}>
                    {vehicleName(v)}
                  </option>
                ))}
              </select>
            ) : (
              <strong>{vehicleName(vehicle)}</strong>
            )}{' '}
            from My Garage
          </span>
          <Link href={href} style={{ color: 'var(--ke-green-400)', fontWeight: 600 }}>
            Edit
          </Link>
        </>
      ) : (
        <span style={{ color: 'var(--ke-dark-text-muted)' }}>
          {emptyText}{' '}
          <Link href={href} style={{ color: 'var(--ke-green-400)', fontWeight: 600 }}>
            Open My Garage
          </Link>
        </span>
      )}
    </div>
  )
}
