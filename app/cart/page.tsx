'use client'

export const dynamic = 'force-dynamic'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ShoppingBag, Zap, X, ArrowRight } from 'lucide-react'
import CommerceShell from '@/components/shop/CommerceShell'
import { Button, FeatureIcon, inputStyle } from '@/components/shop/ui'
import { useCart } from '@/components/cart/CartContext'
import { useToast } from '@/components/cart/ToastContext'
import { CATALOG, fmt } from '@/lib/catalog'

const RECO_IDS = ['chcab', 'ch20']

export default function CartPage() {
  const router = useRouter()
  const { items, subtotal, delivery, discount, bulkDiscount, bulkRate, total, promoOn, promoCode, inc, dec, remove, addItem, applyPromo } = useCart()
  const { pushToast } = useToast()
  const [promoVal, setPromoVal] = useState('')

  const empty = items.length === 0
  const countLabel = `${items.reduce((a, c) => a + c.qty, 0)} ITEMS`
  const recos = CATALOG.filter((p) => RECO_IDS.includes(p.id) && !items.some((i) => i.name === p.name))

  const handleApply = async () => {
    const res = await applyPromo(promoVal)
    if (res.valid) {
      setPromoVal('')
      pushToast('tag', 'Promo applied', res.message)
    } else {
      pushToast('x', 'Invalid code', res.message)
    }
  }

  return (
    <CommerceShell>
      <section style={{ maxWidth: 1140, margin: '0 auto', padding: '56px 32px 96px' }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, letterSpacing: '.3em', color: 'var(--ke-green-600)' }}>
          YOUR&nbsp;CART&nbsp;—&nbsp;{countLabel}
        </div>
        <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 'clamp(38px,6vw,52px)', letterSpacing: '-.025em', lineHeight: 1, color: 'var(--color-text)', margin: '16px 0 0' }}>
          Almost yours.
        </h1>

        {empty ? (
          <div style={{ textAlign: 'center', padding: '80px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18 }}>
            <FeatureIcon tone="green" size={64}>
              <ShoppingBag size={26} />
            </FeatureIcon>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 22, color: 'var(--color-text)' }}>Your cart is empty</div>
            <p style={{ fontSize: 15, color: 'var(--color-text-muted)', margin: 0 }}>Power banks, chargers and more are one tap away.</p>
            <Button onClick={() => router.push('/shop')} iconRight={<ArrowRight size={17} />}>Browse the shop</Button>
          </div>
        ) : (
          <div className="kp-2col" style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 24, marginTop: 36, alignItems: 'start' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {items.map((ci) => (
                <div key={ci.name} style={{ display: 'flex', alignItems: 'center', gap: 16, background: '#fff', border: '1px solid var(--color-border)', borderRadius: 18, padding: '16px 20px' }}>
                  <FeatureIcon tone="green" size={40}>
                    <Zap size={18} />
                  </FeatureIcon>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15, color: 'var(--color-text)' }}>{ci.name}</div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '.14em', color: 'var(--color-text-muted)', marginTop: 3 }}>{ci.spec}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 2, border: '1px solid var(--color-border)', borderRadius: 999, padding: 2 }}>
                    <StepBtn label="Decrease" onClick={() => dec(ci.name)}>−</StepBtn>
                    <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14, minWidth: 20, textAlign: 'center' }}>{ci.qty}</span>
                    <StepBtn label="Increase" onClick={() => inc(ci.name)}>+</StepBtn>
                  </div>
                  <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 17, minWidth: 56, textAlign: 'right' }}>{fmt(ci.price * ci.qty)}</span>
                  <button type="button" aria-label="Remove" onClick={() => remove(ci.name)} style={{ width: 30, height: 30, borderRadius: 999, border: 'none', background: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <X size={15} />
                  </button>
                </div>
              ))}

              {recos.length > 0 && (
                <div style={{ marginTop: 16 }}>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '.24em', color: 'var(--color-text-muted)' }}>PAIRS&nbsp;WELL&nbsp;WITH</div>
                  <div className="kp-2col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12 }}>
                    {recos.map((rc) => (
                      <div key={rc.id} style={{ display: 'flex', alignItems: 'center', gap: 12, background: '#fff', border: '1px dashed var(--ke-green-500)', borderRadius: 16, padding: '14px 16px' }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14, color: 'var(--color-text)' }}>{rc.name}</div>
                          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '.16em', color: 'var(--ke-green-700)', marginTop: 3 }}>COMPLETES YOUR KIT</div>
                        </div>
                        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 15 }}>{fmt(rc.price)}</span>
                        <Button size="sm" variant="outline" onClick={() => { addItem({ name: rc.name, price: rc.price, spec: rc.spec }); pushToast('check', 'Added to cart', rc.name) }}>Add</Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div style={{ background: '#fff', border: '1px solid var(--color-border)', borderRadius: 20, padding: 26, boxShadow: 'var(--shadow-md)', position: 'sticky', top: 88 }}>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 18, color: 'var(--color-text)' }}>Summary</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 18, fontSize: 14.5 }}>
                <Row label="Subtotal" value={fmt(subtotal)} />
                <Row label="Delivery" value={delivery === 0 ? 'Free' : fmt(delivery)} valueColor="var(--ke-green-700)" />
                {bulkDiscount > 0 && <Row label={`Bulk discount — ${Math.round(bulkRate * 100)}% off`} value={'−' + fmt(bulkDiscount)} labelColor="var(--ke-green-700)" valueColor="var(--ke-green-700)" />}
                {promoOn && <Row label={`Promo — ${promoCode}`} value={'−' + fmt(discount)} labelColor="var(--ke-green-700)" valueColor="var(--ke-green-700)" />}
                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--color-border)', paddingTop: 12, marginTop: 4 }}>
                  <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700 }}>Total</span>
                  <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 20 }}>{fmt(total)}</span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                <input value={promoVal} onChange={(e) => setPromoVal(e.target.value.toUpperCase())} placeholder="Promo code" style={{ ...inputStyle, flex: 1, minWidth: 0, height: 40, textTransform: 'uppercase' }} />
                <Button size="sm" variant="ghost" onClick={handleApply}>Apply</Button>
              </div>
              <div style={{ marginTop: 16 }}>
                <Button size="lg" block onClick={() => router.push('/checkout')} iconRight={<ArrowRight size={17} />}>Checkout</Button>
              </div>
            </div>
          </div>
        )}
      </section>
    </CommerceShell>
  )
}

function StepBtn({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" aria-label={label} onClick={onClick} style={{ width: 28, height: 28, borderRadius: 999, border: 'none', background: 'none', cursor: 'pointer', fontSize: 16, color: 'var(--color-text)' }}>
      {children}
    </button>
  )
}

function Row({ label, value, labelColor, valueColor }: { label: string; value: string; labelColor?: string; valueColor?: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
      <span style={{ color: labelColor ?? 'var(--color-text-muted)' }}>{label}</span>
      <span style={{ fontWeight: 600, color: valueColor }}>{value}</span>
    </div>
  )
}
