import { describe, it, expect } from 'vitest'
import { zipSync, strToU8 } from 'fflate'
import { kmlFromKmz, conePolygons, trackFeatures, placesInCone, inside } from '@/lib/storm/cone'
import { parseCurrentStorms } from '@/lib/storm/nhc'

// Synthetic KML in NHC's cone/track shape (Placemark → Polygon/outerBoundaryIs; LineString; Points).
const coneKml = `<?xml version="1.0"?><kml><Document><Placemark><name>TEST cone</name><Polygon><outerBoundaryIs><LinearRing><coordinates>
-80,16,0 -75,16,0 -75,19,0 -80,19,0 -80,16,0</coordinates></LinearRing></outerBoundaryIs></Polygon></Placemark></Document></kml>`
const trackKml = `<kml><Document><Placemark><LineString><coordinates>-70,15,0 -74,16.5,0 -78,18,0</coordinates></LineString></Placemark>
<Placemark><name><![CDATA[8 AM Sat]]></name><Point><coordinates>-74,16.5,0</coordinates></Point></Placemark></Document></kml>`

describe('NHC cone', () => {
  it('unzips a KMZ and reads the cone, track and points', () => {
    const kml = kmlFromKmz(zipSync({ 'al05_cone.kml': strToU8(coneKml) }))!
    const rings = conePolygons(kml)
    expect(rings).toHaveLength(1)
    expect(rings[0][0]).toEqual([-80, 16])
    const t = trackFeatures(trackKml)
    expect(t.line).toHaveLength(3)
    expect(t.points).toEqual([{ at: [-74, 16.5], label: '8 AM Sat' }])
    expect(kmlFromKmz(new Uint8Array([1, 2, 3]))).toBeNull()
  })
  it('says which Jamaican places NHC’s cone covers', () => {
    const rings = conePolygons(coneKml)
    expect(placesInCone(rings)).toContain('Kingston')
    expect(inside([-70, 10], rings[0])).toBe(false)
    expect(placesInCone([[[-60, 10], [-59, 10], [-59, 11], [-60, 11], [-60, 10]]])).toEqual([])
  })
  it('takes cone/track links only from NHC', () => {
    const feed = { activeStorms: [{ id: 'al052026', name: 'Test', latitudeNumeric: 16, longitudeNumeric: -74, lastUpdate: '2026-10-18T12:00:00Z', classification: 'HU', intensity: '90', trackCone: { kmzFile: 'https://www.nhc.noaa.gov/storm_graphics/api/AL052026_CONE_latest.kmz' }, forecastTrack: { kmzFile: 'https://evil.example/x.kmz' } }] }
    const s = parseCurrentStorms(feed)!.storms[0]
    expect(s.coneKmzUrl).toMatch(/nhc\.noaa\.gov/)
    expect(s.trackKmzUrl).toBeNull()
  })
})
