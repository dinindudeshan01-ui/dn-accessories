// src/components/admin/AdminLayout.jsx
// V12 — QB-style grouped navigation

import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAdmin } from '../../context/AdminContext'
import { useEffect } from 'react'

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
`

function injectStyles() {
  if (document.getElementById('dn-layout-styles')) return
  const el = document.createElement('style')
  el.id = 'dn-layout-styles'
  el.textContent = GLOBAL
  document.head.appendChild(el)
}

export default function AdminLayout() {
  const { admin, logout } = useAdmin()
  const navigate = useNavigate()

  useEffect(() => { injectStyles() }, [])

  function handleLogout() {
    logout()
    navigate('/admin/login')
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: T.bg, fontFamily: T.font }}>

      {/* ── Sidebar ── */}
      <aside style={{
        width: 210, minWidth: 210, minHeight: '100vh',
        background: T.sidebar,
        borderRight: `1px solid ${T.border}`,
        display: 'flex', flexDirection: 'column',
        position: 'sticky', top: 0, height: '100vh', overflowY: 'auto',
      }}>

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
        </div>

        <div style={{ height: 1, background: T.border, margin: '0 14px 8px' }} />

        {/* Grouped Nav */}
        <nav style={{ flex: 1, padding: '0 10px', display: 'flex', flexDirection: 'column', gap: 0, overflowY: 'auto' }}>
          {NAV_GROUPS.map((group, gi) => (
            <div key={gi} style={{ marginBottom: 4 }}>

              {/* Section label */}
              {group.label && (
                <div style={{
                  fontSize: 9, fontWeight: 800, color: T.muted,
                  letterSpacing: '0.12em', textTransform: 'uppercase',
                  padding: '10px 12px 4px',
                  opacity: 0.7,
                }}>
                  {group.label}
                </div>
              )}

              {/* Nav items */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {group.items.map(item => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    className={`dn-nav-link${item.danger ? ' dn-nav-danger' : ''}`}
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
            onClick={handleLogout}
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
        </div>
      </aside>

      {/* ── Main content ── */}
      <main style={{ flex: 1, overflow: 'auto', minWidth: 0 }}>
        <Outlet />
      </main>

    </div>
  )
}