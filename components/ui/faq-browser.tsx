'use client'

import { useState } from 'react'
import { List, GalleryHorizontal } from 'lucide-react'
import FaqSection, { type FaqSectionData } from './habit-faq-scroller'

/**
 * Wraps FaqSection with a toggle for people who'd rather read every question
 * in one still, ordered list than watch the auto-scrolling rows — same data,
 * two presentations.
 */
export default function FaqBrowser({ data }: { data: FaqSectionData }) {
  const [view, setView] = useState<'scroll' | 'list'>('scroll')
  const allItems = data.rows.flatMap((r) => r.faqItems)

  return (
    <div className="relative mx-auto w-full max-w-6xl">
      <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 28 }}>
        <ViewButton active={view === 'scroll'} onClick={() => setView('scroll')} icon={<GalleryHorizontal size={14} />}>
          Scrolling
        </ViewButton>
        <ViewButton active={view === 'list'} onClick={() => setView('list')} icon={<List size={14} />}>
          List view
        </ViewButton>
      </div>

      {view === 'scroll' ? (
        <FaqSection data={{ ...data, mainTitle: '', mainSubtitle: '' }} />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 760, margin: '0 auto', padding: '0 16px' }}>
          {allItems.map((item) => (
            <div
              key={item.id}
              style={{ background: 'var(--ke-dark-card)', border: '1px solid var(--ke-dark-hairline)', borderRadius: 16, padding: '20px 22px' }}
            >
              <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15.5, color: 'var(--ke-dark-text)', margin: 0 }}>
                {item.question}
              </h3>
              <p style={{ fontFamily: 'var(--font-body)', fontSize: 14, lineHeight: 1.65, color: 'var(--ke-dark-text-muted)', margin: '8px 0 0' }}>
                {item.answer}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function ViewButton({ active, onClick, icon, children }: { active: boolean; onClick: () => void; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 7,
        height: 34,
        padding: '0 14px',
        borderRadius: 999,
        border: `1.5px solid ${active ? 'var(--ke-green-400)' : 'var(--ke-dark-hairline)'}`,
        background: active ? 'rgba(147,201,63,.14)' : 'transparent',
        color: active ? 'var(--ke-green-400)' : 'rgba(234,242,236,.55)',
        fontFamily: 'var(--font-display)',
        fontWeight: 600,
        fontSize: 12.5,
        cursor: 'pointer',
      }}
    >
      {icon}
      {children}
    </button>
  )
}
