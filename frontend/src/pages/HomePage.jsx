import { Link } from 'react-router-dom'

const collections = [
  { title: 'CHARMED Beaded Bracelets', sub: '1pc collections', img: 'https://images.unsplash.com/photo-1611591437281-460bfbe1220a?auto=format&fit=crop&q=80&w=800' },
  { title: 'PLAIN Beaded Bracelets',   sub: '1pc collections', img: 'https://images.unsplash.com/photo-1573408301185-9146fc115661?auto=format&fit=crop&q=80&w=800' },
  { title: 'Signature Charm Bracelets',sub: 'Size 7 inch',     img: 'https://images.unsplash.com/photo-1602751584552-8ba73aad10e1?auto=format&fit=crop&q=80&w=800' },
  { title: 'Charm Bangles',            sub: '1pc collections', img: 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?auto=format&fit=crop&q=80&w=800' },
]

export default function HomePage() {
  return (
    <div>

      {/* HERO */}
      <section style={{
        position: 'relative', height: '85vh', minHeight: 520,
        overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer'
      }}>
        <img
          src="https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?auto=format&fit=crop&q=90&w=2000"
          alt="Hero"
          style={{ position: 'absolute', inset: 0, height: '100%', width: '100%', objectFit: 'cover' }}
        />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.55) 0%, transparent 50%, rgba(0,0,0,0.2) 100%)' }} />
        <div style={{ position: 'relative', zIndex: 2, textAlign: 'center', padding: '0 24px', maxWidth: 760 }}>
          <h2 style={{
            fontFamily: 'var(--serif)', fontSize: 'clamp(36px,6vw,76px)',
            color: 'white', fontWeight: 900, lineHeight: 1.1,
            textShadow: '0 4px 30px rgba(0,0,0,0.3)', marginBottom: 28
          }}>
            Elevate Your Style With <span style={{ color: '#f9a8d4' }}>D&amp;N</span>
          </h2>
          <Link to="/catalog" style={{
            display: 'inline-block',
            background: '#ec4899', color: 'white',
            padding: '16px 48px', fontSize: 12, fontWeight: 900,
            letterSpacing: '3px', textTransform: 'uppercase',
            boxShadow: '0 8px 40px rgba(236,72,153,0.5)',
            border: '2px solid transparent',
            transition: 'all 0.3s'
          }}>
            Shop The Collection
          </Link>
        </div>
      </section>

      {/* COLLECTIONS */}
      <section style={{ padding: '80px 24px', maxWidth: 1280, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <h3 style={{ fontFamily: 'var(--serif)', fontSize: 32, fontStyle: 'italic' }}>Shop our:</h3>
          <div style={{ height: 3, width: 64, background: 'linear-gradient(90deg,#ec4899,#d4a853)', borderRadius: 2, margin: '10px auto 0' }} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 28 }} className="collections-grid">
          {collections.map(col => (
            <Link to="/catalog" key={col.title} style={{ cursor: 'pointer', textDecoration: 'none' }}>
              <div style={{
                aspectRatio: '4/5', overflow: 'hidden', borderRadius: 20,
                border: '1px solid #fce7f3', marginBottom: 16,
                boxShadow: '0 4px 20px rgba(244,114,182,0.1)'
              }}>
                <img src={col.img} alt={col.title} style={{ height: '100%', objectFit: 'cover', transition: 'transform 0.7s ease' }} />
              </div>
              <h4 style={{ textAlign: 'center', fontSize: 11, fontWeight: 900, letterSpacing: '2px', textTransform: 'uppercase' }}>{col.title}</h4>
              <p style={{ textAlign: 'center', fontSize: 11, fontWeight: 600, color: '#a8a29e', marginTop: 6 }}>{col.sub}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* FEATURED PRODUCT */}
      <section style={{ background: 'linear-gradient(135deg,#fff5f8 0%,#fffbeb 100%)', padding: '80px 24px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 64, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, position: 'relative', minWidth: 280 }}>
            <div style={{ position: 'absolute', inset: -16, background: 'rgba(252,207,232,0.4)', borderRadius: 20, transform: 'rotate(-3deg)' }} />
            <span style={{
              position: 'absolute', top: 20, left: 20, zIndex: 2,
              background: '#ec4899', color: 'white',
              fontSize: 10, fontWeight: 900, letterSpacing: '2px',
              textTransform: 'uppercase', padding: '8px 18px', borderRadius: 999,
              boxShadow: '0 4px 20px rgba(236,72,153,0.4)'
            }}>Sold Out</span>
            <img
              src="https://images.unsplash.com/photo-1589255263229-37fc680e66e3?auto=format&fit=crop&q=80&w=800"
              alt="Premium Crafting String"
              style={{ position: 'relative', borderRadius: 16, boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }}
            />
          </div>
          <div style={{ flex: 1, minWidth: 280 }}>
            <h3 style={{ fontFamily: 'var(--serif)', fontSize: 36, fontWeight: 900, marginBottom: 16 }}>Premium Crafting String (0.8mm)</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
              <span style={{ textDecoration: 'line-through', fontSize: 18, color: '#a8a29e', fontWeight: 600 }}>$10.00 USD</span>
              <span style={{ fontSize: 28, fontWeight: 900, color: '#ec4899' }}>$8.00 USD</span>
            </div>
            <p style={{ color: '#57534e', lineHeight: 1.75, fontStyle: 'italic', marginBottom: 32, fontSize: 15 }}>
              The foundation of every "D&amp;N" masterpiece. High-quality stretch string perfect for your custom beaded creations. Durable, clear, and professional grade.
            </p>
            <button style={{
              background: '#e7e5e4', color: '#a8a29e',
              padding: '16px 48px', fontSize: 11, fontWeight: 900,
              letterSpacing: '2px', textTransform: 'uppercase', borderRadius: 999, cursor: 'not-allowed'
            }}>Currently Out of Stock</button>
          </div>
        </div>
      </section>

      {/* VIDEO SECTION */}
      <section style={{ padding: '80px 24px', maxWidth: 860, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 10 }}>
          <h3 style={{ fontFamily: 'var(--serif)', fontSize: 32, fontStyle: 'italic' }}>Stretch Test.</h3>
        </div>
        <p style={{ textAlign: 'center', fontSize: 10, fontWeight: 900, letterSpacing: '3px', textTransform: 'uppercase', color: '#ec4899', marginBottom: 32 }}>Quality that lasts</p>
        <div style={{
          aspectRatio: '16/9', position: 'relative', borderRadius: 24, overflow: 'hidden',
          boxShadow: '0 24px 60px rgba(0,0,0,0.15)', border: '4px solid #fce7f3', cursor: 'pointer'
        }}>
          <img
            src="https://images.unsplash.com/photo-1611591437281-460bfbe1220a?auto=format&fit=crop&q=80&w=1200"
            alt="Video"
            style={{ height: '100%', width: '100%', objectFit: 'cover', opacity: 0.6 }}
          />
          <div style={{
            position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
            width: 88, height: 88, background: '#ec4899', borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 8px 40px rgba(236,72,153,0.5)'
          }}>
            <svg width="30" height="30" viewBox="0 0 24 24" fill="white"><polygon points="5,3 19,12 5,21"/></svg>
          </div>
        </div>
      </section>

      {/* ABOUT / CEO */}
      <section style={{ padding: '80px 24px', background: 'white' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 64, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, position: 'relative', minWidth: 280 }}>
            <div style={{
              position: 'absolute', top: -32, left: -32, width: 120, height: 120,
              background: '#fce7f3', borderRadius: '50%', zIndex: 0,
              animation: 'pulse 3s ease-in-out infinite'
            }} />
            <img
              src="https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&q=80&w=800"
              alt="Founder"
              style={{ position: 'relative', zIndex: 1, aspectRatio: '4/5', objectFit: 'cover', borderRadius: 24, boxShadow: '0 20px 60px rgba(0,0,0,0.12)', borderBottom: '6px solid #ec4899' }}
            />
          </div>
          <div style={{ flex: 1, minWidth: 280 }}>
            <h3 style={{ fontFamily: 'var(--serif)', fontSize: 38, fontWeight: 900, marginBottom: 24 }}>
              About <span style={{ color: '#ec4899' }}>D&amp;N Accessories</span>
            </h3>
            <blockquote style={{ color: '#57534e', fontStyle: 'italic', lineHeight: 1.8, fontSize: 16, marginBottom: 32 }}>
              "Welcome to D&amp;N Accessories. We are dedicated to providing meticulously crafted pieces that add a touch of timeless elegance to any occasion."
            </blockquote>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ height: 2, width: 36, background: 'linear-gradient(90deg,#ec4899,#d4a853)' }} />
              <p style={{ fontSize: 20, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.5px' }}>
                Meet the <span style={{ color: '#ec4899', textDecoration: 'underline' }}>GOAT</span>
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* VENDOR BANNER */}
      <section style={{
        background: 'linear-gradient(135deg,#ec4899 0%,#be185d 100%)',
        color: 'white', padding: '80px 24px', textAlign: 'center', position: 'relative', overflow: 'hidden'
      }}>
        <h3 style={{ fontFamily: 'var(--serif)', fontSize: 'clamp(28px,4vw,42px)', fontWeight: 900, marginBottom: 16, position: 'relative' }}>
          Are you in need of a bead vendor?
        </h3>
        <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: 16, maxWidth: 600, margin: '0 auto 40px', position: 'relative' }}>
          Interested in the premium materials behind our signature collections? Shop with our trusted suppliers.
        </p>
        <a href="#" style={{
          background: 'white', color: '#ec4899',
          padding: '18px 52px', fontSize: 11, fontWeight: 900,
          letterSpacing: '3px', textTransform: 'uppercase',
          display: 'inline-flex', alignItems: 'center', gap: 12,
          boxShadow: '0 8px 40px rgba(0,0,0,0.2)'
        }}>
          Shop My Vendor
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
          </svg>
        </a>
      </section>

      {/* NEWSLETTER */}
      <section style={{ padding: '80px 24px', background: '#f5f5f4', textAlign: 'center' }}>
        <h3 style={{ fontFamily: 'var(--serif)', fontSize: 32, fontWeight: 900, fontStyle: 'italic', marginBottom: 10 }}>Join Our Mailing List</h3>
        <p style={{ color: '#57534e', fontSize: 11, fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', marginBottom: 36 }}>
          Early access to new collections &amp; exclusive privileges.
        </p>
        <div style={{ maxWidth: 560, margin: '0 auto', display: 'flex', gap: 12 }}>
          <input
            type="email"
            placeholder="Enter your email address"
            style={{
              flex: 1, padding: '16px 24px', border: '2px solid #e7e5e4',
              background: 'white', fontFamily: 'var(--sans)', fontSize: 14,
              fontWeight: 500, outline: 'none'
            }}
          />
          <button style={{
            padding: '16px 36px', background: '#ec4899', color: 'white',
            fontSize: 11, fontWeight: 900, letterSpacing: '2px', textTransform: 'uppercase',
            whiteSpace: 'nowrap'
          }}>Subscribe</button>
        </div>
      </section>

    </div>
  )
}