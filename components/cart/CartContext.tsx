'use client'

import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { FREE_DELIVERY_THRESHOLD, DELIVERY_FEE, bulkDiscountForLines, firstOrderDiscount } from '@/lib/pricing'
import { pointsToValue } from '@/lib/loyalty'

export interface CartItem {
  name: string
  price: number
  spec: string
  qty: number
}

interface CartContextValue {
  items: CartItem[]
  count: number
  subtotal: number
  delivery: number
  discount: number
  bulkDiscount: number
  bulkRate: number
  firstOrderEligible: boolean
  firstOrderDiscountAmt: number
  total: number
  promoOn: boolean
  promoCode: string | null
  pointsApplied: number
  pointsDiscount: number
  hydrated: boolean
  addItem: (item: Omit<CartItem, 'qty'>) => void
  inc: (name: string) => void
  dec: (name: string) => void
  remove: (name: string) => void
  clear: () => void
  applyPromo: (code: string) => Promise<{ valid: boolean; message: string }>
  removePromo: () => void
  applyPoints: (points: number) => void
  removePoints: () => void
  setFirstOrderEligible: (eligible: boolean) => void
}

interface AppliedPromo {
  code: string
  type: 'PERCENT' | 'FIXED'
  value: number
}

const CartContext = createContext<CartContextValue | null>(null)

const STORAGE_KEY = 'ke-cart'
const PROMO_KEY = 'ke-promo'
const POINTS_KEY = 'ke-points-applied'
const CART_ID_KEY = 'ke-cart-id'

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([])
  const [promo, setPromo] = useState<AppliedPromo | null>(null)
  const [pointsApplied, setPointsApplied] = useState(0)
  const [firstOrderEligible, setFirstOrderEligible] = useState(false)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) setItems(JSON.parse(raw))
      const p = localStorage.getItem(PROMO_KEY)
      if (p) setPromo(JSON.parse(p))
      const pts = localStorage.getItem(POINTS_KEY)
      if (pts) setPointsApplied(Number(pts) || 0)
    } catch {
      // ignore malformed storage
    }
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (!hydrated) return
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  }, [items, hydrated])

  // Persist a server-side cart snapshot (debounced) for abandoned-cart +
  // conversion analytics. Best-effort; failures are ignored.
  useEffect(() => {
    if (!hydrated) return
    let cartId = ''
    try {
      cartId = localStorage.getItem(CART_ID_KEY) ?? ''
      if (!cartId) {
        cartId = (crypto?.randomUUID?.() ?? `c-${Date.now()}-${Math.random().toString(36).slice(2)}`)
        localStorage.setItem(CART_ID_KEY, cartId)
      }
    } catch {
      return
    }
    const total = items.reduce((sum, i) => sum + i.price * i.qty, 0)
    const t = setTimeout(() => {
      fetch('/api/cart/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cartId, items: items.map((i) => ({ name: i.name, price: i.price, qty: i.qty })), total }),
        keepalive: true,
      }).catch(() => {})
    }, 1200)
    return () => clearTimeout(t)
  }, [items, hydrated])

  useEffect(() => {
    if (!hydrated) return
    if (promo) localStorage.setItem(PROMO_KEY, JSON.stringify(promo))
    else localStorage.removeItem(PROMO_KEY)
  }, [promo, hydrated])

  useEffect(() => {
    if (!hydrated) return
    if (pointsApplied > 0) localStorage.setItem(POINTS_KEY, String(pointsApplied))
    else localStorage.removeItem(POINTS_KEY)
  }, [pointsApplied, hydrated])

  const value = useMemo<CartContextValue>(() => {
    const addItem = (item: Omit<CartItem, 'qty'>) =>
      setItems((prev) => {
        const hit = prev.find((c) => c.name === item.name)
        if (hit) return prev.map((c) => (c.name === item.name ? { ...c, qty: c.qty + 1 } : c))
        return [...prev, { ...item, qty: 1 }]
      })

    const inc = (name: string) =>
      setItems((prev) => prev.map((c) => (c.name === name ? { ...c, qty: c.qty + 1 } : c)))

    const dec = (name: string) =>
      setItems((prev) =>
        prev
          .map((c) => (c.name === name ? { ...c, qty: c.qty - 1 } : c))
          .filter((c) => c.qty > 0)
      )

    const remove = (name: string) => setItems((prev) => prev.filter((c) => c.name !== name))

    const clear = () => {
      setItems([])
      setPromo(null)
      setPointsApplied(0)
    }

    const subtotalNow = items.reduce((a, c) => a + c.price * c.qty, 0)

    const applyPromo = async (code: string): Promise<{ valid: boolean; message: string }> => {
      try {
        const res = await fetch('/api/promo', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code, subtotal: subtotalNow }),
        })
        const data = await res.json()
        if (data.valid) setPromo({ code: data.code, type: data.type, value: data.value })
        return { valid: Boolean(data.valid), message: data.message }
      } catch {
        return { valid: false, message: 'Could not check that code right now.' }
      }
    }

    const removePromo = () => setPromo(null)

    const applyPoints = (points: number) => setPointsApplied(Math.max(0, Math.floor(points)))
    const removePoints = () => setPointsApplied(0)

    const count = items.reduce((a, c) => a + c.qty, 0)
    const subtotal = subtotalNow
    const delivery = subtotal === 0 || subtotal >= FREE_DELIVERY_THRESHOLD ? 0 : DELIVERY_FEE
    const bulkDiscount = bulkDiscountForLines(items)
    const bulkRate = subtotal > 0 ? bulkDiscount / subtotal : 0
    const firstOrderDiscountAmt = firstOrderDiscount(items, firstOrderEligible)
    // Recompute the promo discount against the current subtotal so it stays
    // correct as the cart changes.
    const discount = promo
      ? promo.type === 'PERCENT'
        ? Math.round(subtotal * (promo.value / 100))
        : Math.min(Math.round(promo.value), subtotal)
      : 0
    const pointsDiscount = pointsToValue(pointsApplied)
    const total = Math.max(0, subtotal + delivery - discount - bulkDiscount - firstOrderDiscountAmt - pointsDiscount)

    return {
      items, count, subtotal, delivery, discount, bulkDiscount, bulkRate, firstOrderEligible, firstOrderDiscountAmt, total,
      promoOn: Boolean(promo), promoCode: promo?.code ?? null,
      pointsApplied, pointsDiscount,
      hydrated, addItem, inc, dec, remove, clear, applyPromo, removePromo, applyPoints, removePoints, setFirstOrderEligible,
    }
  }, [items, promo, pointsApplied, firstOrderEligible, hydrated])

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used within CartProvider')
  return ctx
}
