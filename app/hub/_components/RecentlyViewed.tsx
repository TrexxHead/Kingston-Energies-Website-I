'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import ProductImage from '@/components/shop/ProductImage'
import { fmt } from '@/lib/catalog'
import { getRecentlyViewed, type RecentItem } from '@/lib/recentlyViewed'
import { hubCard, hubH3 } from './ui'

export default function RecentlyViewed() {
  const [items, setItems] = useState<RecentItem[]>([])

  useEffect(() => {
    setItems(getRecentlyViewed())
  }, [])

  if (items.length === 0) return null

  return (
    <div style={{ ...hubCard, marginTop: 16 }}>
      <h3 style={hubH3}>Recently viewed</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 12 }}>
        {items.map((p) => (
          <Link key={p.id} href={`/product/${p.id}`} style={{ textDecoration: 'none', color: 'inherit', border: '1px solid var(--color-border)', borderRadius: 12, overflow: 'hidden', display: 'block' }}>
            <div style={{ position: 'relative', width: '100%', aspectRatio: '1', background: '#eef3ee' }}>
              <ProductImage src={p.image} alt={p.name} cat={p.cat as never} sizes="160px" iconSize={26} />
            </div>
            <div style={{ padding: '10px 12px' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 13.5, marginTop: 2 }}>{fmt(p.price)}</div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
