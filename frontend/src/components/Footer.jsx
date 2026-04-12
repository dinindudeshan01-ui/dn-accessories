import { Link } from 'react-router-dom'

export default function Footer() {
  return (
    <footer style={{ background: 'white', borderTop: '1px solid #fce7f3', padding: '64px 24px 32px' }}>
      <div style={{ maxWidth: 1280, margin: '0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>

        <div style={{ fontFamily: 'var(--serif)', fontSize: 30, fontWeight: 900, marginBottom: 28 }}>
          D&amp;N <span style={{ color: '#ec4899' }}>ACCESSORIES</span>
        </div>

        {/* Socials */}
        <div style={{ display: 'flex', gap: 24, marginBottom: 40 }}>
          {['Instagram','TikTok','YouTube'].map(s => (
            <a key={s} href="#" aria-label={s} style={{ color: '#a8a29e' }}>{s[0]}</a>
          ))}
        </div>

        {/* Links */}
        <div style={{ display: 'flex', gap: 40, flexWrap: 'wrap', justifyContent: 'center', marginBottom: 48 }}>
          {[['/', 'Search'], ['/refund', 'Refund Policy'], ['/contact', 'Contact'], ['/', 'Terms of Service']].map(([to, label]) => (
            <Link key={label} to={to} style={{
              fontSize: 10, fontWeight: 900, letterSpacing: '2.5px',
              textTransform: 'uppercase', color: '#a8a29e'
            }}>{label}</Link>
          ))}
        </div>

        {/* Payment placeholders */}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 20 }}>
          {[1,2,3,4,5].map(i => (
            <div key={i} style={{ width: 44, height: 28, background: '#f5f5f4', borderRadius: 4, border: '1px solid #e7e5e4' }} />
          ))}
        </div>

        <p style={{ fontSize: 10, color: '#a8a29e', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase' }}>
          © {new Date().getFullYear()}, D&amp;N Accessories. All rights reserved.
        </p>
      </div>
    </footer>
  )
}