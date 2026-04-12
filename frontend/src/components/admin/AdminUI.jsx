// ─────────────────────────────────────────────────────────────────────────────
//  D&N ACCESSORIES  ·  Admin Design System  v3.0  "NEON NOIR"
//  Drop this file into: src/components/admin/AdminUI.jsx
//  Replace the old AdminUI entirely — zero other changes needed
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect } from 'react'

// ── DESIGN TOKENS ─────────────────────────────────────────────────────────────
const T = {
  bg:       '#080810',
  surface:  '#0f0f1a',
  card:     '#13131f',
  border:   'rgba(255,255,255,0.07)',
  borderHi: 'rgba(255,255,255,0.14)',

  pink:     '#ff2d78',
  lime:     '#b8ff3c',
  gold:     '#ffc53d',
  cyan:     '#00e5ff',
  purple:   '#a259ff',

  pinkDim:  'rgba(255,45,120,0.12)',
  limeDim:  'rgba(184,255,60,0.10)',
  goldDim:  'rgba(255,197,61,0.12)',
  cyanDim:  'rgba(0,229,255,0.10)',

  text:     '#f0f0f8',
  muted:    '#6b6b85',
  faint:    '#2a2a3d',

  font:     "'DM Sans', 'Segoe UI', system-ui, sans-serif",
  mono:     "'JetBrains Mono', 'Fira Code', monospace",
}

// ── GLOBAL INJECTED STYLES ────────────────────────────────────────────────────
const GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700;900&family=JetBrains+Mono:wght@400;600&display=swap');

  * { box-sizing: border-box; margin: 0; padding: 0; }

  .dn-admin-root {
    background: ${T.bg};
    color: ${T.text};
    font-family: ${T.font};
    min-height: 100vh;
  }

  /* scrollbar */
  ::-webkit-scrollbar { width: 4px; height: 4px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: ${T.faint}; border-radius: 4px; }
  ::-webkit-scrollbar-thumb:hover { background: ${T.muted}; }

  /* glow keyframes */
  @keyframes dn-pulse { 0%,100% { opacity:1 } 50% { opacity:0.4 } }
  @keyframes dn-spin  { to { transform: rotate(360deg) } }
  @keyframes dn-slide-up {
    from { opacity:0; transform:translateY(12px) }
    to   { opacity:1; transform:translateY(0) }
  }
  @keyframes dn-marquee {
    from { transform: translateX(0) }
    to   { transform: translateX(-50%) }
  }

  .dn-slide-up { animation: dn-slide-up 0.35s ease both; }

  /* table hover */
  .dn-tr:hover > td { background: rgba(255,45,120,0.04) !important; }

  /* input focus glow */
  .dn-input:focus { outline: none; border-color: ${T.pink} !important; box-shadow: 0 0 0 3px rgba(255,45,120,0.15); }
  .dn-select:focus { outline: none; border-color: ${T.pink} !important; }

  /* btn active */
  .dn-btn:active { transform: scale(0.97); }

  /* pill badge anim */
  .dn-badge { transition: background 0.2s, color 0.2s; }
