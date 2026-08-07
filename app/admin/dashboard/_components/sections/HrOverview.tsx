'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { TriangleAlert, ArrowUpRight, Briefcase, Handshake, UserCheck } from 'lucide-react'
import { cardStyle, cardStyleHero, h3Style } from '../ui/card'
import GaugeRing from '../charts/GaugeRing'
import Skeleton from '@/components/Skeleton'

interface Person {
  id: string
  firstName: string
  lastName: string
  type: 'EMPLOYEE' | 'CONTRACTOR' | 'PARTNER'
  status: 'ACTIVE' | 'ON_LEAVE' | 'INACTIVE'
  department: string | null
  documentCount: number
}

/**
 * HR's landing page: how many people, what kind, who needs attention.
 * The engagement-mix hero mirrors the Finance/Marketing overview treatment —
 * one headline ratio in a dark card, the composition below it.
 */
export default function HrOverview() {
  const [people, setPeople] = useState<Person[] | null>(null)

  useEffect(() => {
    fetch('/api/admin/hr/people')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setPeople(d?.people ?? []))
      .catch(() => setPeople([]))
  }, [])

  const total = people?.length ?? 0
  const employees = people?.filter((p) => p.type === 'EMPLOYEE').length ?? 0
  const contractors = people?.filter((p) => p.type === 'CONTRACTOR').length ?? 0
  const partners = people?.filter((p) => p.type === 'PARTNER').length ?? 0
  const active = people?.filter((p) => p.status === 'ACTIVE').length ?? 0
  const onLeave = people?.filter((p) => p.status === 'ON_LEAVE').length ?? 0
  const activePct = total > 0 ? Math.round((active / total) * 100) : 0
  const tone = activePct >= 80 ? 'good' : activePct >= 50 ? 'warning' : 'critical'
  const statusLabel = activePct >= 80 ? 'Healthy' : activePct >= 50 ? 'Watch' : total === 0 ? 'No one yet' : 'Attention'

  const missingDocs = people?.filter((p) => p.documentCount === 0) ?? []

  const opportunities: { text: string; href: string }[] = []
  if (onLeave > 0) opportunities.push({ text: `${onLeave} ${onLeave === 1 ? 'person is' : 'people are'} on leave right now.`, href: '/admin/dashboard/hr/people' })
  if (missingDocs.length > 0) opportunities.push({ text: `${missingDocs.length} ${missingDocs.length === 1 ? 'person has' : 'people have'} no documents on file yet.`, href: '/admin/dashboard/hr/documents' })
  if (total === 0 && people) opportunities.push({ text: 'No one added yet — start with your first team member.', href: '/admin/dashboard/hr/people' })

  const tiles = [
    { label: 'Employees', value: employees, icon: Briefcase },
    { label: 'Contractors', value: contractors, icon: UserCheck },
    { label: 'Partners', value: partners, icon: Handshake },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(260px,1.1fr) 2fr', gap: 16 }} className="kp-2col">
        <div style={{ ...cardStyleHero, display: 'flex', alignItems: 'center', gap: 18 }}>
          {!people ? (
            <Skeleton width={132} height={132} />
          ) : (
            <GaugeRing value={activePct} centreValue={`${activePct}%`} statusLabel={statusLabel} tone={tone} onDark />
          )}
          <div style={{ minWidth: 0 }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9.5, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--ke-dark-text-muted)', marginBottom: 6 }}>
              Team health
            </div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 26, color: 'var(--color-text-on-ink)' }}>
              {people ? total : <Skeleton width={40} height={26} />}
            </div>
            <div style={{ fontSize: 12.5, color: 'var(--ke-dark-text-muted)', marginTop: 2 }}>people across the business</div>
          </div>
        </div>

        <div className="kad-kpi-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14 }}>
          {tiles.map((t) => (
            <div key={t.label} style={{ ...cardStyle, borderRadius: 16, padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ width: 34, height: 34, borderRadius: 10, background: 'var(--color-primary-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <t.icon size={16} color="var(--color-primary)" />
              </div>
              <div>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 22 }}>{people ? t.value : <Skeleton width={30} height={22} />}</div>
                <div style={{ fontSize: 11, color: 'var(--color-text-subtle)', textTransform: 'uppercase', letterSpacing: '.04em', marginTop: 2 }}>{t.label}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {opportunities.length > 0 && (
        <div style={cardStyle}>
          <h3 style={{ ...h3Style, margin: '0 0 12px' }}>Needs attention</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {opportunities.map((o, i) => (
              <Link key={i} href={o.href} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', border: '1px solid var(--color-border)', borderRadius: 11, fontSize: 13, color: 'var(--color-text)', textDecoration: 'none' }}>
                <TriangleAlert size={15} color="var(--ke-sun-500)" style={{ flexShrink: 0 }} />
                <span style={{ flex: 1 }}>{o.text}</span>
                <ArrowUpRight size={14} color="var(--color-text-subtle)" />
              </Link>
            ))}
          </div>
        </div>
      )}

      <div style={cardStyle}>
        <h3 style={{ ...h3Style, margin: '0 0 4px' }}>Get started</h3>
        <p style={{ fontSize: 12.5, color: 'var(--color-text-muted)', margin: '0 0 12px' }}>
          Add everyone who works with the business — staff on payroll, contractors on a scope, or partners on a standing
          arrangement — then keep their contracts, IDs and personnel files together in Documents.
        </p>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <Link href="/admin/dashboard/hr/people" style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 12.5, color: 'var(--ke-green-700)', textDecoration: 'none' }}>
            Go to People →
          </Link>
          <Link href="/admin/dashboard/hr/documents" style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 12.5, color: 'var(--ke-green-700)', textDecoration: 'none' }}>
            Go to Documents →
          </Link>
        </div>
      </div>
    </div>
  )
}
