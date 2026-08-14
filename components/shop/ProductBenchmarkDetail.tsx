'use client'

import { useState } from 'react'
import Link from 'next/link'
import { motion, useReducedMotion } from 'framer-motion'
import { fmt, type Product } from '@/lib/catalog'

interface ProductBenchmarkDetailProps {
  /** The comparable set — selected product plus its peers, same category. */
  products: Product[]
  selectedId: string
  onSelect: (id: string) => void
}

type MetricId = 'price' | 'capacity'

interface MetricDef {
  id: MetricId
  label: string
  unit: 'currency' | 'mAh'
  /** How to read a difference from the benchmark — price has no inherent "better" direction. */
  polarity: 'higher-is-better' | 'neutral'
}

const METRICS: MetricDef[] = [
  { id: 'price', label: 'Price', unit: 'currency', polarity: 'neutral' },
  { id: 'capacity', label: 'Capacity', unit: 'mAh', polarity: 'higher-is-better' },
]

function parseCapacity(cap?: string | null): number | null {
  if (!cap) return null
  const digits = cap.replace(/[^\d]/g, '')
  return digits ? Number(digits) : null
}

function metricValue(p: Product, metric: MetricId): number | null {
  if (metric === 'price') return typeof p.price === 'number' ? p.price : null
  return parseCapacity(p.cap)
}

