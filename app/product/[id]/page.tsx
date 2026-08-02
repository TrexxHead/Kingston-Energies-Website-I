import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import ProductClient, { type ProductReview } from '@/components/shop/ProductClient'
import { getShopProduct } from '@/lib/products'
import { prisma } from '@/lib/prisma'
import { fmt } from '@/lib/catalog'
import JsonLd from '@/components/JsonLd'
import { buildBreadcrumbs, productSchema } from '@/lib/structuredData'

// See app/shop/page.tsx for why a short ISR window (not force-dynamic) is
// safe here: checkout re-validates price/stock server-side regardless.
export const revalidate = 20

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  const product = await getShopProduct(id)
  if (!product) return { title: 'Product not found' }
  return {
    title: product.name,
    description: `${product.name}: ${product.spec}. ${fmt(product.price)} at Kingston Energies.`,
  }
}

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const product = await getShopProduct(id)
  if (!product) notFound()

  // Real reviews for this product (guarded so a DB blip can't break the page).
  let reviews: ProductReview[] = []
  try {
    const rows = await prisma.review.findMany({
      where: { productId: id },
      orderBy: { createdAt: 'desc' },
      take: 30,
    })
    reviews = rows.map((r) => ({
      stars: r.rating,
      text: r.body,
      who: (r.author || 'Customer').toUpperCase(),
      date: new Date(r.createdAt).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' }).toUpperCase(),
    }))
  } catch {
    reviews = []
  }

  const breadcrumbs = buildBreadcrumbs([
    { name: 'Home', path: '/' },
    { name: 'Shop', path: '/shop' },
    { name: product.name },
  ])

  return (
    <>
      <JsonLd data={breadcrumbs} />
      <JsonLd data={productSchema(product, `/product/${id}`)} />
      <ProductClient product={product} initialReviews={reviews} />
    </>
  )
}
