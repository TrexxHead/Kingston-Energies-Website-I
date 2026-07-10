import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import ProductClient from '@/components/shop/ProductClient'
import { getShopProduct } from '@/lib/products'
import { fmt } from '@/lib/catalog'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  const product = await getShopProduct(id)
  if (!product) return { title: 'Product not found' }
  return {
    title: product.name,
    description: `${product.name} — ${product.spec}. ${fmt(product.price)} at Kingston Energies.`,
  }
}

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const product = await getShopProduct(id)
  if (!product) notFound()
  return <ProductClient product={product} />
}