function median(values: number[]): number | null {
  if (values.length === 0) return null
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

function formatValue(v: number, unit: MetricDef['unit']): string {
  return unit === 'currency' ? fmt(Math.round(v)) : `${v.toLocaleString()} mAh`
}

/**
 * A focused, single-product view: pick a product, see it against the median
 * of its peers on one metric at a time. Peer benchmarking only ever uses
 * spec fields already public on the product page (price, capacity) — never
 * internal sales figures, which have no place in a customer-facing surface.
 */
export default function ProductBenchmarkDetail({ products, selectedId, onSelect }: ProductBenchmarkDetailProps) {
  const prefersReducedMotion = useReducedMotion()
  const [metricId, setMetricId] = useState<MetricId>('price')
  const metric = METRICS.find((m) => m.id === metricId)!

  const selected = products.find((p) => p.id === selectedId) ?? products[0]
  if (!selected) {
    return <p style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>No comparable products available.</p>
  }

  const peers = products.filter((p) => p.id !== selected.id)
  const peerValues = peers
    .map((p) => ({ product: p, value: metricValue(p, metricId) }))
    .filter((r): r is { product: Product; value: number } => r.value !== null)
  const selectedValue = metricValue(selected, metricId)
  const benchmark = median(peerValues.map((r) => r.value))

  const allValues = [...peerValues.map((r) => r.value), ...(selectedValue !== null ? [selectedValue] : [])]
  const domainMax = allValues.length ? Math.max(...allValues) * 1.08 : 1
  const domainSpan = Math.max(1e-6, domainMax)
  const pct = (v: number) => Math.min(1, Math.max(0, v / domainSpan))

  const insufficientPeers = peerValues.length < 2

  const diffPct = selectedValue !== null && benchmark ? Math.round(((selectedValue - benchmark) / benchmark) * 100) : null
  const diffLabel = diffPct === null ? null : diffPct === 0 ? 'at the peer median' : `${diffPct > 0 ? diffPct : -diffPct}% ${diffPct > 0 ? 'above' : 'below'} the peer median`

  const rangeLabel = (() => {
    if (selectedValue === null || benchmark === null || benchmark === 0) return null
    const ratio = selectedValue / benchmark
    if (ratio < 0.9) return 'Below range'
    if (ratio > 1.1) return 'Above range'
    return 'Near benchmark'
  })()

  const nearestPeers = [...peerValues]
    .sort((a, b) => Math.abs((a.value ?? 0) - (selectedValue ?? 0)) - Math.abs((b.value ?? 0) - (selectedValue ?? 0)))
    .slice(0, 4)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--color-text-muted)' }}>
            Product
          </span>
          <select
            value={selected.id}
            onChange={(e) => onSelect(e.target.value)}
            style={{ height: 38, padding: '0 12px', borderRadius: 10, border: '1.5px solid var(--color-border)', fontSize: 13.5, fontFamily: 'var(--font-body)', background: '#fff', minWidth: 220 }}
          >
            {products.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </label>
        <div role="group" aria-label="Metric" style={{ display: 'flex', gap: 6 }}>
          {METRICS.map((m) => (
            <button
              key={m.id}
              type="button"
              aria-pressed={metricId === m.id}
              onClick={() => setMetricId(m.id)}
              style={{
                height: 34,
                padding: '0 14px',
                borderRadius: 999,
                fontSize: 12.5,
                fontWeight: 600,
                cursor: 'pointer',
                border: `1.5px solid ${metricId === m.id ? '#0d1714' : 'var(--color-border)'}`,
                background: metricId === m.id ? '#0d1714' : '#fff',
                color: metricId === m.id ? '#fff' : 'var(--color-text)',
              }}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <Link href={`/product/${selected.id}`} style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 18, color: 'var(--color-text)', textDecoration: 'none' }}>
          {selected.name}
        </Link>
        <p style={{ margin: '2px 0 0', fontSize: 12.5, color: 'var(--color-text-muted)' }}>{selected.spec}</p>
      </div>

      {/* KPI */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 26, letterSpacing: '-.01em' }}>
          {selectedValue !== null ? formatValue(selectedValue, metric.unit) : 'N/A'}
        </span>
        <span style={{ fontSize: 12.5, color: 'var(--color-text-muted)' }}>{metric.label}</span>
        {diffLabel && metric.polarity !== 'neutral' ? (
          <span style={{ fontSize: 12.5, fontWeight: 600, color: diffPct !== null && diffPct >= 0 ? 'var(--ke-green-700,#15803d)' : 'var(--ke-sun-600,#b45309)' }}>
            {diffLabel}
          </span>
        ) : diffLabel ? (
          <span style={{ fontSize: 12.5, color: 'var(--color-text-muted)' }}>{diffLabel}</span>
        ) : null}
      </div>

      {/* Bullet benchmark */}
      {insufficientPeers ? (
        <p style={{ fontSize: 12.5, color: 'var(--color-text-muted)', margin: 0 }}>Insufficient peer data for this metric.</p>
      ) : (
        <div>
          <div
            role="img"
            aria-label={
              benchmark !== null && selectedValue !== null
                ? `${selected.name}: ${formatValue(selectedValue, metric.unit)}; peer median of ${peerValues.length} power banks: ${formatValue(benchmark, metric.unit)}; ${diffLabel ?? ''}.`
                : `${selected.name}: ${metric.label} not available.`
            }
            style={{ position: 'relative', height: 30, borderRadius: 8, background: 'var(--ke-gray-100,#eef1ee)', overflow: 'hidden' }}
          >
            {selectedValue !== null && (
              <motion.div
                initial={false}
                animate={{ scaleX: pct(selectedValue) }}
                transition={prefersReducedMotion ? { duration: 0 } : { type: 'spring', stiffness: 260, damping: 32 }}
                style={{ position: 'absolute', inset: 0, transformOrigin: 'left', background: 'var(--ke-green-500)', borderRadius: 8 }}
              />
            )}
            {benchmark !== null && (
              <div
                aria-hidden
                style={{ position: 'absolute', top: -3, bottom: -3, left: `${pct(benchmark) * 100}%`, width: 2, background: 'var(--color-text)' }}
              />
            )}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 10.5, color: 'var(--color-text-subtle)', fontFamily: 'var(--font-mono)' }}>
            <span>0</span>
            {benchmark !== null && <span>Peer median · {formatValue(benchmark, metric.unit)}</span>}
            <span>{formatValue(domainMax, metric.unit)}</span>
          </div>
          <p style={{ margin: '8px 0 0', fontSize: 12, color: 'var(--color-text-muted)' }}>
            {rangeLabel && <strong style={{ color: 'var(--color-text)' }}>{rangeLabel}. </strong>}
            Median of {peerValues.length} other power bank{peerValues.length === 1 ? '' : 's'} in the catalog.
          </p>
        </div>
      )}

      {/* Peers */}
      {nearestPeers.length > 0 && (
        <div>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--color-text-muted)' }}>
            Peer products
          </span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
            {nearestPeers.map(({ product, value }) => (
              <Link
                key={product.id}
                href={`/product/${product.id}`}
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13, textDecoration: 'none', color: 'var(--color-text)', padding: '6px 0', borderBottom: '1px solid var(--color-border)' }}
              >
                <span>{product.name}</span>
                <span style={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{formatValue(value, metric.unit)}</span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
