'use client'

import { SessionProvider } from 'next-auth/react'
import { CartProvider } from '@/components/cart/CartContext'
import { ToastProvider } from '@/components/cart/ToastContext'

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ToastProvider>
        <CartProvider>{children}</CartProvider>
      </ToastProvider>
    </SessionProvider>
  )
}
