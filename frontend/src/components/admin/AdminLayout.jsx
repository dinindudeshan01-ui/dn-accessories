// src/components/admin/AdminLayout.jsx
// Phase 4 — Mobile-responsive sidebar: hamburger, slide-in drawer, bottom tab bar

import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useAdmin } from '../../context/AdminContext'
import { useEffect, useState } from 'react'
import GlobalSearch from './GlobalSearch'

// ── Theme hook (persists in localStorage, respects OS on first load) ──────────
function useAdminTheme() {
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('dn_admin_theme')
    if (saved) return saved
    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
  })
  useEffect(() => {
    document.documentElement.setAttribute('data-admin-theme', theme)
    localStorage.setItem('dn_admin_theme', theme)
  }, [theme])
  const toggle = () => setTheme(t => t === 'dark' ? 'light' : 'dark')
  return [theme, toggle]
}

const T = {
  bg:      '#080810',
  sidebar: '#0a0a14',
  border:  'rgba(255,255,255,0.07)',
  pink:    '#ff2d78',
  lime:    '#b8ff3c',
  gold:    '#ffc53d',
  cyan:    '#00e5ff',
  purple:  '#a259ff',
  text:    '#f0f0f8',
  muted:   '#6b6b85',
  faint:   '#141424',
  font:    "'DM Sans', 'Segoe UI', system-ui, sans-serif",
}

const NAV_GROUPS = [
  {
    label: null,
    items: [
      { to: '/admin', label: 'Dashboard', icon: '◈', end: true },
    ]
  },
  {
    label: 'Sales',
    items: [
      { to: '/admin/orders',    label: 'Orders',    icon: '◳' },
      { to: '/admin/customers', label: 'Customers', icon: '◉' },
    ]
  },
  {
    label: 'Inventory',
    items: [
      { to: '/admin/products',  label: 'Products',  icon: '▦' },
      { to: '/admin/materials', label: 'Materials', icon: '⬡' },
      { to: '/admin/recipes',   label: 'Recipes',   icon: '◎' },
    ]
  },
  {
    label: 'Purchases',
    items: [
      { to: '/admin/bills',     label: 'Bills',     icon: '◱' },
      { to: '/admin/suppliers', label: 'Suppliers', icon: '◫' },
    ]
  },
  {
    label: 'Expenses',
    items: [
      { to: '/admin/expenses',  label: 'Expenses',  icon: '◐' },
    ]
  },
  {
    label: 'Reports',
    items: [
      { to: '/admin/pl',               label: 'P & L',      icon: '▣' },
      { to: '/admin/cashflow',         label: 'Cash Flow',  icon: '◈' },
      { to: '/admin/inventory-report', label: 'Inventory',  icon: '▤' },
    ]
  },
  {
    label: 'System',
    items: [
      { to: '/admin/studio',  label: 'Studio',     icon: '◑' },
      { to: '/admin/audit',   label: 'Audit Log',  icon: '◨' },
      { to: '/admin/reset',   label: 'Data Reset', icon: '⚠', danger: true },
    ]
  },
]

// Bottom tab bar — 5 most used pages
const BOTTOM_TABS = [
  { to: '/admin',           label: 'Home',     icon: '◈', end: true },
  { to: '/admin/orders',    label: 'Orders',   icon: '◳' },
  { to: '/admin/bills',     label: 'Bills',    icon: '◱' },
  { to: '/admin/pl',        label: 'P&L',      icon: '▣' },
  { to: '/admin/products',  label: 'Products', icon: '▦' },
]