`

function injectStyles() {
  if (document.getElementById('dn-admin-styles')) return
  const el = document.createElement('style')
  el.id = 'dn-admin-styles'
  el.textContent = GLOBAL_CSS
  document.head.appendChild(el)
}

// ── LAYOUT SHELL ──────────────────────────────────────────────────────────────
export function AdminShell({ children }) {
  useEffect(() => { injectStyles() }, [])
  return (
    <div className="dn-admin-root">
      {children}
    </div>
  )
}

// ── PAGE HEADER ───────────────────────────────────────────────────────────────
export function PageHeader({ title, subtitle, action }) {
  useEffect(() => { injectStyles() }, [])
  return (
    <div style={{
      position: 'sticky', top: 0, zIndex: 40,
      background: `${T.bg}f0`,
      backdropFilter: 'blur(16px)',
      borderBottom: `1px solid ${T.border}`,
      padding: '0 32px',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        height: 64, gap: 16,
      }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
          <h1 style={{
            fontSize: 20, fontWeight: 900, color: T.text,
            letterSpacing: '-0.02em', lineHeight: 1,
          }}>
            {title}
          </h1>
          {subtitle && (
            <span style={{ fontSize: 12, color: T.muted, fontWeight: 500 }}>
              {subtitle}
            </span>
          )}
        </div>
        {action && <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>{action}</div>}
      </div>
    </div>
  )
}

// ── PAGE CONTENT ──────────────────────────────────────────────────────────────
export function PageContent({ children }) {
  return (
    <div className="dn-slide-up" style={{ padding: '28px 32px', maxWidth: 1400 }}>
      {children}
    </div>
  )
}

// ── KPI GRID ──────────────────────────────────────────────────────────────────
export function KpiGrid({ children }) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
      gap: 12,
      marginBottom: 24,
    }}>
      {children}
    </div>
  )
}

export function KpiCard({ label, value, change, changeUp, accent }) {
  const accentColor = accent ? T.pink : T.lime
  return (
    <div style={{
      background: T.card,
      border: `1px solid ${T.border}`,
      borderRadius: 16,
      padding: '20px 22px',
      position: 'relative',
      overflow: 'hidden',
      transition: 'border-color 0.2s, transform 0.2s',
    }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = T.borderHi; e.currentTarget.style.transform = 'translateY(-2px)' }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.transform = 'translateY(0)' }}
    >
      {/* accent glow bar */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 2,
        background: `linear-gradient(90deg, ${accentColor}, transparent)`,
      }} />

      <div style={{ fontSize: 11, fontWeight: 700, color: T.muted, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 10 }}>
        {label}
      </div>
      <div style={{ fontSize: 28, fontWeight: 900, color: T.text, letterSpacing: '-0.02em', lineHeight: 1, marginBottom: change ? 10 : 0 }}>
        {value}
      </div>
      {change && (
        <div style={{ fontSize: 11, fontWeight: 600, color: changeUp ? T.lime : T.pink }}>
          {changeUp ? '↑' : '↓'} {change}
        </div>
      )}
    </div>
  )
}

// ── CARD ──────────────────────────────────────────────────────────────────────
export function Card({ children, style, glowColor }) {
  return (
    <div style={{
      background: T.card,
      border: `1px solid ${T.border}`,
      borderRadius: 16,
      overflow: 'hidden',
      marginBottom: 16,
      boxShadow: glowColor ? `0 0 40px -10px ${glowColor}` : 'none',
      ...style,
    }}>
      {children}
    </div>
  )
}

export function CardHeader({ title, action }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '14px 20px',
      borderBottom: `1px solid ${T.border}`,
    }}>
      <span style={{ fontSize: 13, fontWeight: 700, color: T.text }}>{title}</span>
      {action && <div>{action}</div>}
    </div>
  )
}

// ── TABLE ─────────────────────────────────────────────────────────────────────
export function Table({ headers, children }) {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr>
            {headers.map((h, i) => (
              <th key={i} style={{
                padding: '10px 16px',
                textAlign: 'left',
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color: T.muted,
                borderBottom: `1px solid ${T.border}`,
                whiteSpace: 'nowrap',
              }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  )
}

export function Tr({ children, onClick }) {
  return (
    <tr
      className="dn-tr"
      onClick={onClick}
      style={{ cursor: onClick ? 'pointer' : 'default', transition: 'background 0.15s' }}
    >
      {children}
    </tr>
  )
}

export function Td({ children, muted, pink, style }) {
  return (
    <td style={{
      padding: '12px 16px',
      borderBottom: `1px solid ${T.border}`,
      color: pink ? T.pink : muted ? T.muted : T.text,
      fontWeight: pink ? 700 : 400,
      verticalAlign: 'middle',
      ...style,
    }}>
      {children}
    </td>
  )
}

// ── STATUS PILL ───────────────────────────────────────────────────────────────
const STATUS_MAP = {
  pending:   { bg: 'rgba(255,197,61,0.14)',  color: T.gold,   label: 'Pending'   },
  paid:      { bg: 'rgba(184,255,60,0.12)',  color: T.lime,   label: 'Paid'      },
  shipped:   { bg: 'rgba(0,229,255,0.10)',   color: T.cyan,   label: 'Shipped'   },
  refunded:  { bg: 'rgba(162,89,255,0.14)', color: T.purple, label: 'Refunded'  },
  cancelled: { bg: 'rgba(255,45,120,0.12)',  color: T.pink,   label: 'Cancelled' },
  ok:        { bg: 'rgba(184,255,60,0.12)',  color: T.lime,   label: 'In Stock'  },
  low:       { bg: 'rgba(255,197,61,0.14)',  color: T.gold,   label: 'Low'       },
  critical:  { bg: 'rgba(255,45,120,0.12)',  color: T.pink,   label: 'Out'       },
  active:    { bg: 'rgba(184,255,60,0.12)',  color: T.lime,   label: 'Active'    },
}

export function StatusPill({ status }) {
  const s = STATUS_MAP[status] || { bg: T.faint, color: T.muted, label: status }
  return (
    <span className="dn-badge" style={{
      display: 'inline-block',
      padding: '3px 10px',
      borderRadius: 99,
      fontSize: 10,
      fontWeight: 700,
      letterSpacing: '0.08em',
      textTransform: 'uppercase',
      background: s.bg,
      color: s.color,
    }}>
      {s.label}
    </span>
  )
}

// ── BUTTON ────────────────────────────────────────────────────────────────────
export function Btn({ children, onClick, disabled, variant, size, style }) {
  const isPrimary = !variant || variant === 'primary'
  const isDanger  = variant === 'danger'
  const isGhost   = variant === 'ghost'
  const isSm      = size === 'sm'

  const bg    = isPrimary ? T.pink : isDanger ? 'rgba(255,45,120,0.12)' : 'transparent'
  const color = isPrimary ? '#fff' : isDanger ? T.pink : T.muted
  const border= isPrimary ? 'none' : `1px solid ${isDanger ? 'rgba(255,45,120,0.3)' : T.border}`

  return (
    <button
      className="dn-btn"
      onClick={onClick}
      disabled={disabled}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: isSm ? '5px 12px' : '9px 18px',
        background: bg,
        color,
        border,
        borderRadius: 10,
        fontSize: isSm ? 11 : 12,
        fontWeight: 700,
        letterSpacing: '0.04em',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        transition: 'all 0.15s',
        fontFamily: T.font,
        whiteSpace: 'nowrap',
        ...style,
      }}
      onMouseEnter={e => {
        if (!disabled && !isPrimary) e.currentTarget.style.background = T.pinkDim
        if (!disabled && isPrimary) e.currentTarget.style.filter = 'brightness(1.12)'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.background = bg
        e.currentTarget.style.filter = 'none'
      }}
    >
      {children}
    </button>
  )
}

// ── INPUT ─────────────────────────────────────────────────────────────────────
export function Input({ label, value, onChange, placeholder, type, step, style }) {
  return (
    <div>
      {label && (
        <label style={{
          display: 'block', fontSize: 10, fontWeight: 700,
          color: T.muted, letterSpacing: '0.1em',
          textTransform: 'uppercase', marginBottom: 6,
        }}>
          {label}
        </label>
      )}
      <input
        className="dn-input"
        type={type || 'text'}
        step={step}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        style={{
          width: '100%',
          padding: '9px 13px',
          background: T.surface,
          border: `1px solid ${T.border}`,
          borderRadius: 10,
          color: T.text,
          fontSize: 13,
          fontFamily: T.font,
          transition: 'border-color 0.15s, box-shadow 0.15s',
          ...style,
        }}
      />
    </div>
  )
}

// ── SELECT ────────────────────────────────────────────────────────────────────
export function Select({ label, value, onChange, children, style }) {
  return (
    <div>
      {label && (
        <label style={{
          display: 'block', fontSize: 10, fontWeight: 700,
          color: T.muted, letterSpacing: '0.1em',
          textTransform: 'uppercase', marginBottom: 6,
        }}>
          {label}
        </label>
      )}
      <select
        className="dn-select"
        value={value}
        onChange={onChange}
        style={{
          width: '100%',
          padding: '9px 13px',
          background: T.surface,
          border: `1px solid ${T.border}`,
          borderRadius: 10,
          color: T.text,
          fontSize: 13,
          fontFamily: T.font,
          cursor: 'pointer',
          transition: 'border-color 0.15s',
          ...style,
        }}
      >
        {children}
      </select>
    </div>
  )
}

// ── TOGGLE ────────────────────────────────────────────────────────────────────
export function Toggle({ checked, onChange }) {
  return (
    <div
      onClick={() => onChange(!checked)}
      style={{
        width: 40, height: 22,
        background: checked ? T.pink : T.faint,
        borderRadius: 99,
        position: 'relative',
        cursor: 'pointer',
        transition: 'background 0.25s',
        flexShrink: 0,
      }}
    >
      <div style={{
        position: 'absolute',
        top: 3, left: checked ? 21 : 3,
        width: 16, height: 16,
        borderRadius: '50%',
        background: '#fff',
        transition: 'left 0.25s',
        boxShadow: checked ? `0 0 8px ${T.pink}` : 'none',
      }} />
    </div>
  )
}

// ── SPINNER ───────────────────────────────────────────────────────────────────
export function Spinner() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '60px 0' }}>
      <div style={{
        width: 32, height: 32,
        border: `3px solid ${T.faint}`,
        borderTop: `3px solid ${T.pink}`,
        borderRadius: '50%',
        animation: 'dn-spin 0.7s linear infinite',
      }} />
    </div>
  )
}

// ── EMPTY STATE ───────────────────────────────────────────────────────────────
export function Empty({ message }) {
  return (
    <div style={{
      textAlign: 'center',
      padding: '60px 20px',
      color: T.muted,
      fontSize: 13,
    }}>
      <div style={{ fontSize: 32, marginBottom: 12, opacity: 0.3 }}>◎</div>
      {message}
    </div>
  )
}

// ── LIVE DOT ──────────────────────────────────────────────────────────────────
export function LiveDot() {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 600, color: T.lime }}>
      <span style={{
        width: 6, height: 6, borderRadius: '50%',
        background: T.lime,
        display: 'inline-block',
        animation: 'dn-pulse 2s ease-in-out infinite',
        boxShadow: `0 0 6px ${T.lime}`,
      }} />
      Live
    </span>
  )
}

// ── ACCENT BANNER (decorative top-of-page stripe) ─────────────────────────────
export function AccentBanner({ children }) {
  return (
    <div style={{
      background: `linear-gradient(90deg, ${T.pink}, ${T.purple}, ${T.cyan})`,
      padding: '2px 0',
    }}>
      <div style={{ background: T.bg, padding: '0 32px', display: 'flex', alignItems: 'center', gap: 8, height: 28 }}>
        {children}
      </div>
    </div>
  )
}

// ── SECTION DIVIDER ───────────────────────────────────────────────────────────
export function SectionDivider({ label }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      margin: '24px 0 16px',
    }}>
      <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: T.muted, whiteSpace: 'nowrap' }}>
        {label}
      </span>
      <div style={{ flex: 1, height: '1px', background: T.border }} />
    </div>
  )
}

// ── MONO TEXT (for refs, IDs, batch codes) ────────────────────────────────────
export function Mono({ children, color }) {
  return (
    <span style={{ fontFamily: T.mono, fontSize: 12, color: color || T.gold, letterSpacing: '0.04em' }}>
      {children}
    </span>
  )
}

// ── COPY BUTTON ───────────────────────────────────────────────────────────────
export function CopyBtn({ text }) {
  const [copied, setCopied] = useState(false)
  function copy() {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 1800)
  }
  return (
    <button onClick={copy} style={{
      background: 'none', border: `1px solid ${T.border}`,
      borderRadius: 6, padding: '2px 8px',
      fontSize: 10, fontWeight: 700,
      color: copied ? T.lime : T.muted,
      cursor: 'pointer', fontFamily: T.font,
      transition: 'color 0.2s, border-color 0.2s',
    }}>
      {copied ? '✓ Copied' : 'Copy'}
    </button>
  )
}

// ── MODAL ─────────────────────────────────────────────────────────────────────
export function Modal({ title, children, onClose, width }) {
  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'rgba(0,0,0,0.85)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 200, padding: 24,
      backdropFilter: 'blur(8px)',
    }}>
      <div className="dn-slide-up" style={{
        background: T.card,
        border: `1px solid ${T.borderHi}`,
        borderRadius: 20,
        padding: 32,
        width: '100%',
        maxWidth: width || 500,
        maxHeight: '90vh',
        overflowY: 'auto',
        boxShadow: `0 0 60px -10px ${T.pinkDim}`,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h3 style={{ fontSize: 16, fontWeight: 900, color: T.text }}>{title}</h3>
          <button onClick={onClose} style={{
            background: 'none', border: 'none',
            color: T.muted, fontSize: 22, cursor: 'pointer',
            width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center',
            borderRadius: 8, transition: 'background 0.15s',
          }}
            onMouseEnter={e => e.currentTarget.style.background = T.faint}
            onMouseLeave={e => e.currentTarget.style.background = 'none'}
          >×</button>
        </div>
        {children}
      </div>
    </div>
  )
}

export function ModalFooter({ onClose, onSave, saving, saveLabel }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 28 }}>
      <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
      <Btn onClick={onSave} disabled={saving}>{saving ? 'Saving...' : (saveLabel || 'Save')}</Btn>
    </div>
  )
}

// ── ALERT BANNER ──────────────────────────────────────────────────────────────
export function AlertBanner({ type, title, body }) {
  const colors = {
    warning: { bg: 'rgba(255,197,61,0.08)',  border: 'rgba(255,197,61,0.25)', color: T.gold   },
    danger:  { bg: 'rgba(255,45,120,0.08)',  border: 'rgba(255,45,120,0.25)', color: T.pink   },
    success: { bg: 'rgba(184,255,60,0.08)',  border: 'rgba(184,255,60,0.25)', color: T.lime   },
    info:    { bg: 'rgba(0,229,255,0.08)',   border: 'rgba(0,229,255,0.25)',  color: T.cyan   },
  }
  const c = colors[type] || colors.info
  return (
    <div style={{
      padding: '14px 18px', marginBottom: 20,
      background: c.bg, border: `1px solid ${c.border}`,
      borderRadius: 12, display: 'flex', alignItems: 'flex-start', gap: 12,
    }}>
      <div>
        {title && <div style={{ fontSize: 13, fontWeight: 700, color: c.color, marginBottom: 4 }}>{title}</div>}
        {body  && <div style={{ fontSize: 12, color: T.muted, lineHeight: 1.6 }}>{body}</div>}
      </div>
    </div>
  )
}

// ── STAT ROW (for P&L lines) ──────────────────────────────────────────────────
export function PLRow({ label, value, positive, muted }) {
  const color = muted ? T.faint : value >= 0 ? T.text : T.pink
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 20px', borderBottom: `1px solid ${T.border}` }}>
      <span style={{ fontSize: 13, color: T.muted }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 600, color: positive ? T.lime : color, fontFamily: T.mono }}>
        {value < 0 ? `(LKR ${Math.abs(value).toLocaleString()})` : `LKR ${value.toLocaleString()}`}
      </span>
    </div>
  )
}

export function PLTotal({ label, value }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '11px 20px', borderTop: `1px solid ${T.borderHi}`, background: T.surface, marginBottom: 4 }}>
      <span style={{ fontSize: 13, fontWeight: 700, color: T.text }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 700, color: value >= 0 ? T.text : T.pink, fontFamily: T.mono }}>
        {value < 0 ? `(LKR ${Math.abs(value).toLocaleString()})` : `LKR ${value.toLocaleString()}`}
      </span>
    </div>
  )
}

export function PLSection({ title }) {
  return (
    <div style={{ padding: '8px 20px', background: T.bg, fontSize: 10, fontWeight: 700, letterSpacing: '0.15em', color: T.muted, textTransform: 'uppercase' }}>
      {title}
    </div>
  )
}

// ── TABS ──────────────────────────────────────────────────────────────────────
export function Tabs({ tabs, active, onChange }) {
  return (
    <div style={{ display: 'flex', gap: 2, marginBottom: 20, background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: 4, width: 'fit-content' }}>
      {tabs.map(t => (
        <button key={t.key} onClick={() => onChange(t.key)} style={{
          padding: '7px 18px', fontSize: 12, fontWeight: 700,
          borderRadius: 9, border: 'none', cursor: 'pointer', fontFamily: T.font,
          background: active === t.key ? T.pink : 'transparent',
          color: active === t.key ? '#fff' : T.muted,
          transition: 'all 0.15s',
          boxShadow: active === t.key ? `0 0 16px rgba(255,45,120,0.3)` : 'none',
        }}>
          {t.label}
        </button>
      ))}
    </div>
  )
}

// ── CHECKBOX (for reset targets) ──────────────────────────────────────────────
export function Checkbox({ checked, onChange, danger }) {
  const color = danger ? T.pink : T.lime
  return (
    <div
      onClick={() => onChange(!checked)}
      style={{
        width: 18, height: 18, borderRadius: 5, flexShrink: 0,
        border: `2px solid ${checked ? color : T.border}`,
        background: checked ? color : 'transparent',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer', transition: 'all 0.15s',
        boxShadow: checked ? `0 0 10px ${color}55` : 'none',
      }}
    >
      {checked && <span style={{ color: '#000', fontSize: 11, lineHeight: 1, fontWeight: 900 }}>✓</span>}
    </div>
  )
}

// ── DANGER BADGE ──────────────────────────────────────────────────────────────
export function DangerBadge({ label }) {
  return (
    <span style={{
      fontSize: 9, padding: '2px 7px', borderRadius: 20,
      background: 'rgba(255,45,120,0.12)', color: T.pink,
      fontWeight: 700, letterSpacing: '0.08em',
    }}>
      {label || 'HIGH IMPACT'}
    </span>
  )
}

// ── IMAGE THUMB ───────────────────────────────────────────────────────────────
export function ImgThumb({ src, size }) {
  const s = size || 40
  return (
    <div style={{ width: s, height: s, borderRadius: 8, overflow: 'hidden', background: T.faint, flexShrink: 0 }}>
      {src && <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
    </div>
  )
}

// ── CATEGORY PILL ─────────────────────────────────────────────────────────────
export function CatPill({ label }) {
  return (
    <span style={{
      fontSize: 10, padding: '3px 9px', borderRadius: 20,
      background: T.faint, color: T.muted,
      fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase',
    }}>
      {label}
    </span>
  )
}

// ── EXPANDED ROW WRAPPER ──────────────────────────────────────────────────────
export function ExpandedRow({ colSpan, children }) {
  return (
    <tr>
      <td colSpan={colSpan} style={{ background: T.bg, padding: '0 16px 16px' }}>
        {children}
      </td>
    </tr>
  )
}

// ── DIFF PANEL (audit log before/after) ───────────────────────────────────────
export function DiffPanel({ label, data, type }) {
  const color = type === 'before' ? T.pink : T.lime
  return (
    <div>
      <div style={{ fontSize: 10, fontWeight: 700, color, letterSpacing: '0.1em', marginBottom: 6 }}>
        {label}
      </div>
      <pre style={{
        margin: 0, padding: '10px 14px',
        background: type === 'before' ? 'rgba(255,45,120,0.05)' : 'rgba(184,255,60,0.05)',
        border: `1px solid ${type === 'before' ? 'rgba(255,45,120,0.15)' : 'rgba(184,255,60,0.15)'}`,
        borderRadius: 8, fontSize: 11, fontFamily: T.mono,
        color: T.muted, overflow: 'auto', maxHeight: 180, whiteSpace: 'pre-wrap',
      }}>
        {data}
      </pre>
    </div>
  )
}

// ── NET PROFIT ROW ────────────────────────────────────────────────────────────
export function NetProfitRow({ value }) {
  const pos = value >= 0
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '18px 20px',
      borderTop: `1px solid ${T.borderHi}`,
      background: pos ? 'rgba(184,255,60,0.05)' : 'rgba(255,45,120,0.05)',
    }}>
      <span style={{ fontSize: 15, fontWeight: 900, color: T.text }}>NET PROFIT</span>
      <span style={{ fontSize: 22, fontWeight: 900, color: pos ? T.lime : T.pink, fontFamily: T.mono }}>
        ${value.toFixed(2)}
      </span>
    </div>
  )
}

// ── EXPORT: design tokens for inline use in page files ────────────────────────
export { T as tokens }