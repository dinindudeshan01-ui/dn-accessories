import { useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { useCart } from '../context/CartContext'

export default function Header() {
  const { totalItems } = useCart()
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <header style={{
      position: 'sticky', top: 0, zIndex: 100,
      background: 'rgba(255,255,255,0.96)',
      backdropFilter: 'blur(12px)',
      borderBottom: '1px solid #fce7f3',
      boxShadow: '0 2px 20px rgba(244,114,182,0.08)'
    }}>
      <div style={{
        maxWidth: 1280, margin: '0 auto', padding: '0 24px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        height: 76
      }}>
        {/* Mobile toggle */}
        <button
          onClick={() => setMenuOpen(o => !o)}
          style={{ display: 'none', background: 'none', padding: 6, color: 'var(--stone-mid)' }}
          className="menu-toggle"
          aria-label="Menu"
        >
          {menuOpen ? (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          ) : (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
            </svg>
          )}
        </button>

        {/* Desktop Nav */}
        <nav style={{ display: 'flex', gap: 32 }} className="desktop-nav">
          {[['/', 'Home'], ['/catalog', 'Catalog'], ['/refund', 'Refund Policy'], ['/contact', 'Contact']].map(([to, label]) => (
            <NavLink key={to} to={to} end style={({ isActive }) => ({
              fontSize: 13, fontWeight: 700, color: isActive ? '#ec4899' : '#57534e',
              letterSpacing: '0.5px', position: 'relative', paddingBottom: 4,
              textDecoration: 'none'
            })}>
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Logo */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
          <Link to="/" style={{ fontFamily: 'var(--serif)', fontSize: 26, fontWeight: 900, letterSpacing: '-1px', lineHeight: 1 }}>
            D&amp;N <span style={{ color: '#ec4899' }}>ACCESSORIES</span>
          </Link>
          <div style={{ height: 2, width: 44, background: 'linear-gradient(90deg, #ec4899, #d4a853)', borderRadius: 2 }} />
        </div>

        {/* Icons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          {/* Instagram */}
          <a href="#" aria-label="Instagram" style={{ color: '#57534e' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="4"/>
              <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/>
            </svg>
          </a>
          {/* TikTok */}
          <a href="#" aria-label="TikTok" style={{ color: '#57534e' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.7a8.18 8.18 0 004.78 1.52V6.78a4.85 4.85 0 01-1.01-.09z"/>
            </svg>
          </a>
          {/* Cart */}
          <Link to="/cart" style={{ position: 'relative', color: '#57534e' }} aria-label="Cart">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/>
              <line x1="3" y1="6" x2="21" y2="6"/>
              <path d="M16 10a4 4 0 01-8 0"/>
            </svg>
            {totalItems > 0 && (
              <span style={{
                position: 'absolute', top: -6, right: -8,
                background: '#ec4899', color: 'white',
                fontSize: 9, fontWeight: 900,
                width: 18, height: 18, borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                animation: 'pop 0.3s ease'
              }}>
                {totalItems}
              </span>
            )}
          </Link>
        </div>
      </div>

      {/* Mobile Nav */}
      {menuOpen && (
        <div style={{
          background: 'white', borderTop: '1px solid #fce7f3',
          padding: '20px 24px 28px', boxShadow: '0 20px 40px rgba(0,0,0,0.12)'
        }}>
          {[['/', 'Home'], ['/catalog', 'Catalog'], ['/refund', 'Refund Policy'], ['/contact', 'Contact']].map(([to, label]) => (
            <Link key={to} to={to} onClick={() => setMenuOpen(false)} style={{
              display: 'block', fontSize: 16, fontWeight: 700,
              color: '#57534e', padding: '10px 0',
              borderBottom: '1px solid #fafafa'
            }}>{label}</Link>
          ))}
        </div>
      )}
    </header>
  )
}