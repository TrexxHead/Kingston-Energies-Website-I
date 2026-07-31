'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'

/**
 * Pins the customer-facing site to the light theme, regardless of the
 * device's dark-mode setting or a stray `data-theme` left on <html> from a
 * prior visit to /admin (its own theme toggle sets that attribute directly on
 * the shared <html> element, which persists across client-side navigation
 * since <html> never remounts). The storefront's components were never built
 * against the dark palette, so text is either using the light-mode value
 * regardless, or — worse — inheriting an unstyled UA default that a stray
 * dark color-scheme can flip to near-white on a still-light background.
 * Admin owns its own theme (light/dark, user's choice); this only acts
 * outside /admin, so it never fights that toggle.
 */
export default function StorefrontTheme() {
  const pathname = usePathname()

  useEffect(() => {
    if (pathname.startsWith('/admin')) return
    document.documentElement.setAttribute('data-theme', 'light')
  }, [pathname])

  return null
}
