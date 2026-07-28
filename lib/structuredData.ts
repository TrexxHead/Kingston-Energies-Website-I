import type { ShopProduct } from '@/lib/catalog'

/**
 * JSON-LD structured data for Google rich results.
 *
 * Every field below is sourced from something the site already states
 * elsewhere — the footer's contact details, the admin-managed catalog, real
 * review aggregates. Nothing here is invented to look more complete than the
 * business actually is: no fabricated founder, founding date, street address
 * or ratings. Schema.org has a name for marking up content that isn't
 * genuinely on the page, and it's a policy violation, not a growth hack.
 */

export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://kingstonenergies.com'

export function absoluteUrl(path: string): string {
  if (/^https?:\/\//.test(path)) return path
  return `${SITE_URL}${path.startsWith('/') ? path : `/${path}`}`
}

/**
 * The organisation, once, describing the business as a whole.
 * No street address — Kingston Energies delivers islandwide rather than
 * trading from a walk-in premises, so LocalBusiness markup doesn't apply and
 * only the operating country is stated.
 */
export function organizationSchema() {
  return {
    '@type': 'Organization',
    '@id': `${SITE_URL}/#organization`,
    name: 'Kingston Energies',
    url: SITE_URL,
    logo: absoluteUrl('/images/logo-mark.png'),
    description:
      'Premium portable power for everyone — power banks, fast chargers, cables and power stations, built in Kingston, Jamaica.',
    email: 'kingstonenergygroup@outlook.com',
    telephone: '+1-876-338-9958',
    address: { '@type': 'PostalAddress', addressCountry: 'JM' },
    areaServed: 'JM',
    sameAs: ['https://instagram.com/kingstonenergies'],
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'customer service',
      telephone: '+1-876-338-9958',
      email: 'kingstonenergygroup@outlook.com',
      url: absoluteUrl('/contact'),
    },
  }
}

/**
 * The site as a whole. No `potentialAction`/`SearchAction`: the storefront
 * search is a client-side component, not a `?q=` URL Google could actually
 * query, and advertising a search endpoint that doesn't work that way would
 * be structured data describing a feature the site doesn't have.
 */
export function websiteSchema() {
  return {
    '@type': 'WebSite',
    '@id': `${SITE_URL}/#website`,
    name: 'Kingston Energies',
    url: SITE_URL,
    description: 'Portable power banks, fast chargers, cables and power stations, built in Kingston, Jamaica.',
    inLanguage: 'en-JM',
    publisher: { '@id': `${SITE_URL}/#organization` },
  }
}

/** The global graph mounted on every page: who the business is and what the site is. */
export function siteGraph() {
  return { '@context': 'https://schema.org', '@graph': [organizationSchema(), websiteSchema()] }
}

export interface Crumb {
  name: string
  /** Omit on the final (current-page) crumb — Google uses the current URL for that one. */
  path?: string
}

/** A breadcrumb trail reflecting where the page sits in the site, not its URL structure. */
export function buildBreadcrumbs(crumbs: Crumb[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((crumb, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: crumb.name,
      ...(crumb.path ? { item: absoluteUrl(crumb.path) } : {}),
    })),
  }
}

/**
 * A product listing.
 *
 * `aggregateRating` is included only when the product has real reviews —
 * fabricating a rating to make a new listing look established is exactly
 * what Google's guidelines call out by name. `brand` is included only when
 * the admin catalog has actually recorded a manufacturer; Kingston Energies
 * is the seller, not necessarily the maker, so it's marked as `seller`
 * rather than guessed at as `brand`.
 */
export function productSchema(product: ShopProduct, url: string) {
  const images = (product.gallery?.length ? product.gallery : product.image ? [product.image] : []).map(absoluteUrl)

  const description =
    product.shortDescription ||
    product.longDescription ||
    `${product.name} — ${product.spec}`.trim()

  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description,
    ...(images.length ? { image: images } : {}),
    ...(product.brand ? { brand: { '@type': 'Brand', name: product.brand } } : {}),
    seller: { '@id': `${SITE_URL}/#organization` },
    offers: {
      '@type': 'Offer',
      url: absoluteUrl(url),
      priceCurrency: 'JMD',
      price: String(product.price),
      availability: product.inStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      seller: { '@id': `${SITE_URL}/#organization` },
    },
    ...(product.reviewCount && product.reviewCount > 0 && product.rating
      ? {
          aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: product.rating,
            reviewCount: product.reviewCount,
          },
        }
      : {}),
  }
}
