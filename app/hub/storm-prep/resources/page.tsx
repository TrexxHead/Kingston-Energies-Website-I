'use client'

import Link from 'next/link'
import { ShoppingBag } from 'lucide-react'
import Topbar from '../../_components/Topbar'
import { wizardCard } from '../../energy-checkup/_components/shared'
import { CATALOG, fmt, type Product } from '@/lib/catalog'
import { useCart } from '@/components/cart/CartContext'
import { useToast } from '@/components/cart/ToastContext'
import { Button } from '@/components/shop/ui'
import StormPrepSubNav from '../_components/SubNav'

// The catalog's own picks for a storm kit — real products, real prices, no
// invented "kit" SKU. Kept to a short, deliberately chosen list rather than
// every power bank/station in the catalog.
const KIT_PRODUCT_IDS = ['pb10', 'st300', 'chcab']

export default function StormPrepResourcesPage() {
  const { addItem } = useCart()
  const { pushToast } = useToast()
  const kitItems = KIT_PRODUCT_IDS.map((id) => CATALOG.find((p) => p.id === id)).filter((p): p is Product => Boolean(p))

  return (
    <>
      <Topbar title="Storm prep" subtitle="Resources" />
      <div className="ke-screen" style={{ padding: 32 }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <StormPrepSubNav />

          <div style={wizardCard}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <ShoppingBag size={16} color="var(--ke-green-600)" />
              <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 17, margin: 0 }}>Not ready yet?</h3>
            </div>
            <p style={{ fontSize: 13, color: 'var(--color-text-muted)', margin: '6px 0 16px', maxWidth: 560 }}>
              The core of a storm kit — one to charge phones on the go, one to keep bigger essentials running, one to
              keep everything connected.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
              {kitItems.map((p) => (
                <div key={p.id} style={{ border: '1px solid var(--color-border)', borderRadius: 14, padding: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div>
                    <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14 }}>{p.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 2 }}>{fmt(p.price)}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 'auto' }}>
                    <Link href={`/product/${p.id}`} style={{ flex: 1, textDecoration: 'none' }}>
                      <Button size="sm" variant="outline" block>View</Button>
                    </Link>
                    <Button
                      size="sm"
                      onClick={() => {
                        addItem({ name: p.name, price: p.price, spec: p.spec })
                        pushToast('check', 'Added to cart', p.name)
                      }}
                    >
                      Add
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
