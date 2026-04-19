// frontend/src/pages/admin/AdminStaff.jsx
// NEW FILE — Staff accounts management page

import { useState, useEffect } from 'react'
import adminApi from '../../lib/adminApi'

const ROLES = ['manager', 'finance', 'packer', 'viewer']

const ROLE_DESC = {
  owner:   'Full access to everything',
  manager: 'Products, orders, customers, inventory, suppliers',
  finance: 'Finance, expenses, bills, P&L, cash flow only',
  packer:  'Orders page only',
  viewer:  'Read-only — no write access',
}

const ROLE_COLOR = {
  owner:   { bg: '#EEEDFE', color: '#3C3489' },
  manager: { bg: '#E1F5EE', color: '#085041' },
  finance: { bg: '#FAEEDA', color: '#633806' },
  packer:  { bg: '#E6F1FB', color: '#0C447C' },
  viewer:  { bg: '#F1EFE8', color: '#444441' },
}

const T = {
  bg:      '#080810',
  card:    '#0f0f1a',
  surface: '#13131f',
  border:  'rgba(255,255,255,0.07)',
  borderHi:'rgba(255,255,255,0.14)',
  pink:    '#ff2d78',
  purple:  '#a259ff',
  text:    '#f0f0f8',
  muted:   '#6b6b85',
  faint:   '#1a1a2e',
  font:    "'DM Sans','Segoe UI',system-ui,sans-serif",
}

const EMPTY_FORM = { name: '', email: '', role: 'packer', password: '' }

