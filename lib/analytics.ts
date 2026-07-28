/**
 * Google Analytics 4 utilities, built on `@next/third-parties`.
 *
 * Two deliberate departures from the common version of this pattern:
 *
 * 1. `sendGAEvent` is a raw passthrough to `gtag()` — it pushes its own
 *    arguments onto the dataLayer verbatim (see the installed package's
 *    ga.js). gtag's real signature is `gtag('event', name, params)`, so
 *    calls here are three arguments, not one flattened object. A single-
 *    object call is easy to write, looks plausible, and produces nothing:
 *    gtag's dataLayer processor reads argument 0 as the command name, and
 *    an object there matches no known command.
 * 2. Enabled is gated on `VERCEL_ENV === 'production'` where that's
 *    available, not just `NODE_ENV !== 'development'`. Vercel sets
 *    `NODE_ENV=production` for preview deployments too — every per-branch
 *    preview URL this project already uses would otherwise report into the
 *    same GA4 property as real traffic from kingstonenergies.com, with no
 *    way to tell them apart afterwards.
 *
 * Consent isn't decided here. `components/GoogleAnalytics.tsx` and
 * `components/WebVitals.tsx` don't mount at all until the visitor has
 * actively accepted cookies (see lib/consent.ts) — this file is about
 * environment, consent is a separate gate above it.
 */

export const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || ''

/** True once there's a real measurement ID and this is genuinely production traffic. */
export const isAnalyticsEnabled = (): boolean => {
  if (!GA_MEASUREMENT_ID) return false
  const vercelEnv = process.env.NEXT_PUBLIC_VERCEL_ENV
  if (vercelEnv) return vercelEnv === 'production'
  return process.env.NODE_ENV === 'production'
}

export interface WebVitalsMetric {
  id: string
  name: string
  value: number
  rating?: 'good' | 'needs-improvement' | 'poor'
  delta: number
  label?: string
  attribution?: Record<string, unknown>
}

export interface GAEvent {
  action: string
  category?: string
  label?: string
  value?: number
  custom_parameters?: Record<string, unknown>
}

/**
 * Fires a real GA4 event via gtag's actual command shape. Imported lazily so
 * every page that merely imports this module (most client components on the
 * site) doesn't pull in the GA runtime bytes when analytics never fires.
 */
async function gaEvent(name: string, params: Record<string, unknown>): Promise<void> {
  const { sendGAEvent } = await import('@next/third-parties/google')
  sendGAEvent('event', name, params)
}

/** Reports a Core Web Vitals / Next.js timing metric to GA4. */
export function reportWebVitals(metric: WebVitalsMetric): void {
  if (!isAnalyticsEnabled()) return
  if (metric.label !== 'web-vital') return

  // GA4 custom metrics are integers; CLS is a small fraction (e.g. 0.05), so
  // it's scaled up or it would round to zero every time.
  const value = Math.round(metric.name === 'CLS' ? metric.value * 1000 : metric.value)

  void gaEvent('web_vitals', {
    event_category: 'Web Vitals',
    event_label: metric.name,
    value,
    metric_id: metric.id,
    metric_rating: metric.rating,
    metric_delta: metric.delta,
  })
}

/** Sends a custom event to GA4. */
export function trackEvent(event: GAEvent): void {
  if (!isAnalyticsEnabled()) return
  void gaEvent(event.action, {
    event_category: event.category || 'engagement',
    event_label: event.label,
    value: event.value,
    ...event.custom_parameters,
  })
}

/**
 * Site interactions worth measuring, scoped to what this storefront actually
 * has: a catalog, a cart, checkout, a lead form, and search. No trackers for
 * features the site doesn't have — an unused tracker is dead code, not
 * coverage.
 */
export const analytics = {
  trackExternalLink: (url: string, text?: string) => {
    trackEvent({ action: 'click_external_link', category: 'engagement', label: url, custom_parameters: { link_text: text, link_url: url } })
  },

  trackFormSubmission: (formName: string, success = true) => {
    trackEvent({ action: 'form_submission', category: 'engagement', label: formName, value: success ? 1 : 0, custom_parameters: { form_name: formName } })
  },

  trackSearch: (query: string, results?: number) => {
    trackEvent({ action: 'search', category: 'engagement', label: query, value: results, custom_parameters: { search_term: query, search_results: results } })
  },

  trackSocialInteraction: (network: string, action: string, target?: string) => {
    trackEvent({ action: 'social_interaction', category: 'social', label: `${network}_${action}`, custom_parameters: { social_network: network, social_action: action, social_target: target } })
  },

  /** GA4's standard e-commerce shape — `currency` + `items[]`, so revenue reports work out of the box. */
  trackProductView: (productId: string, productName: string, price: number, currency = 'JMD') => {
    trackEvent({
      action: 'view_item',
      category: 'ecommerce',
      label: productName,
      value: price,
      custom_parameters: { currency, items: [{ item_id: productId, item_name: productName, price }] },
    })
  },

  trackAddToCart: (productId: string, productName: string, quantity: number, price: number, currency = 'JMD') => {
    trackEvent({
      action: 'add_to_cart',
      category: 'ecommerce',
      label: productName,
      value: price * quantity,
      custom_parameters: { currency, items: [{ item_id: productId, item_name: productName, price, quantity }] },
    })
  },

  /** Guard against double-firing on a page refresh — see app/confirm/page.tsx. */
  trackPurchase: (orderId: string, total: number, itemCount: number, currency = 'JMD') => {
    trackEvent({
      action: 'purchase',
      category: 'ecommerce',
      label: orderId,
      value: total,
      custom_parameters: { currency, transaction_id: orderId, item_count: itemCount },
    })
  },
}
