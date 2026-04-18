// D&N ACCESSORIES · Admin Design System v4.0 "CINEMATIC NOIR"

import { useState, useEffect } from 'react'

const T = {
  bg:       '#04040d',
  surface:  '#0a0a16',
  card:     '#0e0e1c',
  cardHi:   '#121224',
  border:   'rgba(255,255,255,0.06)',
  borderHi: 'rgba(255,255,255,0.12)',
  borderGlow:'rgba(255,45,120,0.35)',

  pink:     '#ff2d78',
  lime:     '#b8ff3c',
  gold:     '#ffc53d',
  cyan:     '#00e5ff',
  purple:   '#a259ff',

  pinkDim:  'rgba(255,45,120,0.12)',
  limeDim:  'rgba(184,255,60,0.10)',
  goldDim:  'rgba(255,197,61,0.12)',
  cyanDim:  'rgba(0,229,255,0.10)',
  purpleDim:'rgba(162,89,255,0.10)',

  text:     '#eeeef8',
  muted:    '#5a5a78',
  faint:    '#1a1a2e',

  font:     "'DM Sans', 'Segoe UI', system-ui, sans-serif",
  mono:     "'JetBrains Mono', 'Fira Code', monospace",
}

const GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,700;0,9..40,900&family=JetBrains+Mono:wght@400;600&display=swap');

  * { box-sizing: border-box; margin: 0; padding: 0; }

  .dn-admin-root {
    background: ${T.bg};
    color: ${T.text};
    font-family: ${T.font};
    min-height: 100vh;
  }

  ::-webkit-scrollbar { width: 3px; height: 3px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: #1e1e3a; border-radius: 3px; }
  ::-webkit-scrollbar-thumb:hover { background: #2e2e4a; }

  @keyframes dn-pulse    { 0%,100%{opacity:1} 50%{opacity:0.35} }
  @keyframes dn-spin     { to{transform:rotate(360deg)} }
  @keyframes dn-slide-up { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
  @keyframes dn-glow-in  { from{opacity:0;transform:scale(0.97)} to{opacity:1;transform:scale(1)} }
  @keyframes dn-shimmer  { 0%{background-position:200% center} 100%{background-position:-200% center} }
  @keyframes dn-border-spin { to { --border-angle: 360deg } }

  .dn-slide-up  { animation: dn-slide-up 0.4s cubic-bezier(0.16,1,0.3,1) both; }
  .dn-glow-in   { animation: dn-glow-in  0.3s cubic-bezier(0.16,1,0.3,1) both; }

  .dn-tr { transition: background 0.12s; }
  .dn-tr:hover > td { background: rgba(255,45,120,0.035) !important; }

  .dn-input:focus  { outline:none; border-color: ${T.pink} !important; box-shadow: 0 0 0 3px rgba(255,45,120,0.12), 0 0 20px rgba(255,45,120,0.08); }
  .dn-select:focus { outline:none; border-color: ${T.pink} !important; box-shadow: 0 0 0 3px rgba(255,45,120,0.12); }
  .dn-btn:active   { transform: scale(0.96); }
  .dn-badge        { transition: background 0.2s, color 0.2s; }

  .dn-card-hover {
    transition: border-color 0.25s, transform 0.25s, box-shadow 0.25s;
  }
  .dn-card-hover:hover {
    border-color: rgba(255,255,255,0.1) !important;
    transform: translateY(-2px);
    box-shadow: 0 20px 60px -20px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,45,120,0.08) !important;
  }
`

function injectStyles() {
  if (document.getElementById('dn-admin-styles')) return
  const el = document.createElement('style')
  el.id = 'dn-admin-styles'
  el.textContent = GLOBAL_CSS
  document.head.appendChild(el)
}

export function AdminShell({ children }) {
  useEffect(() => { injectStyles() }, [])
  return <div className="dn-admin-root">{children}</div>
}

export function PageHeader({ title, subtitle, action }) {
  useEffect(() => { injectStyles() }, [])
  return (
    <div style={{
      position: 'sticky', top: 0, zIndex: 40,
      background: `${T.bg}e8`,
      backdropFilter: 'blur(24px) saturate(180%)',
      borderBottom: `1px solid ${T.border}`,
      padding: '0 32px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 64, gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 14 }}>
          <h1 style={{ fontSize: 19, fontWeight: 900, color: T.text, letterSpacing: '-0.03em', lineHeight: 1 }}>
            {title}
          </h1>
          {subtitle && <span style={{ fontSize: 11, color: T.muted, fontWeight: 500, letterSpacing: '0.02em' }}>{subtitle}</span>}
        </div>
        {action && <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>{action}</div>}
      </div>
    </div>
  )
}

export function PageContent({ children }) {
  return (
    <div className="dn-slide-up" style={{ padding: '28px 32px', maxWidth: 1440 }}>
      {children}
    </div>
  )
}

export function KpiGrid({ children }) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
      gap: 14, marginBottom: 24,
    }}>
      {children}
    </div>
  )
}

export function KpiCard({ label, value, change, changeUp, accent }) {
  const [hov, setHov] = useState(false)
  const accentColor = accent ? T.pink : T.lime
  const glowColor   = accent ? 'rgba(255,45,120,0.2)' : 'rgba(184,255,60,0.12)'

  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: hov ? T.cardHi : T.card,
        border: `1px solid ${hov ? T.borderHi : T.border}`,
        borderRadius: 18,
        padding: '22px 24px',
        position: 'relative',
        overflow: 'hidden',
        transition: 'all 0.25s cubic-bezier(0.16,1,0.3,1)',
        transform: hov ? 'translateY(-3px)' : 'translateY(0)',
        boxShadow: hov ? `0 24px 48px -12px rgba(0,0,0,0.5), 0 0 0 1px ${glowColor}` : 'none',
        cursor: 'default',
      }}
    >
      {/* Top gradient line */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 2,
        background: `linear-gradient(90deg, ${accentColor}, ${accentColor}80, transparent)`,
        opacity: hov ? 1 : 0.7,
        transition: 'opacity 0.25s',
      }} />
      {/* Subtle corner glow */}
      <div style={{
        position: 'absolute', top: -30, left: -30, width: 100, height: 100,
        background: `radial-gradient(circle, ${glowColor} 0%, transparent 70%)`,
        opacity: hov ? 1 : 0,
        transition: 'opacity 0.3s',
        pointerEvents: 'none',
      }} />

      <div style={{ fontSize: 10, fontWeight: 700, color: T.muted, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 12 }}>
        {label}
      </div>
      <div style={{
        fontSize: 30, fontWeight: 900, color: T.text,
        letterSpacing: '-0.03em', lineHeight: 1,
        marginBottom: change ? 12 : 0,
      }}>
        {value}
      </div>
      {change && (
        <div style={{ fontSize: 11, fontWeight: 600, color: changeUp ? T.lime : T.pink, display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ fontSize: 13 }}>{changeUp ? '↑' : '↓'}</span> {change}
        </div>
      )}
    </div>
  )
}

export function Card({ children, style, glowColor }) {
  return (
    <div style={{
      background: T.card,
      border: `1px solid ${T.border}`,
      borderRadius: 18,
      overflow: 'hidden',
      marginBottom: 16,
      boxShadow: glowColor ? `0 0 60px -15px ${glowColor}` : 'none',
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
      padding: '14px 22px',
      borderBottom: `1px solid ${T.border}`,
      background: 'rgba(255,255,255,0.015)',
    }}>
      <span style={{ fontSize: 12, fontWeight: 700, color: T.text, letterSpacing: '0.02em' }}>{title}</span>
      {action && <div>{action}</div>}
    </div>
  )
}

export function Table({ headers, children }) {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr style={{ background: 'rgba(255,255,255,0.015)' }}>
            {headers.map((h, i) => (
              <th key={i} style={{
                padding: '10px 18px',
                textAlign: 'left',
                fontSize: 9.5,
                fontWeight: 700,
                letterSpacing: '0.14em',
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
      style={{ cursor: onClick ? 'pointer' : 'default' }}
    >
      {children}
    </tr>
  )
}

export function Td({ children, muted, pink, style }) {
  return (
    <td style={{
      padding: '13px 18px',
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

const STATUS_MAP = {
  pending:   { bg: 'rgba(255,197,61,0.12)',  color: T.gold,   label: 'Pending'   },
  paid:      { bg: 'rgba(184,255,60,0.10)',  color: T.lime,   label: 'Paid'      },
  shipped:   { bg: 'rgba(0,229,255,0.08)',   color: T.cyan,   label: 'Shipped'   },
  refunded:  { bg: 'rgba(162,89,255,0.12)',  color: T.purple, label: 'Refunded'  },
  cancelled: { bg: 'rgba(255,45,120,0.10)',  color: T.pink,   label: 'Cancelled' },
  ok:        { bg: 'rgba(184,255,60,0.10)',  color: T.lime,   label: 'In Stock'  },
  low:       { bg: 'rgba(255,197,61,0.12)',  color: T.gold,   label: 'Low'       },
  critical:  { bg: 'rgba(255,45,120,0.10)',  color: T.pink,   label: 'Out'       },
  active:    { bg: 'rgba(184,255,60,0.10)',  color: T.lime,   label: 'Active'    },
}

export function StatusPill({ status }) {
  const s = STATUS_MAP[status] || { bg: T.faint, color: T.muted, label: status }
  return (
    <span className="dn-badge" style={{
      display: 'inline-block',
      padding: '3px 11px',
      borderRadius: 99,
      fontSize: 9.5,
      fontWeight: 700,
      letterSpacing: '0.1em',
      textTransform: 'uppercase',
      background: s.bg,
      color: s.color,
    }}>
      {s.label}
    </span>
  )
}

export function Btn({ children, onClick, disabled, variant, size, style }) {
  const [hov, setHov] = useState(false)
  const isPrimary = !variant || variant === 'primary'
  const isDanger  = variant === 'danger'
  const isSm      = size === 'sm'

  const bg     = isPrimary ? T.pink : isDanger ? 'rgba(255,45,120,0.10)' : 'transparent'
  const color  = isPrimary ? '#fff' : isDanger ? T.pink : T.muted
  const border = isPrimary ? 'none' : `1px solid ${isDanger ? 'rgba(255,45,120,0.25)' : T.border}`
  const shadow = isPrimary && hov ? `0 0 28px rgba(255,45,120,0.45), 0 8px 16px rgba(255,45,120,0.2)` : 'none'

  return (
    <button
      className="dn-btn"
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        padding: isSm ? '5px 13px' : '9px 20px',
        background: hov && !isPrimary ? T.pinkDim : bg,
        color: hov && !isPrimary && !isDanger ? T.text : color,
        border,
        borderRadius: 10,
        fontSize: isSm ? 11 : 12,
        fontWeight: 700,
        letterSpacing: '0.04em',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.45 : 1,
        transition: 'all 0.18s cubic-bezier(0.16,1,0.3,1)',
        fontFamily: T.font,
        whiteSpace: 'nowrap',
        boxShadow: shadow,
        filter: isPrimary && hov && !disabled ? 'brightness(1.1)' : 'none',
        ...style,
      }}
    >
      {children}
    </button>
  )
}

export function Input({ label, value, onChange, placeholder, type, step, style, onKeyDown }) {
  return (
    <div>
      {label && (
        <label style={{
          display: 'block', fontSize: 9.5, fontWeight: 700,
          color: T.muted, letterSpacing: '0.12em',
          textTransform: 'uppercase', marginBottom: 7,
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
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        style={{
          width: '100%',
          padding: '9px 14px',
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

export function Select({ label, value, onChange, children, style }) {
  return (
    <div>
      {label && (
        <label style={{
          display: 'block', fontSize: 9.5, fontWeight: 700,
          color: T.muted, letterSpacing: '0.12em',
          textTransform: 'uppercase', marginBottom: 7,
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
          padding: '9px 14px',
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

export function Toggle({ checked, onChange }) {
  return (
    <div
      onClick={() => onChange(!checked)}
      style={{
        width: 42, height: 23,
        background: checked ? T.pink : T.faint,
        borderRadius: 99,
        position: 'relative',
        cursor: 'pointer',
        transition: 'background 0.25s',
        flexShrink: 0,
        boxShadow: checked ? `0 0 16px rgba(255,45,120,0.4)` : 'none',
      }}
    >
      <div style={{
        position: 'absolute',
        top: 3, left: checked ? 22 : 3,
        width: 17, height: 17,
        borderRadius: '50%',
        background: '#fff',
        transition: 'left 0.22s cubic-bezier(0.34,1.56,0.64,1)',
        boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
      }} />
    </div>
  )
}

export function Spinner() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 0', gap: 16 }}>
      <div style={{
        width: 36, height: 36,
        border: `2px solid ${T.faint}`,
        borderTop: `2px solid ${T.pink}`,
        borderRight: `2px solid rgba(255,45,120,0.4)`,
        borderRadius: '50%',
        animation: 'dn-spin 0.65s linear infinite',
        boxShadow: `0 0 16px rgba(255,45,120,0.2)`,
      }} />
    </div>
  )
}

export function Empty({ message }) {
  return (
    <div style={{ textAlign: 'center', padding: '70px 20px', color: T.muted, fontSize: 13 }}>
      <div style={{ fontSize: 28, marginBottom: 14, opacity: 0.2 }}>◎</div>
      {message}
    </div>
  )
}

export function LiveDot() {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 11, fontWeight: 600, color: T.lime }}>
      <span style={{
        width: 7, height: 7, borderRadius: '50%',
        background: T.lime,
        display: 'inline-block',
        animation: 'dn-pulse 2s ease-in-out infinite',
        boxShadow: `0 0 10px ${T.lime}, 0 0 20px rgba(184,255,60,0.3)`,
      }} />
      Live
    </span>
  )
}

export function AccentBanner({ children }) {
  return (
    <div style={{ background: `linear-gradient(90deg, ${T.pink}, ${T.purple}, ${T.cyan})`, padding: '2px 0' }}>
      <div style={{ background: T.bg, padding: '0 32px', display: 'flex', alignItems: 'center', gap: 8, height: 28 }}>
        {children}
      </div>
    </div>
  )
}

export function SectionDivider({ label }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14, margin: '28px 0 18px' }}>
      <span style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: T.muted, whiteSpace: 'nowrap' }}>
        {label}
      </span>
      <div style={{ flex: 1, height: '1px', background: `linear-gradient(90deg, ${T.border}, transparent)` }} />
    </div>
  )
}

export function Mono({ children, color }) {
  return (
    <span style={{ fontFamily: T.mono, fontSize: 12, color: color || T.gold, letterSpacing: '0.04em' }}>
      {children}
    </span>
  )
}

export function CopyBtn({ text }) {
  const [copied, setCopied] = useState(false)
  function copy() {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 1800)
  }
  return (
    <button onClick={copy} style={{
      background: 'none',
      border: `1px solid ${copied ? T.lime : T.border}`,
      borderRadius: 6, padding: '2px 9px',
      fontSize: 10, fontWeight: 700,
      color: copied ? T.lime : T.muted,
      cursor: 'pointer', fontFamily: T.font,
      transition: 'all 0.2s',
    }}>
      {copied ? '✓ Copied' : 'Copy'}
    </button>
  )
}

export function Modal({ title, children, onClose, width }) {
  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'rgba(0,0,0,0.88)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 200, padding: 24,
      backdropFilter: 'blur(12px) saturate(150%)',
    }}>
      <div className="dn-glow-in" style={{
        background: T.card,
        border: `1px solid ${T.borderHi}`,
        borderRadius: 22,
        padding: 32,
        width: '100%',
        maxWidth: width || 500,
        maxHeight: '90vh',
        overflowY: 'auto',
        boxShadow: `0 0 80px -20px rgba(255,45,120,0.2), 0 40px 80px -20px rgba(0,0,0,0.7)`,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 26 }}>
          <h3 style={{ fontSize: 16, fontWeight: 900, color: T.text, letterSpacing: '-0.02em' }}>{title}</h3>
          <button onClick={onClose} style={{
            background: T.faint, border: `1px solid ${T.border}`,
            color: T.muted, fontSize: 18, cursor: 'pointer',
            width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center',
            borderRadius: 8, transition: 'all 0.15s',
          }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,45,120,0.12)'; e.currentTarget.style.color = T.pink }}
            onMouseLeave={e => { e.currentTarget.style.background = T.faint; e.currentTarget.style.color = T.muted }}
          >×</button>
        </div>
        {children}
      </div>
    </div>
  )
}

export function ModalFooter({ onClose, onSave, saving, saveLabel }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 28, paddingTop: 20, borderTop: `1px solid ${T.border}` }}>
      <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
      <Btn onClick={onSave} disabled={saving}>{saving ? 'Saving...' : (saveLabel || 'Save')}</Btn>
    </div>
  )
}

export function AlertBanner({ type, title, body }) {
  const colors = {
    warning: { bg: 'rgba(255,197,61,0.06)', border: 'rgba(255,197,61,0.2)', color: T.gold   },
    danger:  { bg: 'rgba(255,45,120,0.06)', border: 'rgba(255,45,120,0.2)', color: T.pink   },
    success: { bg: 'rgba(184,255,60,0.06)', border: 'rgba(184,255,60,0.2)', color: T.lime   },
    info:    { bg: 'rgba(0,229,255,0.06)',  border: 'rgba(0,229,255,0.2)',  color: T.cyan   },
  }
  const c = colors[type] || colors.info
  return (
    <div style={{
      padding: '14px 18px', marginBottom: 20,
      background: c.bg, border: `1px solid ${c.border}`,
      borderRadius: 12,
    }}>
      {title && <div style={{ fontSize: 12, fontWeight: 700, color: c.color, marginBottom: body ? 4 : 0 }}>{title}</div>}
      {body  && <div style={{ fontSize: 12, color: T.muted, lineHeight: 1.65 }}>{body}</div>}
    </div>
  )
}

export function PLRow({ label, value, positive, muted }) {
  const color = muted ? T.faint : value >= 0 ? T.text : T.pink
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 22px', borderBottom: `1px solid ${T.border}` }}>
      <span style={{ fontSize: 13, color: T.muted }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 600, color: positive ? T.lime : color, fontFamily: T.mono }}>
        {value < 0 ? `(LKR ${Math.abs(value).toLocaleString()})` : `LKR ${value.toLocaleString()}`}
      </span>
    </div>
  )
}

export function PLTotal({ label, value }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 22px', borderTop: `1px solid ${T.borderHi}`, background: T.surface, marginBottom: 4 }}>
      <span style={{ fontSize: 13, fontWeight: 700, color: T.text }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 700, color: value >= 0 ? T.text : T.pink, fontFamily: T.mono }}>
        {value < 0 ? `(LKR ${Math.abs(value).toLocaleString()})` : `LKR ${value.toLocaleString()}`}
      </span>
    </div>
  )
}

export function PLSection({ title }) {
  return (
    <div style={{ padding: '8px 22px', background: `${T.bg}cc`, fontSize: 9.5, fontWeight: 700, letterSpacing: '0.16em', color: T.muted, textTransform: 'uppercase' }}>
      {title}
    </div>
  )
}

export function Tabs({ tabs, active, onChange }) {
  return (
    <div style={{ display: 'flex', gap: 2, marginBottom: 20, background: T.surface, border: `1px solid ${T.border}`, borderRadius: 13, padding: 4, width: 'fit-content' }}>
      {tabs.map(t => (
        <button key={t.key} onClick={() => onChange(t.key)} style={{
          padding: '7px 20px', fontSize: 12, fontWeight: 700,
          borderRadius: 10, border: 'none', cursor: 'pointer', fontFamily: T.font,
          background: active === t.key ? T.pink : 'transparent',
          color: active === t.key ? '#fff' : T.muted,
          transition: 'all 0.18s',
          boxShadow: active === t.key ? `0 0 20px rgba(255,45,120,0.35), 0 4px 12px rgba(255,45,120,0.2)` : 'none',
        }}>
          {t.label}
        </button>
      ))}
    </div>
  )
}

export function Checkbox({ checked, onChange, danger }) {
  const color = danger ? T.pink : T.lime
  return (
    <div
      onClick={() => onChange(!checked)}
      style={{
        width: 19, height: 19, borderRadius: 6, flexShrink: 0,
        border: `1.5px solid ${checked ? color : T.border}`,
        background: checked ? color : 'transparent',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer', transition: 'all 0.15s',
        boxShadow: checked ? `0 0 12px ${color}66` : 'none',
      }}
    >
      {checked && <span style={{ color: '#000', fontSize: 11, lineHeight: 1, fontWeight: 900 }}>✓</span>}
    </div>
  )
}

export function DangerBadge({ label }) {
  return (
    <span style={{
      fontSize: 9, padding: '2px 8px', borderRadius: 20,
      background: 'rgba(255,45,120,0.10)', color: T.pink,
      fontWeight: 700, letterSpacing: '0.1em',
      border: '1px solid rgba(255,45,120,0.2)',
    }}>
      {label || 'HIGH IMPACT'}
    </span>
  )
}

export function ImgThumb({ src, size }) {
  const s = size || 40
  return (
    <div style={{ width: s, height: s, borderRadius: 9, overflow: 'hidden', background: T.faint, flexShrink: 0 }}>
      {src && <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
    </div>
  )
}

export function CatPill({ label }) {
  return (
    <span style={{
      fontSize: 10, padding: '3px 10px', borderRadius: 20,
      background: T.faint, color: T.muted,
      fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase',
      border: `1px solid ${T.border}`,
    }}>
      {label}
    </span>
  )
}

export function ExpandedRow({ colSpan, children }) {
  return (
    <tr>
      <td colSpan={colSpan} style={{ background: T.bg, padding: '0 18px 18px' }}>
        {children}
      </td>
    </tr>
  )
}

export function DiffPanel({ label, data, type }) {
  const color = type === 'before' ? T.pink : T.lime
  return (
    <div>
      <div style={{ fontSize: 9.5, fontWeight: 700, color, letterSpacing: '0.12em', marginBottom: 7 }}>{label}</div>
      <pre style={{
        margin: 0, padding: '12px 16px',
        background: type === 'before' ? 'rgba(255,45,120,0.04)' : 'rgba(184,255,60,0.04)',
        border: `1px solid ${type === 'before' ? 'rgba(255,45,120,0.12)' : 'rgba(184,255,60,0.12)'}`,
        borderRadius: 10, fontSize: 11, fontFamily: T.mono,
        color: T.muted, overflow: 'auto', maxHeight: 180, whiteSpace: 'pre-wrap',
      }}>
        {data}
      </pre>
    </div>
  )
}

export function NetProfitRow({ value }) {
  const pos = value >= 0
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '20px 22px',
      borderTop: `1px solid ${T.borderHi}`,
      background: pos ? 'rgba(184,255,60,0.04)' : 'rgba(255,45,120,0.04)',
    }}>
      <span style={{ fontSize: 14, fontWeight: 900, color: T.text, letterSpacing: '0.04em' }}>NET PROFIT</span>
      <span style={{
        fontSize: 24, fontWeight: 900,
        color: pos ? T.lime : T.pink,
        fontFamily: T.mono,
        textShadow: pos ? `0 0 30px rgba(184,255,60,0.4)` : `0 0 30px rgba(255,45,120,0.4)`,
      }}>
        {value < 0 ? `(Rs ${Math.abs(Math.round(value)).toLocaleString()})` : `Rs ${Math.round(value).toLocaleString()}`}
      </span>
    </div>
  )
}

export { T as tokens }