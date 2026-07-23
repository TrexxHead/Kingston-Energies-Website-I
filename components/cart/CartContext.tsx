'use client'

import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { FREE_DELIVERY_THRESHOLD, DELIVERY_FEE, bulkRateForQty } from '@/lib/pricing'

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
  total: number
  promoOn: boolean
  hydrated: boolean
  addItem: (item: Omit<CartItem, 'qty'>) => void
  inc: (name: string) => void
  dec: (name: string) => void
  remove: (name: string) => void
  clear: () => void
  applyPromo: (code: string) => boolean
}

const CartContext = createContext<CartContextValue | null>(null)

const STORAGE_KEY = 'ke-cart'
const PROMO_KEY = 'ke-promo'
const PROMO_CODE = 'KINGSTON10'
const PROMO_RATE = 0.1

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([])
  const [promoOn, setPromoOn] = useState(false)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) setItems(JSON.parse(raw))
      setPromoOn(localStorage.getItem(PROMO_KEY) === '1')
    } catch {
      // ignore malformed storage
    }
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (!hydrated) return
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  }, [items, hydrated])

  useEffect(() => {
    if (!hydrated) return
    localStorage.setItem(PROMO_KEY, promoOn ? '1' : '0')
  }, [promoOn, hydrated])

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
      setPromoOn(false)
    }

    const applyPromo = (code: string): boolean => {
      if (code.trim().toUpperCase() === PROMO_CODE) {
        setPromoOn(true)
        return true
      }
      return false
    }

    const count = items.reduce((a, c) => a + c.qty, 0)
    const subtotal = items.reduce((a, c) => a + c.price * c.qty, 0)
    const delivery = subtotal === 0 || subtotal >= FREE_DELIVERY_THRESHOLD ? 0 : DELIVERY_FEE
    const bulkRate = bulkRateForQty(count)
    const bulkDiscount = Math.round(subtotal * bulkRate)
    const discount = promoOn ? Math.round(subtotal * PROMO_RATE) : 0
    const total = Math.max(0, subtotal + delivery - discount - bulkDiscount)

    return { items, count, subtotal, delivery, discount, bulkDiscount, bulkRate, total, promoOn, hydrated, addItem, inc, dec, remove, clear, applyPromo }
  }, [items, promoOn, hydrated])

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used within CartProvider')
  return ctx
}
