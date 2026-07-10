import type { MetadataRoute } from 'next'
import { CATALOG } from '@/lib/catalog'

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'

export default function sitemap(): MetadataRoute.Sitemap {
  const staticRoutes = ['', '/shop', '/services', '/about', '/contact', '/track', '/legal/privacy', '/legal/terms', '/legal/returns', '/legal/warranty']

  const staticEntries: MetadataRoute.Sitemap = staticRoutes.map((path) => ({
    url: `${siteUrl}${path}`,
    lastModified: new Date(),
    changeFrequency: path === '' || path === '/shop' ? 'weekly' : 'monthly',
    priority: path === '' ? 1 : path === '/shop' ? 0.9 : 0.6,
  }))

  const productEntries: MetadataRoute.Sitemap = CATALOG.map((p) => ({
    url: `${siteUrl}/product/${p.id}`,
    lastModified: new Date(),
    changeFrequency: 'weekly',
    priority: 0.8,
  }))

  return [...staticEntries, ...productEntries]
}
