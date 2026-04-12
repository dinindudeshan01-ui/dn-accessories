import { createContext, useContext, useState, useEffect } from 'react'

const CartContext = createContext(null)

export function CartProvider({ children }) {
  const [cart, setCart] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('dn-cart')) || []
    } catch {
      return []
    }
  })

  useEffect(() => {
    localStorage.setItem('dn-cart', JSON.stringify(cart))
  }, [cart])

  function addItem(product, quantity = 1) {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id)
      if (existing) {
        return prev.map(item =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + quantity }
            : item
        )
      }
      return [...prev, { ...product, quantity }]
    })
  }

  function removeItem(id) {
    setCart(prev => prev.filter(item => item.id !== id))
  }

  function updateQuantity(id, quantity) {
    if (quantity < 1) return removeItem(id)
    setCart(prev =>
      prev.map(item => item.id === id ? { ...item, quantity } : item)
    )
  }

  function clearCart() {
    setCart([])
  }

  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0)
  const totalPrice = cart.reduce((sum, item) => sum + item.price * item.quantity, 0)

  return (
    <CartContext.Provider value={{ cart, addItem, removeItem, updateQuantity, clearCart, totalItems, totalPrice }}>
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used inside CartProvider')
  return ctx
}