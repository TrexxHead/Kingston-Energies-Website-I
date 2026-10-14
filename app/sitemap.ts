import type { MetadataRoute } from 'next'
import { CATALOG } from '@/lib/catalog'
import { prisma } from '@/lib/prisma'
import { stationSlug } from '@/lib/map/stationSlug'

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'

// Station pages come from the database; refresh the sitemap hourly.
export const revalidate = 3600

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes = [
    '', '/shop', '/services', '/about', '/contact', '/faq',
    '/find-my-power', '/business-power-continuity', '/bulk-corporate', '/back-in-stock', '/guides/what-will-this-power',
    '/my-energy', '/energy-map', '/solar', '/bill-explainer', '/ev-costs', '/storm-ready',
    '/legal/privacy', '/legal/terms', '/legal/returns', '/legal/warranty', '/legal/delivery',
  ]

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

  // Published chargers (closed ones keep their page but drop out of the sitemap).
  let stationEntries: MetadataRoute.Sitemap = []
  try {
    const stations = await prisma.evStation.findMany({ where: { status: 'published' }, select: { id: true, name: true, updatedAt: true } })
    stationEntries = stations.map((s) => ({ url: `${siteUrl}/energy-map/station/${stationSlug(s)}`, lastModified: s.updatedAt, changeFrequency: 'weekly', priority: 0.6 }))
  } catch (e) {
    console.warn('[sitemap] stations unavailable:', (e as Error).message)
  }

  return [...staticEntries, ...productEntries, ...stationEntries]
}
