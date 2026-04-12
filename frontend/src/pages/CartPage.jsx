import { useCart } from '../context/CartContext'
import { Link, useNavigate } from 'react-router-dom' // 1. Added useNavigate here

export default function CartPage() {
  const { cart, totalPrice, totalItems, removeItem, updateQuantity, clearCart } = useCart()
  const navigate = useNavigate() // 2. Initialize the navigate function

  if (cart.length === 0) return (
    <div style={{ textAlign: 'center', padding: '120px 24px' }}>
      <h1 style={{ fontFamily: 'var(--serif)', fontSize: 36, fontStyle: 'italic', marginBottom: 16 }}>Your cart is empty</h1>
      <p style={{ color: '#a8a29e', marginBottom: 32 }}>Looks like you haven't added anything yet.</p>
      <Link to="/catalog" style={{
        display: 'inline-block', background: '#ec4899', color: 'white',
        padding: '14px 36px', fontSize: 11, fontWeight: 900,
        letterSpacing: '2px', textTransform: 'uppercase', borderRadius: 999
      }}>Shop Now</Link>
    </div>
  )

  return (
    <div style={{ maxWidth: 860, margin: '0 auto', padding: '60px 24px' }}>
      <div style={{ textAlign: 'center', marginBottom: 48 }}>
        <h1 style={{ fontFamily: 'var(--serif)', fontSize: 40, fontStyle: 'italic', fontWeight: 900 }}>Your Cart</h1>
        <div style={{ height: 3, width: 64, background: 'linear-gradient(90deg,#ec4899,#d4a853)', borderRadius: 2, margin: '10px auto 0' }} />
      </div>

      {/* Items */}
      {cart.map(item => (
        <div key={item.id} style={{
          display: 'flex', gap: 20, alignItems: 'center',
          borderBottom: '1px solid #fce7f3', paddingBottom: 24, marginBottom: 24
        }}>
          <img src={item.image_url} alt={item.name} style={{
            width: 80, height: 80, objectFit: 'cover', borderRadius: 12,
            border: '1px solid #fce7f3', flexShrink: 0
          }} />
          <div style={{ flex: 1 }}>
            <h4 style={{ fontFamily: 'var(--serif)', fontSize: 18, fontWeight: 700, marginBottom: 4 }}>{item.name}</h4>
            <p style={{ fontSize: 11, color: '#a8a29e', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px' }}>{item.category}</p>
          </div>
          {/* Quantity */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button onClick={() => updateQuantity(item.id, item.quantity - 1)} style={{
              width: 28, height: 28, borderRadius: '50%', border: '1px solid #e7e5e4',
              background: 'white', fontSize: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>−</button>
            <span style={{ fontWeight: 700, minWidth: 20, textAlign: 'center' }}>{item.quantity}</span>
            <button onClick={() => updateQuantity(item.id, item.quantity + 1)} style={{
              width: 28, height: 28, borderRadius: '50%', border: '1px solid #e7e5e4',
              background: 'white', fontSize: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>+</button>
          </div>
          <p style={{ fontSize: 18, fontWeight: 900, color: '#ec4899', minWidth: 80, textAlign: 'right' }}>
            Rs {(item.price * item.quantity).toLocaleString()}
          </p>
          <button onClick={() => removeItem(item.id)} style={{
            background: 'none', color: '#a8a29e', fontSize: 18, cursor: 'pointer', padding: '0 4px'
          }}>×</button>
        </div>
      ))}

      {/* Summary */}
      <div style={{ background: '#fff5f8', borderRadius: 16, padding: 28, marginTop: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ color: '#57534e' }}>Items ({totalItems})</span>
          <span style={{ fontWeight: 700 }}>Rs {totalPrice.toLocaleString()}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24, paddingTop: 16, borderTop: '1px solid #fce7f3' }}>
          <span style={{ fontWeight: 900, fontSize: 18 }}>Total</span>
          <span style={{ fontWeight: 900, fontSize: 22, color: '#ec4899' }}> Rs {totalPrice.toLocaleString()}</span>
        </div>

        {/* 3. Added onClick handler here */}
        <button 
          onClick={() => navigate('/checkout')}
          style={{
            width: '100%', padding: '16px', background: '#ec4899', color: 'white',
            fontSize: 11, fontWeight: 900, letterSpacing: '3px', textTransform: 'uppercase',
            borderRadius: 999, cursor: 'pointer', border: 'none',
            boxShadow: '0 8px 40px rgba(236,72,153,0.4)'
          }}
        >
          Proceed to Checkout
        </button>

        <button onClick={clearCart} style={{
          width: '100%', marginTop: 12, padding: '12px',
          background: 'none', color: '#a8a29e', fontSize: 11,
          fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase',
          border: 'none', cursor: 'pointer'
        }}>Clear Cart</button>
      </div>
    </div>
  )
}