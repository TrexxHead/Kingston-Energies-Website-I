'use client'

import { useEffect, useMemo, useState } from 'react'
import dynamic from 'next/dynamic'
import { ExternalLink, MapPin } from 'lucide-react'
import { card, label, input, muted, h2 } from '@/app/my-energy/_components/ui'
import type { PublicRecord } from '@/lib/refdata/types'

const ShelterMap = dynamic(() => import('./ShelterMap'), { ssr: false, loading: () => <div className="ke-sr-map" /> })

export interface ShelterPoint {
  name: string
  parish: string
  address?: string | null
  lat?: number | null
  lng?: number | null
}

/**
 * Emergency shelters from the ODPEM list as entered and approved by staff
 * (reference data). Until a list is approved we say so and send people to
 * ODPEM — we never show an unofficial or out-of-date shelter list.
 */
export default function Shelters() {
  const [records, setRecords] = useState<PublicRecord<'shelter_list'>[] | null>(null)
  const [failed, setFailed] = useState(false)
  const [parish, setParish] = useState('')
  useEffect(() => {
    fetch('/api/refdata?kind=shelter_list&all=1')
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => setRecords(d.records ?? []))
      .catch(() => {
        setFailed(true)
        setRecords([])
      })
  }, [])

  const shelters: ShelterPoint[] = useMemo(() => (records ?? []).flatMap((r) => r.data.shelters), [records])
  const parishes = useMemo(() => [...new Set(shelters.map((s) => s.parish))].sort(), [shelters])
  const shown = parish ? shelters.filter((s) => s.parish === parish) : shelters
  const mapped = shown.filter((s) => s.lat != null && s.lng != null)
  const sources = records ?? []

  return (
    <section style={{ ...card, display: 'grid', gap: 14 }} aria-labelledby="sh-title">
      <h2 id="sh-title" style={h2}>Emergency shelters</h2>
      {records === null && <p style={{ ...muted, margin: 0 }}>Loading the shelter list…</p>}
      {records !== null && shelters.length === 0 && (
        <p className="ke-sr-note">
          {failed ? 'We couldn’t load the shelter list just now.' : 'We haven’t published a confirmed shelter list for this season yet.'} ODPEM announces which shelters are open before and during a storm —{' '}
          <a className="ke-sr-link" href="https://www.odpem.org.jm/" target="_blank" rel="noopener noreferrer">
            check ODPEM <ExternalLink size={13} aria-hidden />
          </a>{' '}
          or listen for announcements on local radio.
        </p>
      )}
      {shelters.length > 0 && (
        <>
          <p style={{ ...muted, margin: 0 }}>Not every shelter opens for every storm. Confirm which are open with ODPEM or your parish council before you travel.</p>
          {parishes.length > 1 && (
            <div style={{ maxWidth: 320 }}>
              <label htmlFor="sh-parish" style={label}>Parish</label>
              <select id="sh-parish" style={input} value={parish} onChange={(e) => setParish(e.target.value)}>
                <option value="">All parishes ({shelters.length})</option>
                {parishes.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
          )}
          {mapped.length > 0 && <ShelterMap shelters={mapped} />}
          <ul className="ke-sr-shelters">
            {shown.slice(0, 300).map((s, i) => (
              <li key={`${s.name}-${i}`}>
                <MapPin size={16} aria-hidden />
                <div>
                  <strong>{s.name}</strong>
                  <div style={{ ...muted, fontSize: 12.5 }}>
                    {[s.address, s.parish].filter(Boolean).join(', ')}
                  </div>
                </div>
                {s.lat != null && s.lng != null && (
                  <a className="ke-sr-link" href={`https://www.google.com/maps/dir/?api=1&destination=${s.lat},${s.lng}`} target="_blank" rel="noopener noreferrer">
                    Directions <ExternalLink size={13} aria-hidden />
                  </a>
                )}
              </li>
            ))}
          </ul>
          {shown.length > 300 && <p style={{ ...muted, margin: 0 }}>Showing 300 of {shown.length} — choose a parish to narrow the list.</p>}
          <p style={{ ...muted, fontSize: 12, margin: 0 }}>
            {sources.map((r) => `${r.source.title}, read ${r.source.retrievedAt}`).join(' · ')}
          </p>
        </>
      )}
    </section>
  )
}
