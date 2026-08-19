'use client'

import { useState, type ReactNode } from 'react'
import { Calculator, ChevronDown } from 'lucide-react'

/**
 * A collapsible "How was this calculated?" panel — every calculator in
 * Storm Prep should be able to show its own math and assumptions rather
 * than asking someone to trust an opaque number. Collapsed by default so
 * it doesn't compete with the headline figure.
 */
export default function CalcExplainer({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)

  return (
    <div style={{ marginTop: 16, border: '1px solid var(--color-border)', borderRadius: 12, overflow: 'hidden' }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
          padding: '11px 14px', background: 'transparent', border: 'none', cursor: 'pointer',
          fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 12.5, color: 'var(--color-text-muted)',
        }}
      >
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
          <Calculator size={13} /> How was this calculated?
        </span>
        <ChevronDown size={14} style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .15s ease' }} />
      </button>
      {open && (
        <div style={{ padding: '0 14px 14px', fontSize: 12.5, color: 'var(--color-text-muted)', lineHeight: 1.65 }}>
          {children}
        </div>
      )}
    </div>
  )
}
