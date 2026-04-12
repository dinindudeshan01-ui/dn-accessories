import { useState, useEffect } from 'react'
import api from '../lib/api'
import { useCart } from '../context/CartContext'

const CATEGORIES = [
  { value: '',          label: 'All'       },
  { value: 'charmed',   label: 'Charms & pendents'   },
  { value: 'plain',     label: 'Plain'     },
  { value: 'signature', label: 'Signature' },
  { value: 'bangle',    label: 'Bangles'   },
  { value: 'supplies',  label: 'Supplies'  },
]

export default function CatalogPage() {
  const [products, setProducts] = useState([])
  const [loading, setLoading]   = useState(true)
  const [category, setCategory] = useState('')
  const [added, setAdded]       = useState({})
  const [selected, setSelected] = useState(null)
  const { addItem } = useCart()

  useEffect(() => {
    setLoading(true)
    api.get('/products', { params: category ? { category } : {} })
      .then(res => setProducts(res.data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false))
  }, [category])

  // Lock body scroll when modal open
  useEffect(() => {
    document.body.style.overflow = selected ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [selected])

  // Close on Escape
  useEffect(() => {
    const handler = e => { if (e.key === 'Escape') setSelected(null) }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  function handleAdd(product) {
    if (product.stock === 0) return
    addItem(product)
    setAdded(prev => ({ ...prev, [product.id]: true }))
    setTimeout(() => setAdded(prev => ({ ...prev, [product.id]: false })), 1500)
  }

  function handleModalAdd(product) {
    if (product.stock === 0) return
    addItem(product)
    setAdded(prev => ({ ...prev, [product.id]: true }))
    setTimeout(() => setAdded(prev => ({ ...prev, [product.id]: false })), 1500)
  }

  return (
    <div style={{ maxWidth: 1280, margin: '0 auto', padding: '60px 24px' }}>

      {/* Page header */}
      <div style={{ textAlign: 'center', marginBottom: 48 }}>
        <h1 style={{ fontFamily: 'var(--serif)', fontSize: 40, fontWeight: 900, fontStyle: 'italic', marginBottom: 12 }}>
          Our Collection
        </h1>
        <div style={{ height: 3, width: 64, background: 'linear-gradient(90deg,#ec4899,#d4a853)', borderRadius: 2, margin: '0 auto' }} />
      </div>

      {/* Category filters */}
      <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 48 }}>
        {CATEGORIES.map(cat => (
          <button
            key={cat.value}
            onClick={() => setCategory(cat.value)}
            style={{
              padding: '8px 20px',
              fontSize: 11, fontWeight: 900,
              letterSpacing: '1.5px', textTransform: 'uppercase',
              border: '2px solid',
              borderColor: category === cat.value ? '#ec4899' : '#e7e5e4',
              background: category === cat.value ? '#ec4899' : 'white',
              color: category === cat.value ? 'white' : '#57534e',
              borderRadius: 999, cursor: 'pointer', transition: 'all 0.2s'
            }}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {loading && (
        <div style={{ textAlign: 'center', padding: '60px 0', color: '#a8a29e', fontSize: 14 }}>
          Loading products...
        </div>
      )}

      {!loading && products.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px 0', color: '#a8a29e', fontSize: 14 }}>
          No products found in this category.
        </div>
      )}

      {!loading && products.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 32 }}>
          {products.map(product => (
            <ProductCard
              key={product.id}
              product={product}
              added={added[product.id]}
              onAdd={() => handleAdd(product)}
              onView={() => setSelected(product)}
            />
          ))}
        </div>
      )}

      {/* Product Detail Modal */}
      {selected && (
        <ProductModal
          product={selected}
          added={added[selected.id]}
          onAdd={() => handleModalAdd(selected)}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  )
}

/* ── Product Card ────────────────────────────────────────── */
function ProductCard({ product, added, onAdd, onView }) {
  const outOfStock = product.stock === 0
  const [hovered, setHovered] = useState(false)

  return (
    <div
      onClick={onView}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: 'white', border: '1px solid #fce7f3', borderRadius: 20,
        overflow: 'hidden', cursor: 'pointer',
        boxShadow: hovered ? '0 16px 48px rgba(236,72,153,0.18)' : '0 4px 20px rgba(244,114,182,0.08)',
        transform: hovered ? 'translateY(-4px)' : 'translateY(0)',
        transition: 'all 0.3s ease',
        display: 'flex', flexDirection: 'column'
      }}
    >
      {/* Image */}
      <div style={{ aspectRatio: '4/5', overflow: 'hidden', position: 'relative' }}>
        <img
          src={product.image_url}
          alt={product.name}
          style={{
            width: '100%', height: '100%', objectFit: 'cover',
            transform: hovered ? 'scale(1.06)' : 'scale(1)',
            transition: 'transform 0.7s ease'
          }}
        />
        {/* Hover overlay hint */}
        {!outOfStock && hovered && (
          <div style={{
            position: 'absolute', inset: 0,
            background: 'rgba(236,72,153,0.12)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'opacity 0.2s'
          }}>
            <span style={{
              background: 'white', color: '#ec4899',
              fontSize: 10, fontWeight: 900, letterSpacing: '2px',
              textTransform: 'uppercase', padding: '8px 20px', borderRadius: 999,
              boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
            }}>View Details</span>
          </div>
        )}
        {outOfStock && (
          <div style={{
            position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <span style={{
              background: '#ec4899', color: 'white',
              fontSize: 10, fontWeight: 900, letterSpacing: '2px',
              textTransform: 'uppercase', padding: '8px 18px', borderRadius: 999
            }}>Sold Out</span>
          </div>
        )}
        {!outOfStock && product.stock <= 5 && (
          <span style={{
            position: 'absolute', top: 12, right: 12,
            background: '#d4a853', color: 'white',
            fontSize: 9, fontWeight: 900, letterSpacing: '1px',
            textTransform: 'uppercase', padding: '4px 10px', borderRadius: 999
          }}>Only {product.stock} left</span>
        )}
      </div>

      {/* Info */}
      <div style={{ padding: '20px 20px 24px', display: 'flex', flexDirection: 'column', flex: 1 }}>
        <p style={{ fontSize: 10, fontWeight: 900, letterSpacing: '2px', textTransform: 'uppercase', color: '#a8a29e', marginBottom: 6 }}>
          {product.category}
        </p>
        <h4 style={{ fontFamily: 'var(--serif)', fontSize: 18, fontWeight: 700, marginBottom: 8, lineHeight: 1.3 }}>
          {product.name}
        </h4>
        <p style={{ fontSize: 13, color: '#57534e', lineHeight: 1.6, marginBottom: 16, flex: 1 }}>
          {product.description?.slice(0, 72)}{product.description?.length > 72 ? '…' : ''}
        </p>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto' }}>
          <span style={{ fontSize: 22, fontWeight: 900, color: '#ec4899' }}>
            Rs {Number(product.price).toFixed(2)}
          </span>
          <button
            onClick={e => { e.stopPropagation(); if (!outOfStock) onAdd() }}
            disabled={outOfStock}
            style={{
              padding: '10px 20px', fontSize: 11, fontWeight: 900,
              letterSpacing: '1.5px', textTransform: 'uppercase',
              border: 'none', borderRadius: 999,
              background: outOfStock ? '#e7e5e4' : added ? '#16a34a' : '#ec4899',
              color: outOfStock ? '#a8a29e' : 'white',
              cursor: outOfStock ? 'not-allowed' : 'pointer',
              transition: 'all 0.3s', whiteSpace: 'nowrap'
            }}
          >
            {outOfStock ? 'Sold Out' : added ? '✓ Added!' : 'Add to Cart'}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── Product Detail Modal ────────────────────────────────── */
function ProductModal({ product, added, onAdd, onClose }) {
  const outOfStock = product.stock === 0
  const [imgLoaded, setImgLoaded] = useState(false)

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 1000,
          background: 'rgba(0,0,0,0.55)',
          backdropFilter: 'blur(6px)',
          animation: 'fadeIn 0.2s ease'
        }}
      />

      {/* Modal */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 1001,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '24px', pointerEvents: 'none'
      }}>
        <div style={{
          background: 'white', borderRadius: 28,
          width: '100%', maxWidth: 860,
          maxHeight: '90vh', overflow: 'hidden',
          display: 'flex', flexDirection: 'row',
          pointerEvents: 'all',
          boxShadow: '0 32px 80px rgba(0,0,0,0.25)',
          animation: 'modalIn 0.3s cubic-bezier(0.34,1.56,0.64,1)'
        }}>

          {/* Left — Image */}
          <div style={{ flex: '0 0 42%', position: 'relative', background: '#fdf2f8', overflow: 'hidden' }}>
            <img
              src={product.image_url}
              alt={product.name}
              onLoad={() => setImgLoaded(true)}
              style={{
                width: '100%', height: '100%', objectFit: 'cover',
                opacity: imgLoaded ? 1 : 0, transition: 'opacity 0.4s'
              }}
            />
            {/* Category badge */}
            <span style={{
              position: 'absolute', top: 16, left: 16,
              background: 'white', color: '#ec4899',
              fontSize: 9, fontWeight: 900, letterSpacing: '2px',
              textTransform: 'uppercase', padding: '5px 12px', borderRadius: 999,
              boxShadow: '0 2px 12px rgba(0,0,0,0.1)'
            }}>
              {product.category}
            </span>
            {outOfStock && (
              <div style={{
                position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.35)',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <span style={{
                  background: '#ec4899', color: 'white',
                  fontSize: 11, fontWeight: 900, letterSpacing: '2px',
                  textTransform: 'uppercase', padding: '10px 24px', borderRadius: 999
                }}>Sold Out</span>
              </div>
            )}
          </div>

          {/* Right — Details */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>

            {/* Close button */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '18px 20px 0' }}>
              <button
                onClick={onClose}
                style={{
                  width: 36, height: 36, borderRadius: '50%',
                  border: '1px solid #fce7f3', background: '#fff5f8',
                  color: '#a8a29e', fontSize: 18, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.2s', lineHeight: 1
                }}
                onMouseEnter={e => { e.target.style.background = '#ec4899'; e.target.style.color = 'white'; e.target.style.borderColor = '#ec4899' }}
                onMouseLeave={e => { e.target.style.background = '#fff5f8'; e.target.style.color = '#a8a29e'; e.target.style.borderColor = '#fce7f3' }}
              >×</button>
            </div>

            {/* Content */}
            <div style={{ padding: '12px 32px 32px', flex: 1, display: 'flex', flexDirection: 'column' }}>

              <h2 style={{
                fontFamily: 'var(--serif)', fontSize: 28, fontWeight: 900,
                lineHeight: 1.2, marginBottom: 16, color: '#1c1917'
              }}>
                {product.name}
              </h2>

              {/* Price row */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                <span style={{ fontSize: 30, fontWeight: 900, color: '#ec4899' }}>
                  Rs {Number(product.price).toFixed(2)}
                </span>
                <span style={{ fontSize: 12, color: '#a8a29e', fontWeight: 600 }}>Rs </span>
              </div>

              {/* Divider */}
              <div style={{ height: 1, background: 'linear-gradient(90deg,#fce7f3,transparent)', marginBottom: 20 }} />

              {/* Description */}
              <p style={{ fontSize: 14, color: '#57534e', lineHeight: 1.8, marginBottom: 24 }}>
                {product.description || 'A beautifully handcrafted piece from the D&N collection.'}
              </p>

              {/* Stock info */}
              <div style={{ marginBottom: 28 }}>
                {outOfStock ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444' }} />
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#ef4444' }}>Out of Stock</span>
                  </div>
                ) : product.stock <= 5 ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#d4a853' }} />
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#d4a853' }}>Only {product.stock} left — order soon</span>
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#16a34a' }} />
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#16a34a' }}>In Stock</span>
                  </div>
                )}
              </div>

              {/* Perks */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 28 }}>
                {[
                  '✦  Handcrafted with premium materials',
                  '✦  Stretch-tested for durability',
                  '✦  One size fits most',
                ].map((perk, i) => (
                  <div key={i} style={{ fontSize: 12, color: '#78716c', fontWeight: 500 }}>{perk}</div>
                ))}
              </div>

              {/* CTA */}
              <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
                <button
                  onClick={onAdd}
                  disabled={outOfStock}
                  style={{
                    width: '100%', padding: '16px',
                    fontSize: 12, fontWeight: 900,
                    letterSpacing: '2.5px', textTransform: 'uppercase',
                    border: 'none', borderRadius: 999,
                    background: outOfStock ? '#e7e5e4' : added ? '#16a34a' : '#ec4899',
                    color: outOfStock ? '#a8a29e' : 'white',
                    cursor: outOfStock ? 'not-allowed' : 'pointer',
                    transition: 'all 0.3s',
                    boxShadow: outOfStock ? 'none' : added ? '0 8px 32px rgba(22,163,74,0.35)' : '0 8px 32px rgba(236,72,153,0.4)'
                  }}
                >
                  {outOfStock ? 'Currently Out of Stock' : added ? '✓ Added to Cart!' : 'Add to Cart'}
                </button>

                <button
                  onClick={onClose}
                  style={{
                    width: '100%', padding: '12px',
                    fontSize: 11, fontWeight: 700,
                    letterSpacing: '1px', textTransform: 'uppercase',
                    border: '1px solid #fce7f3', borderRadius: 999,
                    background: 'transparent', color: '#a8a29e', cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={e => { e.target.style.borderColor = '#ec4899'; e.target.style.color = '#ec4899' }}
                  onMouseLeave={e => { e.target.style.borderColor = '#fce7f3'; e.target.style.color = '#a8a29e' }}
                >
                  Continue Shopping
                </button>
              </div>

            </div>
          </div>

        </div>
      </div>

      {/* Animations */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0 }
          to   { opacity: 1 }
        }
        @keyframes modalIn {
          from { opacity: 0; transform: scale(0.92) translateY(16px) }
          to   { opacity: 1; transform: scale(1)    translateY(0)    }
        }
      `}</style>
    </>
  )
}