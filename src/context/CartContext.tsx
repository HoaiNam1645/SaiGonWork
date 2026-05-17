'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import type { CartItem } from '@/types'
import { api, ApiError } from '@/lib/api'
import { useAuth } from './AuthContext'

// =====================================================================
// Types
// =====================================================================

interface ServerCartOption {
  optionId: string
  valueId:  string
  labelVi:  string | null
  labelEn:  string | null
}

interface ServerCartItem {
  id: string
  dish: {
    id:        string
    slug:      string
    nameVi:    string
    nameEn:    string | null
    imageUrl:  string | null
    basePrice: number
    isAvailable: boolean
  }
  options:           ServerCartOption[]
  quantity:          number
  note:              string | null
  snapshotUnitPrice: number
  currentUnitPrice:  number
  lineTotal:         number
  priceChanged:      boolean
  available:         boolean
}

interface ServerCartResponse {
  cart: {
    id:        string
    items:     ServerCartItem[]
    subtotal:  number
    itemCount: number
    currency:  string
  }
}

interface CartContextType {
  items:        CartItem[]
  isOpen:       boolean
  total:        number
  itemCount:    number
  isSyncing:    boolean
  hasPriceChange: boolean
  addItem:      (item: Omit<CartItem, 'cartId' | 'quantity'> & { quantity?: number }) => Promise<void>
  removeItem:   (cartId: string) => Promise<void>
  updateQuantity: (cartId: string, quantity: number) => Promise<void>
  updateNote:   (cartId: string, note: string) => Promise<void>
  clearCart:    () => Promise<void>
  toggleCart:   () => void
  openCart:     () => void
  closeCart:    () => void
}

const CartContext = createContext<CartContextType | null>(null)

// =====================================================================
// Local storage helpers — chỉ dùng khi user CHƯA login
// =====================================================================

const LS_KEY = 'sgw-cart-v1'

function readLocalCart(): CartItem[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return []
    const arr = JSON.parse(raw) as CartItem[]
    return Array.isArray(arr) ? arr : []
  } catch {
    return []
  }
}

function writeLocalCart(items: CartItem[]) {
  if (typeof window === 'undefined') return
  try {
    if (items.length === 0) localStorage.removeItem(LS_KEY)
    else localStorage.setItem(LS_KEY, JSON.stringify(items))
  } catch {
    // ignore
  }
}

function clearLocalCart() {
  if (typeof window === 'undefined') return
  try { localStorage.removeItem(LS_KEY) } catch { /* ignore */ }
}

// =====================================================================
// Mapping helpers
// =====================================================================

/** Server cart item → CartItem (FE shape). Dùng valueId/optionId làm tham chiếu. */
function toCartItem(s: ServerCartItem): CartItem {
  const firstOpt = s.options[0]
  return {
    cartId:        s.id,
    menuItemId:    s.dish.slug,
    name:          s.dish.nameVi,
    variantLabel:  firstOpt?.labelVi ?? undefined,
    price:         s.currentUnitPrice,
    quantity:      s.quantity,
    image:         s.dish.imageUrl ?? undefined,
    dishId:        s.dish.id,
    optionId:      firstOpt?.optionId,
    valueId:       firstOpt?.valueId,
    snapshotPrice: s.snapshotUnitPrice,
    priceChanged:  s.priceChanged,
    available:     s.available,
    note:          s.note ?? undefined,
  }
}

function toServerItemsPayload(items: CartItem[]) {
  // Chỉ gửi item có đủ DB ids — item từ fallback menu tĩnh không có dishId nên bỏ qua
  return items
    .filter(i => !!i.dishId)
    .map(i => ({
      dish_id:  i.dishId!,
      quantity: i.quantity,
      options:  i.optionId && i.valueId
        ? [{ option_id: i.optionId, value_id: i.valueId }]
        : [],
    }))
}

