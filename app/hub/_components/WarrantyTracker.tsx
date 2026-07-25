import Link from 'next/link'
import { ShieldCheck } from 'lucide-react'
import { hubCard, hubH3 } from './ui'

export interface WarrantyItem {
  name: string
  purchasedAt: Date
  orderNo: string
}

const RETURN_DAYS = 14

/**
 * Honest warranty tracker built from real purchases: shows the 14-day return
 * window countdown per item plus the standing manufacturer warranty. No
 * fabricated fixed-term coverage.
 */
export default function WarrantyTracker({ items }: { items: WarrantyItem[] }) {
  if (items.length === 0) return null

  const now = Date.now()

  return (
    <div style={{ ...hubCard, marginTop: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
        <ShieldCheck size={17} style={{ color: 'var(--ke-green-600)' }} />
        <h3 style={{ ...hubH3, margin: 0 }}>Warranty &amp; returns</h3>
      </div>
      <p style={{ fontSize: 12.5, color: 'var(--color-text-muted)', margin: '4px 0 14px' }}>
        Every purchase includes a 14-day return window and the manufacturer&apos;s warranty.{' '}
        <Link href="/legal/warranty" style={{ color: 'var(--ke-green-700)', textDecoration: 'underline' }}>Read the policy</Link>.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {items.map((it, i) => {
          const daysSince = Math.floor((now - it.purchasedAt.getTime()) / 86400000)
          const returnLeft = RETURN_DAYS - daysSince
          const returnActive = returnLeft > 0
          return (
            <div key={`${it.orderNo}-${it.name}-${i}`} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', border: '1px solid var(--color-border)', borderRadius: 12 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14 }}>{it.name}</div>
                <div style={{ fontSize: 11.5, color: 'var(--color-text-muted)', marginTop: 2 }}>
                  {it.orderNo} · bought {it.purchasedAt.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                </div>
              </div>
              <span
                style={{
                  fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 11.5, padding: '4px 10px', borderRadius: 999,
                  background: returnActive ? 'var(--ke-green-50,#eef7ee)' : 'var(--ke-gray-100,#eef0ee)',
                  color: returnActive ? 'var(--ke-green-700)' : 'var(--color-text-muted)',
                  whiteSpace: 'nowrap',
                }}
              >
                {returnActive ? `Returns: ${returnLeft} day${returnLeft === 1 ? '' : 's'} left` : 'Return window closed'}
              </span>
              <Link href="/hub/support" style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 12, color: 'var(--ke-green-700)', textDecoration: 'none', whiteSpace: 'nowrap' }}>
                Claim →
              </Link>
            </div>
          )
        })}
      </div>
    </div>
  )
}
