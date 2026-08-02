import { Suspense } from 'react'
import type { Metadata } from 'next'
import ShopClient from '@/components/shop/ShopClient'
import { getShopProducts } from '@/lib/products'
import JsonLd from '@/components/JsonLd'
import { buildBreadcrumbs } from '@/lib/structuredData'

export const metadata: Metadata = {
  title: 'Shop',
  description: 'Browse power banks, fast chargers, cables, power stations and accessories from Kingston Energies.',
}

// Cached briefly instead of hitting the DB on every view — a 20s-stale price/
// stock display is imperceptible to a shopper, and checkout re-validates both
// server-side regardless (see lib/cartValidation.ts, lib/orderFulfillment.ts),
// so nothing downstream trusts this snapshot. Cuts DB load under a traffic
// spike (an ad campaign, a sale) roughly in proportion to how much traffic
// arrives within the same 20s window.
export const revalidate = 20

const breadcrumbs = buildBreadcrumbs([{ name: 'Home', path: '/' }, { name: 'Shop' }])

export default async function ShopPage() {
  const products = await getShopProducts()
  return (
    <>
      <JsonLd data={breadcrumbs} />
      <Suspense fallback={null}>
        <ShopClient products={products} />
      </Suspense>
    </>
  )
}