export default function AdminStaff() {
  const [staff,    setStaff]    = useState([])
  const [loading,  setLoading]  = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form,     setForm]     = useState(EMPTY_FORM)
  const [saving,   setSaving]   = useState(false)
  const [error,    setError]    = useState('')
  const [success,  setSuccess]  = useState('')

  useEffect(() => { fetchStaff() }, [])

  async function fetchStaff() {
    try {
      const res = await adminApi.get('/staff')
      setStaff(res.data)
    } catch {
      setError('Failed to load staff')
    } finally {
      setLoading(false)
    }
  }

  async function handleInvite(e) {
    e.preventDefault()
    setSaving(true)
    setError('')
    setSuccess('')
    try {
      await adminApi.post('/staff', form)
      setShowForm(false)
      setForm(EMPTY_FORM)
      setSuccess(`${form.name} has been invited successfully.`)
      fetchStaff()
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to invite staff member')
    } finally {
      setSaving(false)
    }
  }

  async function toggleActive(member) {
    try {
      await adminApi.patch(`/staff/${member.id}`, { is_active: member.is_active ? 0 : 1 })
      fetchStaff()
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update')
    }
  }

  async function changeRole(member, role) {
    try {
      await adminApi.patch(`/staff/${member.id}`, { role })
      fetchStaff()
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update role')
    }
  }

  async function removeMember(member) {
    if (!window.confirm(`Remove ${member.name}? They will lose all access immediately.`)) return
    try {
      await adminApi.delete(`/staff/${member.id}`)
      fetchStaff()
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to remove staff member')
    }
  }

  // ── Styles ────────────────────────────────────────────────────
  const card = {
    background: T.card,
    border: `1px solid ${T.borderHi}`,
    borderRadius: 16,
    padding: '24px',
    marginBottom: 16,
  }

  const input = {
    width: '100%',
    padding: '10px 14px',
    background: T.surface,
    border: `1px solid ${T.border}`,
    borderRadius: 10,
    color: T.text,
    fontSize: 13,
    fontFamily: T.font,
    outline: 'none',
    boxSizing: 'border-box',
  }

  const btn = (variant = 'default') => ({
    padding: '8px 18px',
    borderRadius: 9,
    border: variant === 'primary'
      ? 'none'
      : variant === 'danger'
        ? `1px solid rgba(255,45,120,0.35)`
        : `1px solid ${T.border}`,
    background: variant === 'primary'
      ? `linear-gradient(135deg, ${T.pink}, ${T.purple})`
      : 'transparent',
    color: variant === 'primary'
      ? '#fff'
      : variant === 'danger'
        ? T.pink
        : T.muted,
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: T.font,
    transition: 'all 0.15s',
  })

  return (
    <div style={{ padding: '32px 24px', maxWidth: 900, margin: '0 auto', fontFamily: T.font, color: T.text }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 6px', color: T.text }}>Staff accounts</h1>
          <p style={{ fontSize: 13, color: T.muted, margin: 0 }}>
            Manage who has access and what they can do in the admin panel.
          </p>
        </div>
        <button
          onClick={() => { setShowForm(!showForm); setError(''); setSuccess('') }}
          style={btn('primary')}
        >
          {showForm ? '✕ Cancel' : '+ Invite staff'}
        </button>
      </div>

      {/* Feedback messages */}
      {error && (
        <div style={{ padding: '12px 16px', background: 'rgba(255,45,120,0.08)', border: '1px solid rgba(255,45,120,0.2)', borderRadius: 10, fontSize: 13, color: T.pink, marginBottom: 16 }}>
          {error}
        </div>
      )}
      {success && (
        <div style={{ padding: '12px 16px', background: 'rgba(184,255,60,0.07)', border: '1px solid rgba(184,255,60,0.2)', borderRadius: 10, fontSize: 13, color: '#b8ff3c', marginBottom: 16 }}>
          {success}
        </div>
      )}

      {/* Invite form */}
      {showForm && (
        <div style={card}>
          <p style={{ fontWeight: 700, fontSize: 14, margin: '0 0 18px', color: T.text }}>Invite new staff member</p>
          <form onSubmit={handleInvite}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
              <div>
                <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: T.muted, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6 }}>Full name</label>
                <input
                  style={input}
                  placeholder="e.g. Nimesha Silva"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  required
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: T.muted, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6 }}>Email address</label>
                <input
                  style={input}
                  type="email"
                  placeholder="e.g. nimesha@example.com"
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  required
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: T.muted, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6 }}>Role</label>
                <select
                  style={{ ...input }}
                  value={form.role}
                  onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
                >
                  {ROLES.map(r => (
                    <option key={r} value={r}>
                      {r.charAt(0).toUpperCase() + r.slice(1)} — {ROLE_DESC[r]}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: T.muted, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6 }}>Temporary password</label>
                <input
                  style={input}
                  type="password"
                  placeholder="They can change this later"
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  required
                />
              </div>
            </div>

            {/* Role preview */}
            <div style={{ padding: '10px 14px', background: T.surface, borderRadius: 9, marginBottom: 14, fontSize: 12, color: T.muted, border: `1px solid ${T.border}` }}>
              <span style={{ ...pillStyle(form.role), marginRight: 8 }}>
                {form.role}
              </span>
              {ROLE_DESC[form.role]}
            </div>

            <button type="submit" disabled={saving} style={btn('primary')}>
              {saving ? 'Inviting...' : 'Send invite'}
            </button>
          </form>
        </div>
      )}

      {/* Staff list */}
      <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 24, color: T.muted, fontSize: 13 }}>Loading...</div>
        ) : staff.length === 0 ? (
          <div style={{ padding: 24, color: T.muted, fontSize: 13 }}>No staff members yet.</div>
        ) : (
          staff.map((member, i) => (
            <div
              key={member.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                padding: '16px 20px',
                borderBottom: i < staff.length - 1 ? `1px solid ${T.border}` : 'none',
              }}
            >
              {/* Avatar */}
              <div style={{
                width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
                background: ROLE_COLOR[member.role]?.bg || '#F1EFE8',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 700, fontSize: 15,
                color: ROLE_COLOR[member.role]?.color || '#444',
              }}>
                {member.name?.charAt(0).toUpperCase()}
              </div>

              {/* Name + email */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, fontWeight: 600, fontSize: 13, color: T.text }}>{member.name}</p>
                <p style={{ margin: 0, fontSize: 11, color: T.muted }}>{member.email}</p>
              </div>

              {/* Role selector (or locked badge for owner) */}
              {member.role === 'owner' ? (
                <span style={pillStyle('owner')}>Owner</span>
              ) : (
                <select
                  value={member.role}
                  onChange={e => changeRole(member, e.target.value)}
                  style={{
                    fontSize: 11, padding: '4px 8px', borderRadius: 6,
                    border: `1px solid ${T.border}`,
                    background: ROLE_COLOR[member.role]?.bg || T.surface,
                    color: ROLE_COLOR[member.role]?.color || T.text,
                    cursor: 'pointer', fontFamily: T.font,
                  }}
                >
                  {ROLES.map(r => (
                    <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
                  ))}
                </select>
              )}

              {/* Active badge */}
              <span style={{
                fontSize: 10, padding: '3px 10px', borderRadius: 20, fontWeight: 700,
                background: member.is_active ? 'rgba(184,255,60,0.08)' : T.faint,
                color: member.is_active ? '#b8ff3c' : T.muted,
                border: member.is_active ? '1px solid rgba(184,255,60,0.2)' : `1px solid ${T.border}`,
              }}>
                {member.is_active ? 'Active' : 'Inactive'}
              </span>

              {/* Actions */}
              {member.role !== 'owner' && (
                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                  <button onClick={() => toggleActive(member)} style={btn()}>
                    {member.is_active ? 'Deactivate' : 'Activate'}
                  </button>
                  <button onClick={() => removeMember(member)} style={btn('danger')}>
                    Remove
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Role reference table */}
      <div style={card}>
        <p style={{ fontWeight: 700, fontSize: 13, margin: '0 0 14px', color: T.text }}>Role permissions reference</p>
        {['owner', 'manager', 'finance', 'packer', 'viewer'].map(role => (
          <div key={role} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '7px 0', borderBottom: `1px solid ${T.border}` }}>
            <span style={{ ...pillStyle(role), minWidth: 70, textAlign: 'center' }}>
              {role}
            </span>
            <span style={{ fontSize: 12, color: T.muted }}>{ROLE_DESC[role]}</span>
          </div>
        ))}
      </div>

    </div>
  )
}

function pillStyle(role) {
  const c = ROLE_COLOR[role] || { bg: '#F1EFE8', color: '#444' }
  return {
    display: 'inline-block',
    fontSize: 10,
    fontWeight: 700,
    padding: '3px 10px',
    borderRadius: 20,
    background: c.bg,
    color: c.color,
    letterSpacing: '0.04em',
  }
}