'use client'

import { useId, useState } from 'react'
import { Table2, BarChart3 } from 'lucide-react'
import { cardStyle } from '../ui/card'
import { CHROME } from './palette'

export interface LegendItem {
  label: string
  color: string
  /** Lines key with a stroke, bars and areas with a rect — mirror the mark. */
  shape?: 'line' | 'rect'
  /** Series the reader has switched off. */
  hidden?: boolean
}

interface ChartFrameProps {
  title: string
  subtitle?: string
  /** Present for two or more series; a single series is named by the title. */
  legend?: LegendItem[]
  onToggleSeries?: (label: string) => void
  /** Column headers and rows for the table view every chart falls back to. */
  table?: { columns: string[]; rows: (string | number)[][] }
  /** Shown instead of the plot when there's nothing to draw. */
  empty?: string
  isEmpty?: boolean
  /** Actions for the card header — a range picker, an export. */
  actions?: React.ReactNode
  /** Headline KPI row — current value, change, high/low — between the title
   *  and the plot. Stays inside this one card rather than a second nested one. */
  kpi?: React.ReactNode
  /** Explains what the reader is looking at, under the plot. */
  footnote?: React.ReactNode
  children: React.ReactNode
}

/**
 * The shell every chart sits in.
 *
 * It owns the parts that are the same everywhere — title, legend, the table
 * view, the empty state — so no individual chart has to remember them, and so
 * a value can never be reachable only by hovering.
 */
export default function ChartFrame({
  title,
  subtitle,
  legend,
  onToggleSeries,
  table,
  empty = 'Nothing to chart yet.',
  isEmpty,
  actions,
  kpi,
  footnote,
  children,
}: ChartFrameProps) {
  const [showTable, setShowTable] = useState(false)
  const titleId = useId()

  return (
    <figure style={{ ...cardStyle, margin: 0 }} aria-labelledby={titleId}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 4 }}>
        <figcaption style={{ minWidth: 0 }}>
          <h3 id={titleId} style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15, margin: 0, color: CHROME.text }}>
            {title}
          </h3>
          {subtitle && <p style={{ margin: '2px 0 0', fontSize: 12.5, color: CHROME.textMuted, lineHeight: 1.5 }}>{subtitle}</p>}
        </figcaption>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {actions}
          {table && (
            <button
              type="button"
              onClick={() => setShowTable((v) => !v)}
              aria-pressed={showTable}
              title={showTable ? 'Show the chart' : 'Show the numbers as a table'}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                border: '1px solid var(--color-border)',
                background: 'var(--color-surface)',
                color: CHROME.textMuted,
                borderRadius: 9,
                padding: '5px 9px',
                fontSize: 11.5,
                cursor: 'pointer',
              }}
            >
              {showTable ? <BarChart3 size={13} /> : <Table2 size={13} />}
              {showTable ? 'Chart' : 'Table'}
            </button>
          )}
        </div>
      </div>

      {kpi && <div style={{ margin: '10px 0 6px' }}>{kpi}</div>}

      {legend && legend.length > 1 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, margin: '10px 0 6px' }}>
          {legend.map((l) => {
            const content = (
              <>
                {l.shape === 'line' ? (
                  <span style={{ width: 14, height: 2, borderRadius: 1, background: l.color, opacity: l.hidden ? 0.3 : 1, flexShrink: 0 }} />
                ) : (
                  <span style={{ width: 10, height: 10, borderRadius: 3, background: l.color, opacity: l.hidden ? 0.3 : 1, flexShrink: 0 }} />
                )}
                {/* Text wears text ink, never the series colour — the swatch
                    beside it is what carries identity. */}
                <span style={{ fontSize: 12, color: l.hidden ? CHROME.textSubtle : CHROME.textMuted, textDecoration: l.hidden ? 'line-through' : 'none' }}>
                  {l.label}
                </span>
              </>
            )
            return onToggleSeries ? (
              <button
                key={l.label}
                type="button"
                onClick={() => onToggleSeries(l.label)}
                aria-pressed={!l.hidden}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
              >
                {content}
              </button>
            ) : (
              <span key={l.label} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                {content}
              </span>
            )
          })}
        </div>
      )}

      {isEmpty ? (
        <div style={{ padding: '36px 8px', textAlign: 'center', color: CHROME.textMuted, fontSize: 13, lineHeight: 1.6 }}>{empty}</div>
      ) : showTable && table ? (
        <ChartTable {...table} />
      ) : (
        children
      )}

      {footnote && <div style={{ marginTop: 10, fontSize: 12, color: CHROME.textMuted, lineHeight: 1.55 }}>{footnote}</div>}
    </figure>
  )
}

/** The chart's numbers, for anyone who can't or would rather not hover. */
export function ChartTable({ columns, rows }: { columns: string[]; rows: (string | number)[][] }) {
  return (
    <div style={{ overflowX: 'auto', maxHeight: 320, overflowY: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
        <thead>
          <tr>
            {columns.map((c, i) => (
              <th
                key={c}
                scope="col"
                style={{
                  textAlign: i === 0 ? 'left' : 'right',
                  fontFamily: 'var(--font-mono)',
                  fontSize: 9.5,
                  letterSpacing: '.1em',
                  textTransform: 'uppercase',
                  color: CHROME.textMuted,
                  padding: '7px 8px',
                  borderBottom: '1px solid var(--color-border)',
                  position: 'sticky',
                  top: 0,
                  background: 'var(--color-surface)',
                }}
              >
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, ri) => (
            <tr key={ri}>
              {r.map((cell, ci) => (
                <td
                  key={ci}
                  style={{
                    textAlign: ci === 0 ? 'left' : 'right',
                    padding: '7px 8px',
                    borderBottom: '1px solid var(--color-border)',
                    fontVariantNumeric: ci === 0 ? undefined : 'tabular-nums',
                    color: ci === 0 ? CHROME.text : CHROME.text,
                  }}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
