import { Suspense } from 'react'
import type { Metadata } from 'next'
import ShopClient from '@/components/shop/ShopClient'
import { getShopProducts } from '@/lib/products'

export const metadata: Metadata = {
  title: 'Shop',
  description: 'Browse power banks, fast chargers, cables, power stations and accessories from Kingston Energies.',
}

// Always reflect the latest DB price/stock (no static caching of the catalog).
export const dynamic = 'force-dynamic'

export default async function ShopPage() {
  const products = await getShopProducts()
  return (
    <Suspense fallback={null}>
      <ShopClient products={products} />
    </Suspense>
  )
}
