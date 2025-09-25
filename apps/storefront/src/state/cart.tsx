import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react'

type CartItemInput = {
  id: string
  name: string
  price: number
  imageUrl?: string
  currency: string
}

type CartItem = CartItemInput & { quantity: number }

type CartContextValue = {
  items: CartItem[]
  addItem: (item: CartItemInput) => void
  removeItem: (id: string) => void
  clear: () => void
  total: number
  currency: string | null
}

const CartContext = createContext<CartContextValue | undefined>(undefined)
const STORAGE_KEY = 'storefront_cart'

function loadInitialCart(): CartItem[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed
      .map((item) => ({
        id: String(item.id ?? ''),
        name: String(item.name ?? ''),
        price: Number(item.price ?? 0),
        imageUrl: item.imageUrl ? String(item.imageUrl) : undefined,
        currency: String(item.currency ?? ''),
        quantity: Number.isInteger(item.quantity) && item.quantity > 0 ? item.quantity : 1,
      }))
      .filter((item) => item.id && item.name)
  } catch (error) {
    console.warn('[cart] failed to read stored cart', error)
    return []
  }
}

function persistCart(items: CartItem[]) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  } catch (error) {
    console.warn('[cart] failed to persist cart', error)
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(() => loadInitialCart())

  useEffect(() => {
    persistCart(items)
  }, [items])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const handleStorage = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEY) return
      setItems(loadInitialCart())
    }
    window.addEventListener('storage', handleStorage)
    return () => window.removeEventListener('storage', handleStorage)
  }, [])

  const addItem = (item: CartItemInput) => {
    setItems((prev) => {
      const index = prev.findIndex((i) => i.id === item.id)
      if (index === -1) {
        return [...prev, { ...item, quantity: 1 }]
      }
      const copy = [...prev]
      copy[index] = { ...copy[index], quantity: copy[index].quantity + 1 }
      return copy
    })
  }

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id))
  }

  const clear = () => {
    setItems([])
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.removeItem(STORAGE_KEY)
      } catch {}
    }
  }

  const currency = items[0]?.currency ?? null

  const total = useMemo(() => items.reduce((sum, item) => sum + item.price * item.quantity, 0), [items])

  const value = useMemo(
    () => ({
      items,
      addItem,
      removeItem,
      clear,
      total,
      currency
    }),
    [items, total, currency]
  )

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) {
    throw new Error('useCart must be used within a CartProvider')
  }
  return ctx
}
