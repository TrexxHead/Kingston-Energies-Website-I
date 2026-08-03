/**
 * Shared constants for last-click campaign attribution — a first-party,
 * functional cookie (same category as the existing cart-id cookie, not
 * third-party analytics), so it's captured unconditionally rather than
 * gated behind analytics consent.
 */
export const CAMPAIGN_CLICK_PARAM = 'ke_campaign'
export const CAMPAIGN_CLICK_COOKIE = 'ke_campaign_click'
export const CAMPAIGN_CLICK_TTL_DAYS = 30

/** A shareable link that, once clicked, attributes any resulting order to this campaign. */
export function campaignTrackingLink(siteUrl: string, campaignId: string, path = '/'): string {
  const sep = path.includes('?') ? '&' : '?'
  return `${siteUrl}${path}${sep}${CAMPAIGN_CLICK_PARAM}=${encodeURIComponent(campaignId)}`
}