/** Key dedup local — match logic backend (cart_id, dish_id, options) */
function localKey(i: Pick<CartItem, 'menuItemId' | 'variantLabel'>) {
  return `${i.menuItemId}|${i.variantLabel ?? ''}`
}

// =====================================================================
// Provider
// =====================================================================

export function CartProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()

  const [items, setItems]       = useState<CartItem[]>([])
  const [isOpen, setIsOpen]     = useState(false)
  const [isSyncing, setSyncing] = useState(false)

  // Track previous user id để detect transition (null → user, user → null).
  // useRef vì chỉ phục vụ effect, không trigger render.
  const lastUserId = useRef<string | null>(null)

  // Hydrate local cart trên client mount (chỉ khi chưa login)
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (user) return
    setItems(readLocalCart())
  }, [user])

  // Persist localStorage chỉ khi không login
  useEffect(() => {
    if (user) return
    writeLocalCart(items)
  }, [items, user])

  // ===== Server sync on login/logout =====
  useEffect(() => {
    const prev = lastUserId.current
    const curr = user?.id ?? null
    if (prev === curr) return
    lastUserId.current = curr

    if (!curr) {
      // Logout: drop in-memory cart (local LS sẽ rỗng do user vừa login trước đó đã clear,
      // hoặc giữ nguyên LS nếu khách đã thêm trước login). Để đơn giản: clear in-memory,
      // user khách mới sẽ hydrate từ LS ở effect trên.
      setItems([])
      return
    }

    // Login: lấy local cart, merge nếu có item có dishId, rồi fetch full server cart
    void syncOnLogin()

    async function syncOnLogin() {
      setSyncing(true)
      try {
        const local = readLocalCart()
        const mergePayload = toServerItemsPayload(local)
        let res: ServerCartResponse
        if (mergePayload.length > 0) {
          res = await api<ServerCartResponse>('/cart/merge', {
            method: 'POST',
            body:   { items: mergePayload },
          })
        } else {
          res = await api<ServerCartResponse>('/cart')
        }
        setItems(res.cart.items.map(toCartItem))
        clearLocalCart()
      } catch (e) {
        console.warn('[cart] login sync failed:', e)
        // Giữ local items đang có — user vẫn xài được, sẽ retry khi addItem tiếp
      } finally {
        setSyncing(false)
      }
    }
  }, [user])

  // ===== Operations =====
  // Logged-in path luôn cần dishId. Nếu thiếu (vd add từ fallback menu data static),
  // fallback về local-mode cho item đó.

  const refetchServer = useCallback(async () => {
    try {
      const res = await api<ServerCartResponse>('/cart')
      setItems(res.cart.items.map(toCartItem))
    } catch (e) {
      console.warn('[cart] refetch failed:', e)
    }
  }, [])

  const addItem = useCallback(
    async (newItem: Omit<CartItem, 'cartId' | 'quantity'> & { quantity?: number }) => {
      const qty = newItem.quantity ?? 1

      if (user && newItem.dishId) {
        // Server mode
        setSyncing(true)
        try {
          const res = await api<ServerCartResponse>('/cart/items', {
            method: 'POST',
            body: {
              dish_id:  newItem.dishId,
              quantity: qty,
              options: newItem.optionId && newItem.valueId
                ? [{ option_id: newItem.optionId, value_id: newItem.valueId }]
                : [],
            },
          })
          setItems(res.cart.items.map(toCartItem))
          setIsOpen(true)
        } catch (e) {
          if (e instanceof ApiError && e.status === 409) {
            await refetchServer()
          } else {
            console.warn('[cart] add failed:', e)
          }
        } finally {
          setSyncing(false)
        }
        return
      }

      // Local mode (chưa login HOẶC item thiếu dishId)
      setItems(prev => {
        const k = localKey(newItem)
        const existing = prev.find(i => localKey(i) === k)
        if (existing) {
          return prev.map(i =>
            i.cartId === existing.cartId
              ? { ...i, quantity: Math.min(i.quantity + qty, 99) }
              : i,
          )
        }
        return [
          ...prev,
          { ...newItem, cartId: `${k}-${Date.now()}`, quantity: qty },
        ]
      })
      setIsOpen(true)
    },
    [user, refetchServer],
  )

  const removeItem = useCallback(
    async (cartId: string) => {
      const target = items.find(i => i.cartId === cartId)
      if (!target) return

      if (user && target.dishId) {
        setSyncing(true)
        try {
          const res = await api<ServerCartResponse>(`/cart/items/${cartId}`, {
            method: 'DELETE',
          })
          setItems(res.cart.items.map(toCartItem))
        } catch (e) {
          console.warn('[cart] delete failed:', e)
          await refetchServer()
        } finally {
          setSyncing(false)
        }
        return
      }

      setItems(prev => prev.filter(i => i.cartId !== cartId))
    },
    [user, items, refetchServer],
  )

  const updateQuantity = useCallback(
    async (cartId: string, quantity: number) => {
      const target = items.find(i => i.cartId === cartId)
      if (!target) return
      const qty = Math.max(0, Math.min(99, Math.floor(quantity)))

      if (user && target.dishId) {
        setSyncing(true)
        try {
          if (qty === 0) {
            const res = await api<ServerCartResponse>(`/cart/items/${cartId}`, {
              method: 'DELETE',
            })
            setItems(res.cart.items.map(toCartItem))
          } else {
            const res = await api<ServerCartResponse>(`/cart/items/${cartId}`, {
              method: 'PATCH',
              body:   { quantity: qty },
            })
            setItems(res.cart.items.map(toCartItem))
          }
        } catch (e) {
          console.warn('[cart] update failed:', e)
          await refetchServer()
        } finally {
          setSyncing(false)
        }
        return
      }

      if (qty === 0) {
        setItems(prev => prev.filter(i => i.cartId !== cartId))
      } else {
        setItems(prev =>
          prev.map(i => (i.cartId === cartId ? { ...i, quantity: qty } : i)),
        )
      }
    },
    [user, items, refetchServer],
  )

  const updateNote = useCallback(
    async (cartId: string, note: string) => {
      const target = items.find(i => i.cartId === cartId)
      if (!target) return
      const trimmed = note.slice(0, 255)

      if (user && target.dishId) {
        setSyncing(true)
        try {
          const res = await api<ServerCartResponse>(`/cart/items/${cartId}`, {
            method: 'PATCH',
            body:   { note: trimmed },
          })
          setItems(res.cart.items.map(toCartItem))
        } catch (e) {
          console.warn('[cart] update note failed:', e)
          await refetchServer()
        } finally {
          setSyncing(false)
        }
        return
      }

      setItems(prev =>
        prev.map(i => (i.cartId === cartId ? { ...i, note: trimmed } : i)),
      )
    },
    [user, items, refetchServer],
  )

  const clearCart = useCallback(async () => {
    if (user) {
      setSyncing(true)
      try {
        await api('/cart', { method: 'DELETE' })
        setItems([])
      } catch (e) {
        console.warn('[cart] clear failed:', e)
        await refetchServer()
      } finally {
        setSyncing(false)
      }
      return
    }
    setItems([])
  }, [user, refetchServer])

  const toggleCart = useCallback(() => setIsOpen(v => !v), [])
  const openCart   = useCallback(() => setIsOpen(true),  [])
  const closeCart  = useCallback(() => setIsOpen(false), [])

  const total          = items.reduce((sum, i) => sum + i.price * i.quantity, 0)
  const itemCount      = items.reduce((sum, i) => sum + i.quantity, 0)
  const hasPriceChange = items.some(i => i.priceChanged === true)

  return (
    <CartContext.Provider
      value={{
        items, isOpen, total, itemCount, isSyncing, hasPriceChange,
        addItem, removeItem, updateQuantity, updateNote, clearCart,
        toggleCart, openCart, closeCart,
      }}
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
