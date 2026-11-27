'use client'

import { useEffect, useMemo, useState } from 'react'
import { History, Trash2, ArrowLeftRight, Plus } from 'lucide-react'
import { card, muted, h2, fmt } from '@/app/my-energy/_components/ui'
import type { ReadingType } from '@/lib/energy/engine/bills'

/**
 * Your bills over time, kept on this device: daily use per bill as a bar
 * chart (one measure, one axis), with a table of the same figures. Daily use
 * — not the bill total — so billing periods of different lengths compare fairly.
 */

export interface HistoryBill {
  periodStart: string
  periodEnd: string
  kwh: number
  days: number
  currentCharges: number
  readingType: ReadingType
}

const KEY = 'ke-bill-history-v1'
const LIMIT = 24
const month = (iso: string) => new Date(`${iso}T12:00:00Z`).toLocaleDateString('en-JM', { month: 'short', year: '2-digit' })

export default function BillHistory({ candidate, onCompare }: { candidate: HistoryBill | null; onCompare: (b: HistoryBill) => void }) {
  const [bills, setBills] = useState<HistoryBill[]>([])
  const [hover, setHover] = useState<number | null>(null)
  const [view, setView] = useState<'chart' | 'table'>('chart')
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(KEY) ?? '[]')
      if (Array.isArray(saved)) setBills(saved)
    } catch {
      /* storage unavailable */
    }
  }, [])
  const save = (next: HistoryBill[]) => {
    const sorted = [...next].sort((a, b) => a.periodEnd.localeCompare(b.periodEnd)).slice(-LIMIT)
    setBills(sorted)
    try {
      localStorage.setItem(KEY, JSON.stringify(sorted))
    } catch {
      /* storage unavailable */
    }
  }
  const already = candidate ? bills.some((b) => b.periodEnd === candidate.periodEnd && b.kwh === candidate.kwh) : true

  const rows = useMemo(() => bills.map((b) => ({ ...b, perDay: b.kwh / Math.max(1, b.days), perKwh: b.kwh > 0 ? b.currentCharges / b.kwh : null })), [bills])
  const maxPerDay = Math.max(1, ...rows.map((r) => r.perDay))
  const avg = rows.length ? rows.reduce((a, r) => a + r.perDay, 0) / rows.length : 0
  const last = rows[rows.length - 1]

  if (!rows.length && !candidate) return null

  const W = 640
  const H = 200
  const pad = { l: 36, r: 8, t: 14, b: 26 }
  const bw = rows.length ? (W - pad.l - pad.r) / rows.length : 0
  const y = (v: number) => pad.t + (H - pad.t - pad.b) * (1 - v / (maxPerDay * 1.1))
  const ticks = [0, 0.5, 1].map((f) => Math.round(maxPerDay * 1.1 * f))

  return (
    <section style={{ ...card, display: 'grid', gap: 12 }} aria-labelledby="hist-title" data-testid="bill-history">
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <h2 id="hist-title" style={h2}>
          <History size={18} aria-hidden style={{ verticalAlign: '-3px' }} /> Your bill history
        </h2>
        {candidate && !already && (
          <button type="button" className="ke-bh-btn" onClick={() => save([...bills, candidate])}>
            <Plus size={14} aria-hidden /> Save this bill to my history
          </button>
        )}
      </div>
      {!rows.length ? (
        <p style={{ ...muted, margin: 0 }}>Save each bill as it comes and you’ll see your use month by month — kept on this device only.</p>
      ) : (
        <>
          <p style={{ ...muted, margin: 0 }}>
            Daily use, kWh per day. Your average is <strong style={{ color: '#fff' }}>{fmt(avg, 1)}</strong>
            {last && rows.length > 1 && (
              <>
                ; the latest bill is <strong style={{ color: '#fff' }}>{last.perDay >= avg ? `${fmt(((last.perDay - avg) / avg) * 100, 0)}% above` : `${fmt(((avg - last.perDay) / avg) * 100, 0)}% below`}</strong> it
              </>
            )}
            .
          </p>
          <div role="tablist" aria-label="Chart or table" style={{ display: 'flex', gap: 6 }}>
            {(['chart', 'table'] as const).map((v) => (
              <button key={v} role="tab" aria-selected={view === v} className="ke-bh-tab" onClick={() => setView(v)}>
                {v === 'chart' ? 'Chart' : 'Table'}
              </button>
            ))}
          </div>
          {view === 'chart' ? (
            <div style={{ position: 'relative' }}>
              <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label={`Daily use for ${rows.length} bills, from ${fmt(Math.min(...rows.map((r) => r.perDay)), 1)} to ${fmt(maxPerDay, 1)} kWh a day`} style={{ display: 'block' }}>
                {ticks.map((t) => (
                  <g key={t}>
                    <line x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} stroke="rgba(255,255,255,.08)" />
                    <text x={pad.l - 6} y={y(t) + 4} fontSize="10" textAnchor="end" fill="var(--ke-dark-text-muted)">{t}</text>
                  </g>
                ))}
                <line x1={pad.l} x2={W - pad.r} y1={y(avg)} y2={y(avg)} stroke="rgba(255,255,255,.35)" strokeDasharray="4 4" />
                {rows.map((r, i) => {
                  const x = pad.l + i * bw + 1
                  const top = y(r.perDay)
                  const w = Math.max(2, Math.min(36, bw - 2))
                  const cx = x + (bw - 2 - w) / 2
                  return (
                    <g key={r.periodEnd + i} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} onFocus={() => setHover(i)} onBlur={() => setHover(null)} tabIndex={0} aria-label={`${month(r.periodEnd)}: ${fmt(r.perDay, 1)} kWh a day`}>
                      <rect x={pad.l + i * bw} y={pad.t} width={bw} height={H - pad.t - pad.b} fill="transparent" />
                      <path d={`M${cx},${y(0)} V${top + 4} Q${cx},${top} ${cx + 4},${top} H${cx + w - 4} Q${cx + w},${top} ${cx + w},${top + 4} V${y(0)} Z`} fill={hover === i ? '#5fe0a5' : 'var(--ke-green-400)'} opacity={r.readingType === 'estimated' ? 0.55 : 1} />
                      {(rows.length <= 12 || i % 2 === rows.length % 2) && (
                        <text x={cx + w / 2} y={H - 8} fontSize="10" textAnchor="middle" fill="var(--ke-dark-text-muted)">{month(r.periodEnd)}</text>
                      )}
                    </g>
                  )
                })}
              </svg>
              {hover != null && rows[hover] && (
                <div className="ke-bh-tip" style={{ left: `${((pad.l + (hover + 0.5) * bw) / W) * 100}%` }}>
                  <strong>{month(rows[hover].periodEnd)}</strong>
                  <span>{fmt(rows[hover].perDay, 1)} kWh a day · {fmt(rows[hover].kwh, 0)} kWh over {rows[hover].days} days</span>
                  <span>J${fmt(rows[hover].currentCharges, 0)} current charges{rows[hover].readingType === 'estimated' ? ' · estimated reading' : ''}</span>
                </div>
              )}
              <p style={{ ...muted, fontSize: 12, margin: '4px 0 0' }}>Dashed line: your average. Paler bars: estimated readings.</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="ke-bh-table">
                <thead>
                  <tr>
                    <th>Bill to</th>
                    <th>Days</th>
                    <th>kWh</th>
                    <th>kWh / day</th>
                    <th>Current charges</th>
                    <th>J$ / kWh</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {[...rows].reverse().map((r) => (
                    <tr key={r.periodEnd + r.kwh}>
                      <td>{r.periodEnd}{r.readingType === 'estimated' ? ' (E)' : ''}</td>
                      <td>{r.days}</td>
                      <td>{fmt(r.kwh, 0)}</td>
                      <td>{fmt(r.perDay, 1)}</td>
                      <td>J${fmt(r.currentCharges, 0)}</td>
                      <td>{r.perKwh != null ? `J$${fmt(r.perKwh, 2)}` : '—'}</td>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        <button type="button" className="ke-bh-icon" aria-label={`Compare with the bill to ${r.periodEnd}`} title="Compare with this bill" onClick={() => onCompare(r)}>
                          <ArrowLeftRight size={14} />
                        </button>
                        <button type="button" className="ke-bh-icon" aria-label={`Remove the bill to ${r.periodEnd}`} title="Remove" onClick={() => save(bills.filter((b) => !(b.periodEnd === r.periodEnd && b.kwh === r.kwh)))}>
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
      <style>{CSS}</style>
    </section>
  )
}

const CSS = `
.ke-bh-btn{display:inline-flex;align-items:center;gap:6px;padding:8px 14px;border-radius:999px;border:1px solid var(--ke-green-400);background:rgba(62,207,142,.1);color:var(--ke-green-400);font-weight:600;font-size:13.5px;cursor:pointer}
.ke-bh-tab{padding:5px 12px;border-radius:999px;border:1px solid rgba(255,255,255,.16);background:transparent;color:var(--ke-dark-text);font-size:12.5px;cursor:pointer}
.ke-bh-tab[aria-selected="true"]{border-color:var(--ke-green-400);background:rgba(62,207,142,.1)}
.ke-bh-tip{position:absolute;top:0;transform:translateX(-50%);display:grid;gap:2px;padding:8px 10px;border-radius:10px;background:#0b1210;border:1px solid rgba(255,255,255,.14);font-size:12px;color:var(--ke-dark-text-muted);pointer-events:none;white-space:nowrap;z-index:2}
.ke-bh-tip strong{color:#fff}
.ke-bh-table{width:100%;border-collapse:collapse;font-size:13px}
.ke-bh-table th{text-align:left;font-weight:600;color:var(--ke-dark-text-muted);padding:6px 8px;border-bottom:1px solid rgba(255,255,255,.1)}
.ke-bh-table td{padding:6px 8px;border-bottom:1px solid rgba(255,255,255,.05);color:#fff}
.ke-bh-icon{background:none;border:0;color:var(--ke-dark-text-muted);cursor:pointer;padding:4px}
.ke-bh-icon:hover{color:#fff}
`
