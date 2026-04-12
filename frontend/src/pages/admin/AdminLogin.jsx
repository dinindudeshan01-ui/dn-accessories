// src/pages/admin/AdminLogin.jsx

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAdmin } from '../../context/AdminContext'
import adminApi from '../../lib/adminApi'

const T = {
  bg: '#080810', card: '#0f0f1a', surface: '#13131f',
  border: 'rgba(255,255,255,0.07)', borderHi: 'rgba(255,255,255,0.14)',
  pink: '#ff2d78', lime: '#b8ff3c', purple: '#a259ff',
  text: '#f0f0f8', muted: '#6b6b85', faint: '#1a1a2e',
  font: "'DM Sans','Segoe UI',system-ui,sans-serif",
}

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;700;900&display=swap');
  * { box-sizing:border-box; margin:0; padding:0; }
  body { background:${T.bg}; }
  @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-12px)} }
  @keyframes spin  { to{transform:rotate(360deg)} }
  @keyframes fadein { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
  .dn-login-card { animation: fadein 0.5s ease both; }
  .dn-input:focus { outline:none; border-color:${T.pink} !important; box-shadow:0 0 0 3px rgba(255,45,120,.15); }
  .dn-submit:hover:not(:disabled) { filter:brightness(1.12); transform:translateY(-1px); }
  .dn-submit:active { transform:scale(.98); }
`

function inject() {
  if (document.getElementById('dn-login-css')) return
  const s = document.createElement('style')
  s.id = 'dn-login-css'
  s.textContent = CSS
  document.head.appendChild(s)
}

export default function AdminLogin() {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)
  const { login } = useAdmin()
  const navigate  = useNavigate()

  useEffect(() => { inject() }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await adminApi.post('/auth/login', { email, password })
      login(res.data.token, res.data.admin)
      navigate('/admin')
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed')
    } finally { setLoading(false) }
  }

  return (
    <div style={{
      minHeight: '100vh', background: T.bg,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: T.font, padding: 24, position: 'relative', overflow: 'hidden',
    }}>

      {/* Ambient blobs */}
      <div style={{ position:'absolute', width:500, height:500, borderRadius:'50%', background:'radial-gradient(circle, rgba(255,45,120,0.08) 0%, transparent 70%)', top:-100, left:-100, pointerEvents:'none' }} />
      <div style={{ position:'absolute', width:400, height:400, borderRadius:'50%', background:'radial-gradient(circle, rgba(162,89,255,0.07) 0%, transparent 70%)', bottom:-80, right:-80, pointerEvents:'none' }} />

      <div className="dn-login-card" style={{ width:'100%', maxWidth:380 }}>

        {/* Logo mark */}
        <div style={{ textAlign:'center', marginBottom:36 }}>
          <div style={{
            display:'inline-flex', alignItems:'center', justifyContent:'center',
            width:56, height:56, borderRadius:16,
            background:`linear-gradient(135deg, ${T.pink}, ${T.purple})`,
            boxShadow:`0 0 40px rgba(255,45,120,0.35)`,
            fontSize:24, fontWeight:900, color:'#fff',
            marginBottom:14,
          }}>
            D
          </div>
          <div style={{ fontSize:22, fontWeight:900, color:T.text, letterSpacing:'-0.02em' }}>
            D<span style={{ color:T.pink }}>&</span>N <span style={{ color:T.muted, fontWeight:500 }}>Admin</span>
          </div>
          <div style={{ fontSize:11, color:T.muted, marginTop:4, letterSpacing:'0.1em', textTransform:'uppercase' }}>
            Accessories Management
          </div>
        </div>

        {/* Card */}
        <div style={{
          background:T.card,
          border:`1px solid ${T.borderHi}`,
          borderRadius:20, padding:32,
          boxShadow:`0 24px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,45,120,0.05)`,
        }}>

          <form onSubmit={handleSubmit} style={{ display:'flex', flexDirection:'column', gap:18 }}>
            <div>
              <label style={{ display:'block', fontSize:10, fontWeight:700, color:T.muted, letterSpacing:'0.12em', textTransform:'uppercase', marginBottom:7 }}>
                Email Address
              </label>
              <input
                className="dn-input"
                type="email" value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="admin@dncessories.com"
                required
                style={{ width:'100%', padding:'11px 14px', background:T.surface, border:`1px solid ${T.border}`, borderRadius:11, color:T.text, fontSize:14, fontFamily:T.font, transition:'border-color .15s, box-shadow .15s' }}
              />
            </div>

            <div>
              <label style={{ display:'block', fontSize:10, fontWeight:700, color:T.muted, letterSpacing:'0.12em', textTransform:'uppercase', marginBottom:7 }}>
                Password
              </label>
              <input
                className="dn-input"
                type="password" value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                style={{ width:'100%', padding:'11px 14px', background:T.surface, border:`1px solid ${T.border}`, borderRadius:11, color:T.text, fontSize:14, fontFamily:T.font, transition:'border-color .15s, box-shadow .15s' }}
              />
            </div>

            {error && (
              <div style={{ padding:'10px 14px', background:'rgba(255,45,120,0.08)', border:'1px solid rgba(255,45,120,0.2)', borderRadius:10, fontSize:13, color:T.pink }}>
                {error}
              </div>
            )}

            <button
              className="dn-submit"
              type="submit"
              disabled={loading}
              style={{
                marginTop:4, padding:'13px',
                background:`linear-gradient(135deg, ${T.pink}, ${T.purple})`,
                color:'#fff', border:'none', borderRadius:11,
                fontSize:13, fontWeight:900, letterSpacing:'0.06em',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1,
                transition:'all 0.2s', fontFamily:T.font,
                boxShadow:`0 0 24px rgba(255,45,120,0.3)`,
              }}
            >
              {loading ? 'Signing in...' : 'Sign In →'}
            </button>
          </form>
        </div>

        <p style={{ textAlign:'center', marginTop:20, fontSize:11, color:T.faint }}>
          D&N Accessories · Admin Panel v3.0
        </p>
      </div>
    </div>
  )
}