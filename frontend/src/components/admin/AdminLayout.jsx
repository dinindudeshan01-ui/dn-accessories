// src/components/admin/AdminLayout.jsx
// ── Drop-in replacement. Zero changes to routes/App.jsx needed ──

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

const NAV = [
  { to: '/admin',           label: 'Dashboard',   icon: '◈', end: true  },
  { to: '/admin/orders',    label: 'Orders',       icon: '◳'             },
  { to: '/admin/products',  label: 'Products',     icon: '◉'             },
  { to: '/admin/inventory', label: 'Inventory',    icon: '▦'             },
  { to: '/admin/suppliers', label: 'Suppliers',    icon: '⬡'             },
  { to: '/admin/expenses',  label: 'Expenses',     icon: '◎'             },
  { to: '/admin/pl',        label: 'P & L',        icon: '▣'             },
  { to: '/admin/studio',    label: 'Studio',       icon: '◐'             },
  { to: '/admin/audit',     label: 'Audit Log',    icon: '◫'             },
  { to: '/admin/reset',     label: 'Data Reset',   icon: '⚠', danger: true },
]

const GLOBAL = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700;900&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #080810; }
  ::-webkit-scrollbar { width: 4px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: #1a1a2e; border-radius: 4px; }
  @keyframes dn-pulse { 0%,100%{opacity:1}50%{opacity:.4} }
  @keyframes dn-spin  { to{transform:rotate(360deg)} }
  @keyframes dn-slide-up { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
  .dn-nav-link {
    display: flex; align-items: center; gap: 12px;
    padding: 9px 16px; border-radius: 10px;
    font-size: 13px; font-weight: 600;
    color: #6b6b85; text-decoration: none;
    transition: all 0.15s; cursor: pointer;
    font-family: 'DM Sans', system-ui;
    position: relative; border: 1px solid transparent;
  }
  .dn-nav-link:hover { color: #f0f0f8; background: rgba(255,255,255,0.04); }
  .dn-nav-link.active {
    color: #ff2d78;
    background: rgba(255,45,120,0.1);
    border-color: rgba(255,45,120,0.2);
  }
  .dn-nav-link.active .dn-nav-icon { text-shadow: 0 0 10px #ff2d78; }
  .dn-tr:hover > td { background: rgba(255,45,120,0.04) !important; }
  .dn-input:focus { outline:none; border-color:#ff2d78 !important; box-shadow:0 0 0 3px rgba(255,45,120,.15); }
  .dn-select:focus { outline:none; border-color:#ff2d78 !important; }
  .dn-btn:active { transform:scale(.97); }
  .dn-slide-up { animation: dn-slide-up 0.32s ease both; }
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
        width: 220, minWidth: 220, minHeight: '100vh',
        background: T.sidebar,
        borderRight: `1px solid ${T.border}`,
        display: 'flex', flexDirection: 'column',
        position: 'sticky', top: 0, height: '100vh', overflowY: 'auto',
      }}>

        {/* Logo */}
        <div style={{ padding: '24px 20px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <div style={{
              width: 34, height: 34, borderRadius: 10,
              background: `linear-gradient(135deg, ${T.pink}, ${T.purple})`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 15, fontWeight: 900, color: '#fff',
              boxShadow: `0 0 20px rgba(255,45,120,0.4)`,
            }}>
              D
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 900, color: T.text, letterSpacing: '-0.01em' }}>
                D<span style={{ color: T.pink }}>&</span>N
              </div>
              <div style={{ fontSize: 9, fontWeight: 700, color: T.muted, letterSpacing: '0.15em', textTransform: 'uppercase' }}>
                Admin
              </div>
            </div>
          </div>

          {/* Live indicator */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            marginTop: 12, padding: '5px 10px',
            background: 'rgba(184,255,60,0.07)',
            border: '1px solid rgba(184,255,60,0.15)',
            borderRadius: 8, width: 'fit-content',
          }}>
            <span style={{
              width: 6, height: 6, borderRadius: '50%',
              background: T.lime, display: 'inline-block',
              boxShadow: `0 0 6px ${T.lime}`,
              animation: 'dn-pulse 2s ease-in-out infinite',
            }} />
            <span style={{ fontSize: 10, fontWeight: 700, color: T.lime, letterSpacing: '0.06em' }}>LIVE</span>
          </div>
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: T.border, margin: '0 16px 12px' }} />

        {/* Nav links */}
        <nav style={{ flex: 1, padding: '0 12px', display: 'flex', flexDirection: 'column', gap: 2 }}>
          {NAV.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className="dn-nav-link"
              style={item.danger ? ({ isActive }) => ({
                color: isActive ? T.pink : 'rgba(255,45,120,0.5)',
              }) : undefined}
            >
              <span className="dn-nav-icon" style={{ fontSize: 14, width: 18, textAlign: 'center', lineHeight: 1 }}>
                {item.icon}
              </span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Bottom: user + logout */}
        <div style={{ padding: '16px 12px', borderTop: `1px solid ${T.border}` }}>
          <div style={{ padding: '10px 12px', background: T.faint, borderRadius: 10, marginBottom: 8 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: T.text, marginBottom: 2 }}>
              {admin?.name || 'Admin'}
            </div>
            <div style={{ fontSize: 10, color: T.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {admin?.email || ''}
            </div>
          </div>
          <button
            onClick={handleLogout}
            style={{
              width: '100%', padding: '8px',
              background: 'transparent',
              border: `1px solid ${T.border}`,
              borderRadius: 9, color: T.muted,
              fontSize: 12, fontWeight: 600,
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