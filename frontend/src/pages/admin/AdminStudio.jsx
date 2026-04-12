// src/pages/admin/AdminStudio.jsx
// NOTE: AdminStudio keeps its own internal layout (split panel) — no PageContent wrapper needed

import { useState, useEffect } from 'react'
import adminApi from '../../lib/adminApi'
import { PageHeader, Btn, Input, Toggle, Spinner, tokens as T } from '../../components/admin/AdminUI'

const SECTION_TOGGLES = [
  { key:'showHero',       label:'Hero Banner'      },
  { key:'showFeatured',   label:'Featured Products' },
  { key:'showMarquee',    label:'Marquee Banner'   },
  { key:'showVideo',      label:'Video Section'    },
  { key:'showAbout',      label:'About / CEO'      },
  { key:'showVendor',     label:'Vendor Banner'    },
  { key:'showNewsletter', label:'Newsletter'       },
]

export default function AdminStudio() {
  const [theme, setTheme]       = useState(null)
  const [draft, setDraft]       = useState(null)
  const [loading, setLoading]   = useState(true)
  const [saving, setSaving]     = useState(false)
  const [saved, setSaved]       = useState(false)
  const [products, setProducts] = useState([])

  useEffect(() => {
    Promise.all([adminApi.get('/theme'), adminApi.get('/products')]).then(([t,p]) => {
      setTheme(t.data); setDraft(t.data); setProducts(p.data.slice(0,3))
    }).finally(() => setLoading(false))
  }, [])

  function update(key, value) { setDraft(d => ({...d, [key]:value})) }

  async function publish() {
    setSaving(true)
    try {
      const res = await adminApi.post('/theme', draft)
      setTheme(res.data); setDraft(res.data)
      setSaved(true); setTimeout(() => setSaved(false), 2500)
    } finally { setSaving(false) }
  }

  const hasChanges = JSON.stringify(draft) !== JSON.stringify(theme)

  if (loading || !draft) return <Spinner />

  return (
    <>
      <PageHeader
        title="Studio"
        subtitle="Customize your storefront live"
        action={
          <div style={{ display:'flex', gap:8 }}>
            {hasChanges && <Btn variant="ghost" onClick={() => setDraft(theme)}>Reset</Btn>}
            <Btn onClick={publish} disabled={saving || !hasChanges}
              style={{ minWidth:140, background: saved ? T.lime : undefined, color: saved ? '#000' : undefined }}>
              {saved ? '✓ Published!' : saving ? 'Publishing...' : 'Publish Changes'}
            </Btn>
          </div>
        }
      />

      <div style={{ display:'flex', height:'calc(100vh - 64px)', overflow:'hidden' }}>

        {/* Controls panel */}
        <div style={{ width:290, minWidth:290, overflowY:'auto', background:T.sidebar || '#0a0a14', borderRight:`1px solid ${T.border}`, padding:'16px 0' }}>

          <CtrlSection label="Brand Colors">
            <CtrlRow label="Accent Color" sublabel="Buttons, prices, highlights">
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <input type="color" value={draft.accentColor} onChange={e => update('accentColor', e.target.value)}
                  style={{ width:38, height:32, border:`1px solid ${T.border}`, borderRadius:7, cursor:'pointer', background:'none', padding:2 }} />
                <span style={{ fontSize:11, color:T.muted, fontFamily:'monospace' }}>{draft.accentColor}</span>
              </div>
            </CtrlRow>
          </CtrlSection>

          <CtrlSection label="Logo & Navigation">
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              <StudioInput label="Logo Text"  value={draft.logoText}  onChange={v => update('logoText', v)} />
              <StudioInput label="Nav Link 1" value={draft.navLink1}  onChange={v => update('navLink1', v)} />
              <StudioInput label="Nav Link 2" value={draft.navLink2}  onChange={v => update('navLink2', v)} />
              <StudioInput label="Nav Link 3" value={draft.navLink3}  onChange={v => update('navLink3', v)} />
              <StudioInput label="Nav Link 4" value={draft.navLink4}  onChange={v => update('navLink4', v)} />
            </div>
          </CtrlSection>

          <CtrlSection label="Marquee Banner">
            <StudioInput label="Marquee Text" value={draft.marqueeText} onChange={v => update('marqueeText', v)} />
          </CtrlSection>

          <CtrlSection label="Hero Section">
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              <StudioInput label="Headline"     value={draft.heroHeadline} onChange={v => update('heroHeadline', v)} />
              <StudioInput label="Subtext"      value={draft.heroSubtext}  onChange={v => update('heroSubtext', v)} />
              <StudioInput label="CTA Text"     value={draft.heroCtaText}  onChange={v => update('heroCtaText', v)} />
              <StudioInput label="Hero Image"   value={draft.heroImage}    onChange={v => update('heroImage', v)} />
            </div>
          </CtrlSection>

          <CtrlSection label="Section Visibility">
            {SECTION_TOGGLES.map(({ key, label }) => (
              <div key={key} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'8px 0', borderBottom:`1px solid ${T.border}` }}>
                <span style={{ fontSize:13, color:T.muted }}>{label}</span>
                <Toggle checked={draft[key] === 'true'} onChange={v => update(key, String(v))} />
              </div>
            ))}
          </CtrlSection>
        </div>

        {/* Preview panel */}
        <div style={{ flex:1, overflow:'auto', background:T.bg, padding:24 }}>
          <div style={{ fontSize:10, fontWeight:700, letterSpacing:'0.15em', color:T.muted, textTransform:'uppercase', marginBottom:12 }}>
            Live Preview
          </div>
          <div style={{ background:'white', borderRadius:14, overflow:'hidden', border:`1px solid ${T.border}`, maxWidth:900, margin:'0 auto', boxShadow:'0 32px 80px rgba(0,0,0,0.5)' }}>

            {/* Browser chrome */}
            <div style={{ background:'#1a1a1a', padding:'10px 16px', display:'flex', alignItems:'center', gap:8 }}>
              {['#ef4444','#f59e0b','#22c55e'].map((c,i) => <div key={i} style={{ width:10, height:10, borderRadius:'50%', background:c }} />)}
              <div style={{ flex:1, background:'#2a2a2a', borderRadius:5, padding:'4px 12px', fontSize:11, color:'#555', marginLeft:8 }}>dncessories.com</div>
            </div>

            {/* Marquee */}
            {draft.showMarquee === 'true' && (
              <div style={{ background:draft.accentColor, color:'white', padding:'7px 0', textAlign:'center' }}>
                <span style={{ fontSize:10, fontWeight:700, letterSpacing:'2px' }}>{draft.marqueeText}</span>
              </div>
            )}

            {/* Navbar */}
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 28px', borderBottom:'1px solid #fce7f3', background:'white' }}>
              <div style={{ display:'flex', gap:20, fontSize:12, color:'#57534e', fontWeight:600 }}>
                {[draft.navLink1, draft.navLink2, draft.navLink3, draft.navLink4].map((l,i) => (
                  <span key={i} style={{ color: i===0 ? draft.accentColor : '#57534e' }}>{l}</span>
                ))}
              </div>
              <div style={{ fontSize:16, fontWeight:900, letterSpacing:'0.15em', fontFamily:'Georgia,serif' }}>
                {draft.logoText?.split('ACCESSORIES')[0]}<span style={{ color:draft.accentColor }}>ACCESSORIES</span>
              </div>
              <div style={{ display:'flex', gap:12, fontSize:11, color:'#57534e' }}>
                <span>Instagram</span><span>TikTok</span><span>🛒</span>
              </div>
            </div>

            {/* Hero */}
            {draft.showHero === 'true' && (
              <div style={{ position:'relative', height:260, overflow:'hidden', display:'flex', alignItems:'center', justifyContent:'center' }}>
                <img src={draft.heroImage} alt="hero" style={{ position:'absolute', inset:0, width:'100%', height:'100%', objectFit:'cover' }} onError={e => { e.target.style.display='none' }} />
                <div style={{ position:'absolute', inset:0, background:'linear-gradient(to top, rgba(0,0,0,0.6), rgba(0,0,0,0.15))' }} />
                <div style={{ position:'relative', zIndex:2, textAlign:'center', padding:'0 24px' }}>
                  <h2 style={{ fontSize:26, fontWeight:900, color:'white', fontFamily:'Georgia,serif', marginBottom:8 }}>{draft.heroHeadline}</h2>
                  <p style={{ fontSize:12, color:'rgba(255,255,255,0.7)', marginBottom:16 }}>{draft.heroSubtext}</p>
                  <button style={{ background:draft.accentColor, color:'white', padding:'10px 28px', fontSize:10, fontWeight:900, letterSpacing:'2px', border:'none', cursor:'pointer', borderRadius:2 }}>
                    {draft.heroCtaText?.toUpperCase()}
                  </button>
                </div>
              </div>
            )}

            {/* Products */}
            {draft.showFeatured === 'true' && (
              <div style={{ padding:'28px 28px 24px', background:'white' }}>
                <h3 style={{ fontFamily:'Georgia,serif', fontSize:18, textAlign:'center', marginBottom:20, fontStyle:'italic' }}>Shop our:</h3>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:14 }}>
                  {(products.length > 0 ? products : Array(3).fill({ name:'Product', price:12, image_url:'', category:'charmed' })).map((p,i) => (
                    <div key={i} style={{ borderRadius:12, overflow:'hidden', border:'1px solid #fce7f3' }}>
                      <div style={{ height:110, background:'#f5f5f4', overflow:'hidden' }}>
                        {p.image_url && <img src={p.image_url} alt={p.name} style={{ width:'100%', height:'100%', objectFit:'cover' }} />}
                      </div>
                      <div style={{ padding:'10px 12px' }}>
                        <div style={{ fontSize:10, color:'#a8a29e', fontWeight:700, letterSpacing:'1px', textTransform:'uppercase' }}>{p.category}</div>
                        <div style={{ fontSize:13, fontFamily:'Georgia,serif', fontWeight:700, marginTop:2 }}>{p.name}</div>
                        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:8 }}>
                          <span style={{ fontSize:14, fontWeight:900, color:draft.accentColor }}>${Number(p.price).toFixed(2)}</span>
                          <button style={{ background:draft.accentColor, color:'white', fontSize:9, fontWeight:900, padding:'5px 10px', border:'none', borderRadius:999, cursor:'pointer', letterSpacing:'1px' }}>
                            ADD
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Section visibility pills */}
            <div style={{ padding:'14px 28px', background:'#f9f9f9', borderTop:'1px solid #f0f0f0' }}>
              <div style={{ fontSize:10, color:'#a8a29e', fontWeight:600, letterSpacing:'1px', textTransform:'uppercase', marginBottom:8 }}>Sections</div>
              <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                {SECTION_TOGGLES.map(({ key, label }) => (
                  <span key={key} style={{
                    fontSize:10, padding:'3px 9px', borderRadius:20, fontWeight:600,
                    background: draft[key]==='true' ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
                    color: draft[key]==='true' ? '#16a34a' : '#dc2626',
                  }}>
                    {draft[key]==='true' ? '✓' : '✕'} {label}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {hasChanges && (
            <div style={{ textAlign:'center', marginTop:16, fontSize:12, color:T.gold, fontWeight:500 }}>
              Unpublished changes — click Publish to apply to your live store.
            </div>
          )}
        </div>
      </div>
    </>
  )
}

function CtrlSection({ label, children }) {
  return (
    <div style={{ padding:'0 16px 16px', borderBottom:`1px solid ${T.border}`, marginBottom:4 }}>
      <div style={{ fontSize:9, fontWeight:700, letterSpacing:'0.18em', color:T.muted, textTransform:'uppercase', padding:'14px 0 10px' }}>{label}</div>
      {children}
    </div>
  )
}

function CtrlRow({ label, sublabel, children }) {
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:12 }}>
      <div>
        <div style={{ fontSize:12, color:T.muted }}>{label}</div>
        {sublabel && <div style={{ fontSize:10, color:T.muted, marginTop:2 }}>{sublabel}</div>}
      </div>
      {children}
    </div>
  )
}

function StudioInput({ label, value, onChange }) {
  return (
    <div>
      <div style={{ fontSize:10, fontWeight:600, color:T.muted, letterSpacing:'0.08em', textTransform:'uppercase', marginBottom:4 }}>{label}</div>
      <input
        value={value} onChange={e => onChange(e.target.value)}
        className="dn-input"
        style={{ width:'100%', padding:'7px 10px', background:'#13131f', border:`1px solid ${T.border}`, borderRadius:7, color:T.text, fontSize:12, outline:'none', fontFamily:'inherit', boxSizing:'border-box' }}
      />
    </div>
  )
}