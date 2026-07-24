'use client'

/**
 * Next.js re-mounts this template on every navigation, so wrapping the page in
 * an animated element gives a smooth site-wide page-transition (fade + rise +
 * subtle blur). Reduced-motion users get it instantly via the global guard.
 */
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="ke-page">{children}</div>
}
