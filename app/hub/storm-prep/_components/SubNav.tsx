'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const TABS = [
  { href: '/hub/storm-prep', label: 'Dashboard' },
  { href: '/hub/storm-prep/checklist', label: 'Checklist' },
  { href: '/hub/storm-prep/outage', label: 'Outage' },
  { href: '/hub/storm-prep/energy-budget', label: 'Energy budget' },
  { href: '/hub/storm-prep/brownout', label: 'Brownout' },
  { href: '/hub/storm-prep/solar', label: 'Solar' },
  { href: '/hub/storm-prep/generator', label: 'Generator' },
  { href: '/hub/storm-prep/build-my-system', label: 'Build my system' },
  { href: '/hub/storm-prep/family-plan', label: 'Family plan' },
  { href: '/hub/storm-prep/resources', label: 'Resources' },
]

export default function StormPrepSubNav() {
  const pathname = usePathname()
  return (
    <div style={{ display: 'flex', gap: 8, marginBottom: 18, flexWrap: 'wrap' }}>
      {TABS.map((t) => {
        const active = pathname === t.href
        return (
          <Link
            key={t.href}
            href={t.href}
            style={{
              padding: '8px 16px',
              borderRadius: 999,
              fontFamily: 'var(--font-display)',
              fontWeight: 600,
              fontSize: 13,
              textDecoration: 'none',
              border: active ? '1.5px solid var(--ke-green-500)' : '1.5px solid var(--color-border)',
              background: active ? 'var(--ke-green-50)' : '#fff',
              color: active ? 'var(--ke-green-700)' : 'var(--color-text-muted)',
            }}
          >
            {t.label}
          </Link>
        )
      })}
    </div>
  )
}
