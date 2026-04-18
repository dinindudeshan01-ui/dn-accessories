// src/components/admin/GlobalSearch.jsx — Cmd+K global search

import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import adminApi from '../../lib/adminApi'

const T = {
  bg:      '#080810',
  surface: '#0f0f1a',
  card:    '#13131f',
  border:  'rgba(255,255,255,0.07)',
  borderHi:'rgba(255,255,255,0.14)',
  pink:    '#ff2d78',
  cyan:    '#00e5ff',
  gold:    '#ffc53d',
  lime:    '#b8ff3c',
  purple:  '#a259ff',
  text:    '#f0f0f8',
  muted:   '#6b6b85',
  faint:   '#2a2a3d',
  font:    "'DM Sans', 'Segoe UI', system-ui, sans-serif",
  mono:    "'JetBrains Mono', 'Fira Code', monospace",
}

const CATEGORIES = {
  orders:    { label: 'Orders',    icon: '◳', color: T.cyan,   path: (r) => '/admin/orders' },
  products:  { label: 'Products',  icon: '▦', color: T.lime,   path: (r) => '/admin/products' },
  bills:     { label: 'Bills',     icon: '◱', color: T.gold,   path: (r) => '/admin/bills' },
  customers: { label: 'Customers', icon: '◉', color: T.pink,   path: (r) => '/admin/customers' },
}

function useDebounce(value, delay) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
}

