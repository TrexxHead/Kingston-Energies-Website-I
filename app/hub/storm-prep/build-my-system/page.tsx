'use client'

import { Check, ShoppingCart, Wrench } from 'lucide-react'
import Topbar from '../../_components/Topbar'
import { wizardCard } from '../../energy-checkup/_components/shared'
import { fmt } from '@/lib/catalog'
import { useCart } from '@/components/cart/CartContext'
import { useToast } from '@/components/cart/ToastContext'
import { Button } from '@/components/shop/ui'
import StormPrepSubNav from '../_components/SubNav'
import { resolveTiers } from '@/lib/energyCheckup/backupSystemTiers'

const TIERS = resolveTiers()

export default function BuildMySystemPage() {
  const { addItem } = useCart()
  const { pushToast } = useToast()

  function addTier(tierLabel: string, products: ReturnType<typeof resolveTiers>[number]['products']) {
    for (const p of products) {
      addItem({ name: p.name, price: p.price, spec: p.spec })
    }
    pushToast('check', `${tierLabel} kit added`, `${products.length} item${products.length === 1 ? '' : 's'} added to your cart`)
  }

  return (
    <>
      <Topbar title="Storm prep" subtitle="Build my backup system" />
      <div className="ke-screen" style={{ padding: 32 }}>
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          <StormPrepSubNav />

          <div style={{ ...wizardCard, marginBottom: 22 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <Wrench size={16} color="var(--ke-green-600)" />
              <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 17, margin: 0 }}>Pick a backup tier</h3>
            </div>
            <p style={{ fontSize: 13, color: 'var(--color-text-muted)', margin: '6px 0 0', maxWidth: 640 }}>
              Preparedness first, sales second — these are the same products in the shop, grouped by what they
              actually cover during an outage, cheapest to most complete.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
            {TIERS.map((tier) => (
              <div key={tier.id} style={{ ...wizardCard, display: 'flex', flexDirection: 'column' }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--color-text-subtle)' }}>
                  {tier.label}
                </div>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 15.5, margin: '4px 0 2px' }}>{tier.tagline}</div>
                <p style={{ fontSize: 12.5, color: 'var(--color-text-muted)', margin: '0 0 14px', lineHeight: 1.55 }}>{tier.covers}</p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16, flex: 1 }}>
                  {tier.products.map((p) => (
                    <div key={p.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                      <Check size={13} color="var(--ke-green-600)" style={{ flexShrink: 0, marginTop: 3 }} />
                      <div>
                        <div style={{ fontSize: 12.5, fontWeight: 600 }}>{p.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--color-text-subtle)' }}>{fmt(p.price)}</div>
                      </div>
                    </div>
                  ))}
                </div>

                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 24, marginBottom: 12 }}>{fmt(tier.totalPrice)}</div>

                <Button block iconLeft={<ShoppingCart size={15} />} onClick={() => addTier(tier.label, tier.products)}>
                  Add {tier.label} kit to cart
                </Button>
              </div>
            ))}
          </div>

          <p style={{ fontSize: 12, color: 'var(--color-text-subtle)', marginTop: 20, maxWidth: 640 }}>
            Not sure which tier fits your household? Run the <a href="/hub/energy-checkup" style={{ color: 'var(--ke-green-600)' }}>Energy Checkup</a> first
            — it estimates what you actually need to keep running.
          </p>
        </div>
      </div>
    </>
  )
}
