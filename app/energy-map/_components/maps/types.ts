import type { DisplayState } from '@/lib/map/status'

/** What a map view needs to plot one registry station. */
export interface MapStation {
  id: string
  name: string
  lat: number
  lng: number
  statusSummary: string
  markerState: DisplayState
}

/** Shared props, so the two maps can be swapped behind one tab bar. */
export interface MapViewProps {
  stations: MapStation[]
  selected: string | null
  onSelect: (id: string) => void
  /** Selected parish filter ('' for all) — each view frames it in its own way. */
  parish: string
}

export interface MapViewHandle {
  focus: (p: { lat: number; lng: number }, zoom: number) => void
}
