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

// Always reflect the latest DB price/stock (no static caching of the catalog).
export const dynamic = 'force-dynamic'

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
