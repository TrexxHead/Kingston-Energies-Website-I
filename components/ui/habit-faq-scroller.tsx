'use client'

import type { CSSProperties, ReactNode } from 'react'

export interface FaqItem {
  id: string
  question: string
  answer: string
}

export interface FaqRow {
  id: string
  /** CSS duration, e.g. "55s" — slower reads calmer, not a bug. */
  speed: string
  direction: 'left' | 'right'
  faqItems: FaqItem[]
}

export interface FaqSectionData {
  /** Empty string suppresses the title block — for callers whose own page
   * hero already carries the heading, so it isn't said twice on one page. */
  mainTitle: string
  mainSubtitle: string
  rows: FaqRow[]
}

/**
 * FaqCard
 * A single FAQ card, styled to the marketing site's dark surface (the same
 * --ke-dark-card/--ke-dark-hairline pairing used by the homepage's review
 * carousel), not a generic light Tailwind card — this row runs on dark pages.
 */
export function FaqCard({ question, answer }: Pick<FaqItem, 'question' | 'answer'>) {
  return (
    <div
      className="flex w-80 flex-shrink-0 flex-col items-start gap-3 p-6 sm:w-96"
      style={{ background: 'var(--ke-dark-card)', border: '1px solid var(--ke-dark-hairline)', borderRadius: 20 }}
    >
      <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 17, color: 'var(--ke-dark-text)', margin: 0 }}>
        {question}
      </h3>
      <p style={{ fontFamily: 'var(--font-body)', fontSize: 14.5, lineHeight: 1.6, color: 'var(--ke-dark-text-muted)', margin: 0 }}>
        {answer}
      </p>
    </div>
  )
}

/**
 * HorizontalScroller
 * Wraps children in a seamless, auto-scrolling marquee row. The content is
 * rendered twice back to back so the loop has no visible seam; the whole
 * thing pauses on hover/focus so a question can actually be read, and
 * respects prefers-reduced-motion via the site-wide `.ke-root` rule.
 */
export function HorizontalScroller({
  children,
  speed = '40s',
  direction = 'left',
}: {
  children: ReactNode
  speed?: string
  direction?: 'left' | 'right'
}) {
  const animationClass = direction === 'right' ? 'animate-scroll-horizontal-reverse' : 'animate-scroll-horizontal'
  const style = { '--scroll-duration': speed } as CSSProperties

  return (
    <div className="scroller-mask group relative w-full overflow-hidden">
      <div className={`flex ${animationClass} group-hover:[animation-play-state:paused] group-focus-within:[animation-play-state:paused]`} style={style}>
        <div className="flex flex-shrink-0 items-stretch justify-center gap-6 px-3">{children}</div>
        {/* Duplicate, hidden from assistive tech, so the loop reads as continuous. */}
        <div className="flex flex-shrink-0 items-stretch justify-center gap-6 px-3" aria-hidden="true">
          {children}
        </div>
      </div>
    </div>
  )
}

/**
 * FaqSection
 * Title + subtitle over a stack of auto-scrolling FAQ rows. Content is
 * entirely caller-supplied via `data` — this component owns layout and
 * motion only, never the copy.
 */
export default function FaqSection({ data }: { data: FaqSectionData }) {
  return (
    <div className="relative mx-auto flex w-full max-w-6xl flex-col items-center gap-10 p-4 sm:p-10">
      {data.mainTitle && (
        <div className="z-10 flex max-w-2xl flex-col items-center gap-4 text-center">
          <h2
            style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 800,
              fontSize: 'clamp(28px,4vw,40px)',
              lineHeight: 1.1,
              color: 'var(--ke-dark-text)',
              margin: 0,
              opacity: 0,
              animation: 'fadeInUp 0.7s ease-out 0.2s forwards',
            }}
          >
            {data.mainTitle}
          </h2>
          <p
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: 15,
              lineHeight: 1.6,
              color: 'var(--ke-dark-text-muted)',
              margin: 0,
              opacity: 0,
              animation: 'fadeInUp 0.7s ease-out 0.4s forwards',
            }}
          >
            {data.mainSubtitle}
          </p>
        </div>
      )}

      <div className="z-10 flex w-full flex-col gap-6">
        {data.rows.map((row) => (
          <HorizontalScroller key={row.id} speed={row.speed} direction={row.direction}>
            {row.faqItems.map((item) => (
              <FaqCard key={item.id} question={item.question} answer={item.answer} />
            ))}
          </HorizontalScroller>
        ))}
      </div>
    </div>
  )
}
