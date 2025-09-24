import { createContext, ReactNode, useContext, useMemo, useState } from 'react'

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

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([])

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

  const clear = () => setItems([])

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
