import type { MetadataRoute } from 'next'

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      // Keep private/app areas out of search indexes. /track and /nps are
      // order-specific utility pages — useful only with the right query
      // params, never a page anyone should land on from a search result.
      disallow: ['/admin', '/hub', '/api/', '/track', '/nps'],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  }
}
