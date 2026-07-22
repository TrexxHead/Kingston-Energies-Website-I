'use client'

import { useEffect, useState } from 'react'
import { cardStyle, h3Style } from '../ui/card'
import type { NpsSummary, NpsSource } from '@/lib/crm'

interface RecentResponse {
  score: number
  source: NpsSource
  comment: string | null
  orderNo: string | null
  date: string
}

interface NpsData {
  overall: NpsSummary
  order: NpsSummary
  support: NpsSummary
  recent: RecentResponse[]
}

/** NPS colour by conventional bands: <0 red, 0–30 amber, 30+ green. */
function npsColor(score: number): string {
  if (score < 0) return 'var(--color-danger)'
  if (score < 30) return 'var(--ke-sun-500)'
  return 'var(--ke-green-600)'
}

export default function NpsCard() {
  const [data, setData] = useState<NpsData | null>(null)

  useEffect(() => {
    let active = true
    fetch('/api/admin/nps')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (active && d) setData(d)
      })
      .catch(() => {})
    return () => {
      active = false
    }
  }, [])

  const overall = data?.overall
  const empty = !overall || overall.total === 0

  return (
    <div style={cardStyle}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
        <h3 style={{ ...h3Style, margin: 0 }}>Net Promoter Score</h3>
        <span style={{ fontSize: 11, color: 'var(--color-text-subtle)' }}>
          {overall ? `${overall.total} responses` : '—'}
        </span>
      </div>

      {empty ? (
        <p style={{ fontSize: 12.5, color: 'var(--color-text-muted)', margin: '14px 0 0' }}>
          No survey responses yet. NPS is collected after each order and after a Jordyn support chat.
        </p>
      ) : (
        <>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 14, marginTop: 10 }}>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 40, lineHeight: 1, color: npsColor(overall.score) }}>
              {overall.score}
            </div>
            <div style={{ fontSize: 11.5, color: 'var(--color-text-muted)', paddingBottom: 4 }}>
              <span style={{ color: 'var(--ke-green-600)' }}>{overall.promoters} promoters</span> ·{' '}
              {overall.passives} passives ·{' '}
              <span style={{ color: 'var(--color-danger)' }}>{overall.detractors} detractors</span>
            </div>
          </div>

          {/* Distribution bar */}
          <div style={{ display: 'flex', height: 8, borderRadius: 999, overflow: 'hidden', marginTop: 12, background: 'var(--ke-gray-100)' }}>
            <Segment count={overall.promoters} total={overall.total} color="var(--ke-green-500)" />
            <Segment count={overall.passives} total={overall.total} color="var(--ke-gray-300, #d6dbd7)" />
            <Segment count={overall.detractors} total={overall.total} color="var(--color-danger)" />
          </div>

          <div style={{ display: 'flex', gap: 20, marginTop: 14 }}>
            <SourceStat label="After orders" summary={data!.order} />
            <SourceStat label="After Jordyn" summary={data!.support} />
          </div>

          {data!.recent.length > 0 && (
            <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--color-border)' }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-subtle)', letterSpacing: '.08em', marginBottom: 8 }}>
                RECENT COMMENTS
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {data!.recent.slice(0, 4).map((r, i) => (
                  <div key={i} style={{ fontSize: 12.5 }}>
                    <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, color: npsColor(r.score >= 9 ? 40 : r.score >= 7 ? 10 : -1) }}>
                      {r.score}
                    </span>{' '}
                    <span style={{ color: 'var(--color-text-subtle)' }}>
                      · {r.source === 'ORDER' ? 'Order' : 'Support'} · {r.date}
                    </span>
                    <div style={{ color: 'var(--color-text-muted)' }}>&ldquo;{r.comment}&rdquo;</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function Segment({ count, total, color }: { count: number; total: number; color: string }) {
  if (count === 0) return null
  return <div style={{ width: `${(count / total) * 100}%`, background: color }} />
}

function SourceStat({ label, summary }: { label: string; summary: NpsSummary }) {
  return (
    <div>
      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 18, color: summary.total === 0 ? 'var(--color-text-subtle)' : npsColor(summary.score) }}>
        {summary.total === 0 ? '—' : summary.score}
      </div>
      <div style={{ fontSize: 10.5, color: 'var(--color-text-muted)' }}>
        {label} ({summary.total})
      </div>
    </div>
  )
}
