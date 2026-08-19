'use client'

import { Phone, ExternalLink, BookOpen } from 'lucide-react'
import Topbar from '../../_components/Topbar'
import { wizardCard } from '../../energy-checkup/_components/shared'
import StormPrepSubNav from '../_components/SubNav'
import { DIRECTORY } from '@/lib/stormPrepDirectory'

export default function DirectoryPage() {
  return (
    <>
      <Topbar title="Storm prep" subtitle="Resource & help directory" />
      <div className="ke-screen" style={{ padding: 32 }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <StormPrepSubNav />

          <div style={{ ...wizardCard, marginBottom: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <BookOpen size={16} color="var(--ke-green-600)" />
              <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 17, margin: 0 }}>Who to contact</h3>
            </div>
            <p style={{ fontSize: 13, color: 'var(--color-text-muted)', margin: '6px 0 0', maxWidth: 620 }}>
              Real Jamaican agencies, not Kingston Energies. This list is manually curated, not a live feed — each
              entry shows where it came from and when it was last checked.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {DIRECTORY.map((entry) => (
              <div key={entry.name} style={wizardCard}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: 220 }}>
                    <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15 }}>{entry.name}</div>
                    <p style={{ fontSize: 12.5, color: 'var(--color-text-muted)', margin: '4px 0 10px', lineHeight: 1.55, maxWidth: 480 }}>
                      {entry.description}
                    </p>
                    <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                      {entry.phone && (
                        <a href={`tel:${entry.phone}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700, color: 'var(--ke-green-700)', textDecoration: 'none' }}>
                          <Phone size={13} /> {entry.phone}
                        </a>
                      )}
                      <a href={entry.url} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--ke-green-600)', textDecoration: 'none' }}>
                        Visit site <ExternalLink size={12} />
                      </a>
                    </div>
                  </div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--color-text-subtle)', textAlign: 'right', flexShrink: 0 }}>
                    <div>SOURCE: {entry.source}</div>
                    <div>LAST CHECKED: {entry.lastReviewed}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}