const GLOBAL = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700;900&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #080810; }
  ::-webkit-scrollbar { width: 4px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: #1a1a2e; border-radius: 4px; }
  @keyframes dn-pulse     { 0%,100%{opacity:1}50%{opacity:.4} }
  @keyframes dn-spin      { to{transform:rotate(360deg)} }
  @keyframes dn-slide-up  { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
  @keyframes dn-drawer-in { from{transform:translateX(-100%)} to{transform:translateX(0)} }

  .dn-nav-link {
    display: flex; align-items: center; gap: 10px;
    padding: 8px 12px; border-radius: 8px;
    font-size: 12.5px; font-weight: 600;
    color: #6b6b85; text-decoration: none;
    transition: all 0.15s; cursor: pointer;
    font-family: 'DM Sans', system-ui;
    border: 1px solid transparent;
    white-space: nowrap;
  }
  .dn-nav-link:hover  { color: #f0f0f8; background: rgba(255,255,255,0.04); }
  .dn-nav-link.active {
    color: #ff2d78;
    background: rgba(255,45,120,0.1);
    border-color: rgba(255,45,120,0.18);
  }
  .dn-nav-link.active .dn-nav-icon { text-shadow: 0 0 10px #ff2d78; }
  .dn-nav-danger       { color: rgba(255,45,120,0.45) !important; }
  .dn-nav-danger:hover { color: #ff2d78 !important; background: rgba(255,45,120,0.07) !important; }

  .dn-tr:hover > td { background: rgba(255,45,120,0.04) !important; }
  .dn-input:focus   { outline:none; border-color:#ff2d78 !important; box-shadow:0 0 0 3px rgba(255,45,120,.15); }
  .dn-select:focus  { outline:none; border-color:#ff2d78 !important; }
  .dn-btn:active    { transform:scale(.97); }
  .dn-slide-up      { animation: dn-slide-up 0.32s ease both; }

  /* Mobile drawer animation */
  .dn-drawer { animation: dn-drawer-in 0.25s cubic-bezier(0.32,0.72,0,1) both; }

  /* Desktop: show sidebar, hide hamburger + bottom tabs */
  @media (min-width: 769px) {
    .dn-hamburger    { display: none !important; }
    .dn-bottom-tabs  { display: none !important; }
    .dn-sidebar-desk { display: flex !important; }
    .dn-drawer-overlay { display: none !important; }
  }

  /* Mobile: hide desktop sidebar, show hamburger + bottom tabs */
  @media (max-width: 768px) {
    .dn-sidebar-desk { display: none !important; }
    .dn-hamburger    { display: flex !important; }
    .dn-bottom-tabs  { display: flex !important; }
    .dn-main-content { padding-bottom: 70px !important; }
  }
`

function injectStyles() {
  if (document.getElementById('dn-layout-styles')) return
  const el = document.createElement('style')
  el.id = 'dn-layout-styles'
  el.textContent = GLOBAL
  document.head.appendChild(el)
}

// ── Sidebar content (shared between desktop sidebar + mobile drawer) ──────────
function SidebarContent({ admin, onLogout, onSearchOpen, onClose, onThemeToggle, currentTheme }) {
  return (
    <>
      {/* Logo */}
      <div style={{ padding: '22px 18px 14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 9,
            background: `linear-gradient(135deg, ${T.pink}, ${T.purple})`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 14, fontWeight: 900, color: '#fff',
            boxShadow: `0 0 18px rgba(255,45,120,0.35)`,
            flexShrink: 0,
          }}>
            D
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 900, color: T.text, letterSpacing: '-0.01em' }}>
              D<span style={{ color: T.pink }}>&</span>N
            </div>
            <div style={{ fontSize: 8.5, fontWeight: 700, color: T.muted, letterSpacing: '0.15em', textTransform: 'uppercase' }}>
              Admin Panel
            </div>
          </div>
        </div>

        {/* Live dot */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          marginTop: 10, padding: '4px 9px',
          background: 'rgba(184,255,60,0.07)',
          border: '1px solid rgba(184,255,60,0.15)',
          borderRadius: 6,
        }}>
          <span style={{
            width: 5, height: 5, borderRadius: '50%',
            background: T.lime, flexShrink: 0,
            boxShadow: `0 0 6px ${T.lime}`,
            animation: 'dn-pulse 2s ease-in-out infinite',
          }} />
          <span style={{ fontSize: 9, fontWeight: 700, color: T.lime, letterSpacing: '0.08em' }}>LIVE</span>
        </div>

        {/* Search button (Cmd+K) */}
        <button
          onClick={onSearchOpen}
          style={{
            display: 'flex', alignItems: 'center', gap: 8, width: '100%',
            marginTop: 10, padding: '8px 10px', borderRadius: 8,
            background: 'rgba(255,255,255,0.03)', border: `1px solid ${T.border}`,
            cursor: 'pointer', color: T.muted, fontFamily: T.font, fontSize: 12,
            transition: 'all 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,45,120,0.3)'; e.currentTarget.style.color = T.text }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.color = T.muted }}
        >
          <span style={{ fontSize: 13 }}>⌕</span>
          <span style={{ flex: 1, textAlign: 'left' }}>Search…</span>
          <kbd style={{
            padding: '1px 5px', borderRadius: 4, fontSize: 9, fontWeight: 800,
            background: T.faint, border: `1px solid ${T.border}`,
            color: T.muted, letterSpacing: '0.05em',
          }}>⌘K</kbd>
        </button>
      </div>

      <div style={{ height: 1, background: T.border, margin: '0 14px 8px' }} />

      {/* Grouped Nav */}
      <nav style={{ flex: 1, padding: '0 10px', display: 'flex', flexDirection: 'column', gap: 0, overflowY: 'auto' }}>
        {NAV_GROUPS.map((group, gi) => (
          <div key={gi} style={{ marginBottom: 4 }}>
            {group.label && (
              <div style={{
                fontSize: 9, fontWeight: 800, color: T.muted,
                letterSpacing: '0.12em', textTransform: 'uppercase',
                padding: '10px 12px 4px', opacity: 0.7,
              }}>
                {group.label}
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {group.items.map(item => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={`dn-nav-link${item.danger ? ' dn-nav-danger' : ''}`}
                  onClick={onClose}
                >
                  <span
                    className="dn-nav-icon"
                    style={{ fontSize: 13, width: 16, textAlign: 'center', lineHeight: 1, flexShrink: 0 }}
                  >
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Bottom: user + logout */}
      <div style={{ padding: '12px 10px', borderTop: `1px solid ${T.border}` }}>
        <div style={{ padding: '9px 11px', background: T.faint, borderRadius: 9, marginBottom: 7 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: T.text, marginBottom: 1 }}>
            {admin?.name || 'Admin'}
          </div>
          <div style={{ fontSize: 10, color: T.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {admin?.email || ''}
          </div>
        </div>
        <button
          onClick={onLogout}
          style={{
            width: '100%', padding: '7px',
            background: 'transparent',
            border: `1px solid ${T.border}`,
            borderRadius: 8, color: T.muted,
            fontSize: 11.5, fontWeight: 600,
            cursor: 'pointer', fontFamily: T.font,
            transition: 'all 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,45,120,0.3)'; e.currentTarget.style.color = T.pink }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.color = T.muted }}
        >
          Sign Out
        </button>
        {onThemeToggle && (
          <button
            onClick={onThemeToggle}
            title="Toggle light / dark mode"
            style={{
              width: '100%', padding: '6px',
              background: 'transparent',
              border: `1px solid ${T.border}`,
              borderRadius: 8, color: T.muted,
              fontSize: 11, fontWeight: 600,
              cursor: 'pointer', fontFamily: T.font,
              transition: 'all 0.15s', marginTop: 6,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,197,61,0.4)'; e.currentTarget.style.color = T.gold }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.color = T.muted }}
          >
            {currentTheme === 'dark' ? '☀ Light Mode' : '◑ Dark Mode'}
          </button>
        )}
      </div>
    </>
  )
}

export default function AdminLayout() {
  const { admin, logout } = useAdmin()
  const [theme, toggleTheme] = useAdminTheme()
  const navigate = useNavigate()
  const location = useLocation()
  const [drawerOpen, setDrawerOpen] = useState(false)

  useEffect(() => { injectStyles() }, [])

  // Close drawer on route change
  useEffect(() => { setDrawerOpen(false) }, [location.pathname])

  function handleLogout() {
    logout()
    navigate('/admin/login')
  }

  function openSearch() {
    setDrawerOpen(false)
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true, bubbles: true }))
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: T.bg, fontFamily: T.font }}>

      {/* ── Global Search overlay (Cmd+K) ── */}
      <GlobalSearch />

      {/* ── Desktop Sidebar ── */}
      <aside
        className="dn-sidebar-desk"
        style={{
          width: 210, minWidth: 210, minHeight: '100vh',
          background: T.sidebar,
          borderRight: `1px solid ${T.border}`,
          flexDirection: 'column',
          position: 'sticky', top: 0, height: '100vh', overflowY: 'auto',
        }}
      >
        <SidebarContent
          admin={admin}
          onLogout={handleLogout}
          onSearchOpen={openSearch}
          onClose={() => {}}
          onThemeToggle={toggleTheme}
          currentTheme={theme}
        />
      </aside>

      {/* ── Mobile Drawer Overlay ── */}
      {drawerOpen && (
        <div
          className="dn-drawer-overlay"
          onClick={() => setDrawerOpen(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            background: 'rgba(0,0,0,0.7)',
            backdropFilter: 'blur(2px)',
          }}
        />
      )}

      {/* ── Mobile Drawer ── */}
      {drawerOpen && (
        <aside
          className="dn-drawer"
          style={{
            position: 'fixed', top: 0, left: 0, bottom: 0,
            width: 240, zIndex: 1001,
            background: T.sidebar,
            borderRight: `1px solid ${T.border}`,
            display: 'flex', flexDirection: 'column',
            overflowY: 'auto',
          }}
        >
          {/* Close button */}
          <button
            onClick={() => setDrawerOpen(false)}
            style={{
              position: 'absolute', top: 14, right: 14,
              background: 'rgba(255,255,255,0.06)',
              border: `1px solid ${T.border}`,
              borderRadius: 8, width: 30, height: 30,
              color: T.muted, fontSize: 16, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >×</button>
          <SidebarContent
            admin={admin}
            onLogout={handleLogout}
            onSearchOpen={openSearch}
            onClose={() => setDrawerOpen(false)}
          />
        </aside>
      )}

      {/* ── Main content ── */}
      <main
        className="dn-main-content"
        style={{ flex: 1, overflow: 'auto', minWidth: 0, position: 'relative' }}
      >
        {/* ── Mobile top bar (hamburger) ── */}
        <div
          className="dn-hamburger"
          style={{
            display: 'none', // overridden by media query
            position: 'sticky', top: 0, zIndex: 100,
            alignItems: 'center', gap: 12,
            padding: '12px 16px',
            background: T.sidebar,
            borderBottom: `1px solid ${T.border}`,
          }}
        >
          <button
            onClick={() => setDrawerOpen(true)}
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: `1px solid ${T.border}`,
              borderRadius: 8, width: 36, height: 36,
              color: T.text, cursor: 'pointer',
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center', gap: 4,
              padding: 8,
            }}
          >
            <span style={{ display: 'block', width: 16, height: 1.5, background: T.text, borderRadius: 1 }} />
            <span style={{ display: 'block', width: 12, height: 1.5, background: T.muted, borderRadius: 1 }} />
            <span style={{ display: 'block', width: 16, height: 1.5, background: T.text, borderRadius: 1 }} />
          </button>

          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              width: 26, height: 26, borderRadius: 7,
              background: `linear-gradient(135deg, ${T.pink}, ${T.purple})`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 12, fontWeight: 900, color: '#fff',
            }}>D</div>
            <span style={{ fontSize: 13, fontWeight: 900, color: T.text }}>
              D<span style={{ color: T.pink }}>&</span>N Admin
            </span>
          </div>

          {/* Search icon */}
          <button
            onClick={openSearch}
            style={{
              marginLeft: 'auto',
              background: 'rgba(255,255,255,0.05)',
              border: `1px solid ${T.border}`,
              borderRadius: 8, width: 36, height: 36,
              color: T.muted, cursor: 'pointer', fontSize: 16,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >⌕</button>
        </div>

        <Outlet />
      </main>

      {/* ── Mobile Bottom Tab Bar ── */}
      <nav
        className="dn-bottom-tabs"
        style={{
          display: 'none', // overridden by media query
          position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 200,
          background: T.sidebar,
          borderTop: `1px solid ${T.border}`,
          backdropFilter: 'blur(12px)',
          justifyContent: 'space-around',
          padding: '4px 0',
          paddingBottom: 'max(4px, env(safe-area-inset-bottom))',
        }}
      >
        {BOTTOM_TABS.map(tab => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.end}
            style={({ isActive }) => ({
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
              padding: '6px 12px', borderRadius: 10,
              color: isActive ? T.pink : T.muted,
              textDecoration: 'none', fontSize: 9, fontWeight: 700,
              letterSpacing: '0.05em', textTransform: 'uppercase',
              transition: 'color 0.15s',
              minWidth: 52,
            })}
          >
            {({ isActive }) => (
              <>
                <span style={{
                  fontSize: 18, lineHeight: 1,
                  filter: isActive ? `drop-shadow(0 0 6px ${T.pink})` : 'none',
                  transition: 'filter 0.15s',
                }}>{tab.icon}</span>
                <span>{tab.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

    </div>
  )
}