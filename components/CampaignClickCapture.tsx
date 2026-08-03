'use client'

import { Suspense, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { CAMPAIGN_CLICK_PARAM, CAMPAIGN_CLICK_COOKIE, CAMPAIGN_CLICK_TTL_DAYS } from '@/lib/campaignClick'

function Capture() {
  const params = useSearchParams()

  useEffect(() => {
    const id = params.get(CAMPAIGN_CLICK_PARAM)
    if (!id) return
    document.cookie = `${CAMPAIGN_CLICK_COOKIE}=${encodeURIComponent(id)}; path=/; max-age=${60 * 60 * 24 * CAMPAIGN_CLICK_TTL_DAYS}; SameSite=Lax`
  }, [params])

  return null
}

/**
 * Mounted once in the root layout. Whenever a visitor lands via a campaign's
 * tracking link (?ke_campaign=<id>), records it in a first-party cookie so
 * checkout can attribute the resulting order — last click wins, a fresh
 * campaign link overwrites an older one instead of stacking.
 */
export default function CampaignClickCapture() {
  return (
    <Suspense fallback={null}>
      <Capture />
    </Suspense>
  )
}
