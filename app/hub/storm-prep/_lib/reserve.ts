// Shared between the dashboard (which shows the reserve inline) and the
// Outage/Energy Budget tools (which need the same number to plan against) —
// one definition so they can never disagree.

export interface DeviceSignal {
  name: string
  hasBattery: boolean
  usableWh: number | null
}

export interface ReserveSummary {
  reserveDevices: DeviceSignal[]
  totalReserveWh: number
  unmeasuredBackupDevices: DeviceSignal[]
}

/**
 * Total usable Wh across every registered device with a known real
 * capacity spec. Devices with a battery but no derivable capacity (e.g. a
 * power station with no listed Wh) are returned separately rather than
 * silently dropped, so the total is never presented as "everything you
 * own" when it's really "everything we can measure."
 */
export function computeReserve(devices: DeviceSignal[]): ReserveSummary {
  const reserveDevices = devices.filter((d) => d.usableWh !== null)
  const totalReserveWh = reserveDevices.reduce((sum, d) => sum + (d.usableWh ?? 0), 0)
  const unmeasuredBackupDevices = devices.filter((d) => d.hasBattery && d.usableWh === null)
  return { reserveDevices, totalReserveWh, unmeasuredBackupDevices }
}

export async function fetchDevices(): Promise<DeviceSignal[]> {
  try {
    const res = await fetch('/api/hub/devices')
    if (!res.ok) return []
    const data = (await res.json()) as { devices: DeviceSignal[] }
    return data.devices ?? []
  } catch {
    return []
  }
}
