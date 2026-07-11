'use client'

import { useState } from 'react'

export default function CopyReferral({ code }: { code: string }) {
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard blocked — no-op; the code is visible to copy manually.
    }
  }

  return (
    <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
      <div
        style={{
          flex: 1,
          height: 44,
          display: 'flex',
          alignItems: 'center',
          padding: '0 14px',
          borderRadius: 10,
          background: 'var(--ke-green-50)',
          fontFamily: 'var(--font-mono)',
          fontSize: 14,
          letterSpacing: '.05em',
          color: 'var(--ke-green-700)',
        }}
      >
        {code}
      </div>
      <button
        type="button"
        onClick={copy}
        style={{
          height: 44,
          padding: '0 20px',
          borderRadius: 999,
          border: '1.5px solid var(--ke-green-500)',
          background: '#fff',
          color: 'var(--ke-green-700)',
          fontFamily: 'var(--font-display)',
          fontWeight: 600,
          fontSize: 13.5,
          cursor: 'pointer',
        }}
      >
        {copied ? 'Copied ✓' : 'Copy'}
      </button>
    </div>
  )
}
