'use client'

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import type { CartItem } from '@/types'

interface CartContextType {
  items: CartItem[]
  isOpen: boolean
  total: number
  itemCount: number
  addItem: (item: Omit<CartItem, 'cartId' | 'quantity'>) => void
  removeItem: (cartId: string) => void
  updateQuantity: (cartId: string, quantity: number) => void
  clearCart: () => void
  toggleCart: () => void
  openCart: () => void
  closeCart: () => void
}

const CartContext = createContext<CartContextType | null>(null)

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([])
  const [isOpen, setIsOpen] = useState(false)

  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0)

  const addItem = useCallback((newItem: Omit<CartItem, 'cartId' | 'quantity'>) => {
    setItems((prev) => {
      const key = `${newItem.menuItemId}-${newItem.variantLabel ?? ''}`
      const existing = prev.find(
        (i) => `${i.menuItemId}-${i.variantLabel ?? ''}` === key
      )
      if (existing) {
        return prev.map((i) =>
          i.cartId === existing.cartId ? { ...i, quantity: i.quantity + 1 } : i
        )
      }
      return [...prev, { ...newItem, cartId: `${key}-${Date.now()}`, quantity: 1 }]
    })
    setIsOpen(true)
  }, [])

  const removeItem = useCallback((cartId: string) => {
    setItems((prev) => prev.filter((i) => i.cartId !== cartId))
  }, [])

  const updateQuantity = useCallback((cartId: string, quantity: number) => {
    if (quantity <= 0) {
      setItems((prev) => prev.filter((i) => i.cartId !== cartId))
    } else {
      setItems((prev) =>
        prev.map((i) => (i.cartId === cartId ? { ...i, quantity } : i))
      )
    }
  }, [])

  const clearCart = useCallback(() => setItems([]), [])
  const toggleCart = useCallback(() => setIsOpen((v) => !v), [])
  const openCart = useCallback(() => setIsOpen(true), [])
  const closeCart = useCallback(() => setIsOpen(false), [])

  return (
    <CartContext.Provider
      value={{ items, isOpen, total, itemCount, addItem, removeItem, updateQuantity, clearCart, toggleCart, openCart, closeCart }}
    >
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used within CartProvider')
  return ctx
}
