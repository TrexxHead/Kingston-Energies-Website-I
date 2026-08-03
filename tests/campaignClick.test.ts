import { describe, it, expect } from 'vitest'
import { campaignTrackingLink, CAMPAIGN_CLICK_PARAM } from '@/lib/campaignClick'

describe('campaignTrackingLink', () => {
  it('builds a link with the campaign id as a query param', () => {
    const link = campaignTrackingLink('https://kingstonenergies.com', 'camp123')
    expect(link).toBe(`https://kingstonenergies.com/?${CAMPAIGN_CLICK_PARAM}=camp123`)
  })

  it('appends with & when the path already has a query string', () => {
    const link = campaignTrackingLink('https://kingstonenergies.com', 'camp123', '/shop?category=powerbanks')
    expect(link).toBe(`https://kingstonenergies.com/shop?category=powerbanks&${CAMPAIGN_CLICK_PARAM}=camp123`)
  })

  it('URL-encodes the campaign id', () => {
    const link = campaignTrackingLink('https://kingstonenergies.com', 'a b/c')
    expect(link).toContain(`${CAMPAIGN_CLICK_PARAM}=a%20b%2Fc`)
  })
})
