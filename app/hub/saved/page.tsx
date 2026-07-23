import Link from 'next/link'
import { getServerSession } from 'next-auth'
import { Heart } from 'lucide-react'
import { authOptions } from '@/lib/authOptions'
import { prisma } from '@/lib/prisma'
import { fmt } from '@/lib/catalog'
import { getShopProducts } from '@/lib/products'
import Topbar from '../_components/Topbar'
import { hubScreen, hubCard } from '../_components/ui'
import ProductImage from '@/components/shop/ProductImage'

export default async function HubSavedPage() {
  const session = await getServerSession(authOptions)
  const favorites = session?.user?.id
    ? await prisma.favorite.findMany({ where: { userId: session.user.id }, orderBy: { createdAt: 'desc' } })
    : []

  const savedIds = new Set(favorites.map((f) => f.productId))
  const all = await getShopProducts()
  const products = all.filter((p) => savedIds.has(p.id))

  return (
    <>
      <Topbar title="Saved" subtitle="Products you've favourited" />
      <div className="ke-screen" style={hubScreen}>
        {products.length === 0 ? (
          <div style={{ ...hubCard, textAlign: 'center', padding: '48px 24px' }}>
            <Heart size={26} style={{ color: 'var(--ke-green-600)', margin: '0 auto 12px' }} />
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 17 }}>Nothing saved yet</div>
            <p style={{ fontSize: 13.5, color: 'var(--color-text-muted)', margin: '8px 0 18px' }}>
              Tap <strong>Save</strong> on any product to keep it here for later.
            </p>
            <Link href="/shop" style={{ display: 'inline-block', padding: '11px 22px', borderRadius: 999, background: 'var(--color-primary)', color: '#fff', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 14, textDecoration: 'none' }}>
              Browse the shop
            </Link>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
            {products.map((p) => (
              <Link key={p.id} href={`/product/${p.id}`} style={{ ...hubCard, padding: 14, textDecoration: 'none', color: 'inherit', display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ position: 'relative', width: '100%', aspectRatio: '1', borderRadius: 12, overflow: 'hidden', background: '#eef3ee' }}>
                  <ProductImage src={p.image} alt={p.name} cat={p.cat} sizes="240px" />
                </div>
                <div>
                  <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14.5 }}>{p.name}</div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
                    <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 15 }}>{fmt(p.price)}</span>
                    <span style={{ fontSize: 11.5, color: p.inStock ? 'var(--ke-green-700)' : 'var(--color-text-muted)' }}>
                      {p.inStock ? 'In stock' : 'Sold out'}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </>
  )
}
