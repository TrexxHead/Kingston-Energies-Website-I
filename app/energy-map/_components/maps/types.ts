import type { DisplayState } from '@/lib/map/status'
import type { OperatorPrice } from '@/lib/refdata/chargingPrice'

/** What a map view needs to plot (and summarise) one registry station. */
export interface MapStation {
  id: string
  name: string
  lat: number
  lng: number
  statusSummary: string
  markerState: DisplayState
  /** Who confirmed the status and when, e.g. "Confirmed working by Kingston Energies 2 days ago." */
  statusDetail: string
  /** Operator · parish · address, already joined. */
  subtitle: string
  /** e.g. "Type 2 · AC · up to 7 kW · 2 connectors". */
  connectorsLine: string
  directionsUrl: string
  /** The operator's approved published price, when we have one. */
  price?: OperatorPrice | null
}

/** Shared props, so the two maps can be swapped behind one tab bar. */
export interface MapViewProps {
  stations: MapStation[]
  selected: string | null
  onSelect: (id: string | null) => void
  /** Scroll the page to a station's full details in the list. */
  onShowDetails: (id: string) => void
  /** Selected parish filter ('' for all) — each view frames it in its own way. */
  parish: string
  /** The visitor's location, once they tap locate/Nearby. */
  me: { lat: number; lng: number } | null
  onLocate: () => void
}

export interface MapViewHandle {
  focus: (p: { lat: number; lng: number }, zoom: number) => void
}