export default function GlobalSearch() {
  const navigate          = useNavigate()
  const [open,    setOpen]    = useState(false)
  const [query,   setQuery]   = useState('')
  const [results, setResults] = useState(null)
  const [loading, setLoading] = useState(false)
  const [cursor,  setCursor]  = useState(0)
  const inputRef  = useRef(null)
  const debouncedQ = useDebounce(query, 200)

  // ── Keyboard shortcut to open ──
  useEffect(() => {
    function handler(e) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen(o => !o)
      }
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  // Focus input when open
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50)
      setQuery('')
      setResults(null)
      setCursor(0)
    }
  }, [open])

  // Fetch results
  useEffect(() => {
    if (!debouncedQ || debouncedQ.trim().length < 2) {
      setResults(null)
      return
    }
    setLoading(true)
    adminApi.get('/system/search', { params: { q: debouncedQ } })
      .then(r => {
        setResults(r.data)
        setCursor(0)
      })
      .catch(() => setResults(null))
      .finally(() => setLoading(false))
  }, [debouncedQ])

  // Flatten results for keyboard navigation
  const flat = results ? [
    ...results.orders.map(r => ({ type:'orders', data:r })),
    ...results.products.map(r => ({ type:'products', data:r })),
    ...results.bills.map(r => ({ type:'bills', data:r })),
    ...results.customers.map(r => ({ type:'customers', data:r })),
  ] : []

  function navigate_to(item) {
    navigate(CATEGORIES[item.type].path(item.data))
    setOpen(false)
  }

  // Keyboard nav inside results
  function onKeyDown(e) {
    if (!flat.length) return
    if (e.key === 'ArrowDown') { e.preventDefault(); setCursor(c => Math.min(c + 1, flat.length - 1)) }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setCursor(c => Math.max(c - 1, 0)) }
    if (e.key === 'Enter' && flat[cursor]) navigate_to(flat[cursor])
  }

  const totalResults = results
    ? results.orders.length + results.products.length + results.bills.length + results.customers.length
    : 0

  if (!open) return null

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 99999,
        background: 'rgba(0,0,0,0.7)',
        backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        paddingTop: 120,
      }}
      onClick={() => setOpen(false)}
    >
      <div
        style={{
          width: '100%', maxWidth: 620,
          background: T.surface,
          border: `1px solid ${T.borderHi}`,
          borderRadius: 16,
          boxShadow: '0 24px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04)',
          overflow: 'hidden',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Search input */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '16px 20px',
          borderBottom: query && results ? `1px solid ${T.border}` : 'none',
        }}>
          <span style={{ fontSize: 18, color: T.muted }}>⌕</span>
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Search orders, products, bills, customers…"
            style={{
              flex: 1, background: 'none', border: 'none', outline: 'none',
              color: T.text, fontSize: 16, fontFamily: T.font,
            }}
          />
          {loading && (
            <div style={{
              width: 16, height: 16, borderRadius: '50%',
              border: `2px solid ${T.faint}`,
              borderTopColor: T.pink,
              animation: 'dn-spin 0.6s linear infinite',
            }} />
          )}
          <kbd style={{
            padding: '3px 8px', borderRadius: 6, fontSize: 11, fontWeight: 700,
            background: T.card, border: `1px solid ${T.border}`, color: T.muted,
          }}>ESC</kbd>
        </div>

        {/* Results */}
        {results && (
          <div style={{ maxHeight: 480, overflowY: 'auto', padding: '8px 0' }}>
            {totalResults === 0 ? (
              <div style={{ padding: '32px 20px', textAlign: 'center', color: T.muted, fontSize: 14 }}>
                No results for "{query}"
              </div>
            ) : (
              Object.entries(results).map(([type, items]) => {
                if (!items.length) return null
                const cat = CATEGORIES[type]
                return (
                  <div key={type}>
                    {/* Category header */}
                    <div style={{
                      padding: '8px 20px 4px',
                      fontSize: 10, fontWeight: 800, color: T.muted,
                      letterSpacing: '0.12em', textTransform: 'uppercase',
                    }}>
                      <span style={{ color: cat.color, marginRight: 6 }}>{cat.icon}</span>
                      {cat.label}
                    </div>

                    {items.map((item, idx) => {
                      const globalIdx = flat.findIndex(f => f.type === type && f.data === item)
                      const isActive  = cursor === globalIdx
                      return (
                        <ResultRow
                          key={idx}
                          type={type}
                          item={item}
                          isActive={isActive}
                          color={cat.color}
                          onClick={() => navigate_to({ type, data: item })}
                        />
                      )
                    })}
                  </div>
                )
              })
            )}
          </div>
        )}

        {/* Footer hint */}
        {!results && !loading && (
          <div style={{
            padding: '20px 20px 20px',
            display: 'flex', gap: 20, flexWrap: 'wrap',
          }}>
            {[
              { keys: '↑ ↓', desc: 'navigate' },
              { keys: '↵', desc: 'open' },
              { keys: '⌘K', desc: 'close' },
            ].map(h => (
              <span key={h.keys} style={{ fontSize: 12, color: T.muted }}>
                <kbd style={{ padding:'2px 6px', borderRadius:5, fontSize:11, background:T.card, border:`1px solid ${T.border}`, color:T.text, marginRight:5 }}>{h.keys}</kbd>
                {h.desc}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function ResultRow({ type, item, isActive, color, onClick }) {
  const T_faint = '#2a2a3d'

  const renderContent = () => {
    if (type === 'orders') return (
      <>
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13, color, fontWeight: 700 }}>
          {item.reference || `#${item.id}`}
        </span>
        <span style={{ fontSize: 13, color: '#f0f0f8', marginLeft: 10 }}>{item.full_name}</span>
        <span style={{ fontSize: 12, color: '#6b6b85', marginLeft: 8 }}>{item.phone1}</span>
        <span style={{ marginLeft: 'auto', fontSize: 12, color: '#ffc53d', fontWeight: 700 }}>
          Rs {Number(item.total).toLocaleString()}
        </span>
        <StatusDot status={item.status} />
      </>
    )

    if (type === 'products') return (
      <>
        <span style={{ fontSize: 13, color: '#f0f0f8', fontWeight: 600 }}>{item.name}</span>
        <span style={{ fontSize: 11, color: '#6b6b85', marginLeft: 8 }}>{item.category || ''}</span>
        <span style={{ marginLeft: 'auto', fontSize: 12, color, fontWeight: 700 }}>
          Rs {Number(item.price).toLocaleString()}
        </span>
        <span style={{ fontSize: 11, color: item.stock === 0 ? '#f87171' : '#6b6b85', marginLeft: 10 }}>
          {item.stock} in stock
        </span>
      </>
    )

    if (type === 'bills') return (
      <>
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13, color, fontWeight: 700 }}>
          {item.bill_number || `#${item.id}`}
        </span>
        <span style={{ fontSize: 12, color: '#f0f0f8', marginLeft: 10 }}>{item.supplier_name || '—'}</span>
        <span style={{ marginLeft: 'auto', fontSize: 12, color: '#ffc53d', fontWeight: 700 }}>
          Rs {Number(item.total).toLocaleString()}
        </span>
        <StatusDot status={item.status} />
      </>
    )

    if (type === 'customers') return (
      <>
        <span style={{ fontSize: 13, color: '#f0f0f8', fontWeight: 600 }}>{item.full_name}</span>
        <span style={{ fontSize: 11, color: '#6b6b85', marginLeft: 8 }}>{item.phone1}</span>
        <span style={{ marginLeft: 'auto', fontSize: 12, color: '#ffc53d', fontWeight: 700 }}>
          Rs {Number(item.total_spent || 0).toLocaleString()}
        </span>
        <span style={{ fontSize: 11, color: '#6b6b85', marginLeft: 10 }}>{item.order_count} orders</span>
      </>
    )
  }

  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '10px 20px', cursor: 'pointer',
        background: isActive ? 'rgba(255,45,120,0.08)' : 'transparent',
        borderLeft: isActive ? `2px solid #ff2d78` : '2px solid transparent',
        transition: 'background 0.1s',
      }}
      onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'rgba(255,255,255,0.03)' }}
      onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent' }}
    >
      {renderContent()}
    </div>
  )
}

function StatusDot({ status }) {
  const colors = {
    pending:   '#ffc53d',
    paid:      '#4ade80',
    shipped:   '#60a5fa',
    unpaid:    '#ffc53d',
    partial:   '#a259ff',
    refunded:  '#fbbf24',
    cancelled: '#f87171',
  }
  return (
    <span style={{
      marginLeft: 8, padding:'2px 8px', borderRadius:99, fontSize:10, fontWeight:700,
      background: `${colors[status] || '#6b6b85'}22`,
      color: colors[status] || '#6b6b85',
      textTransform:'uppercase', letterSpacing:'0.06em',
    }}>{status}</span>
  )
}

// Export the open trigger hook for sidebar button
export function useGlobalSearch() {
  const open = useCallback(() => {
    window.dispatchEvent(new CustomEvent('dn-search-open'))
  }, [])
  return { open }
}