import { useState, useEffect, useRef } from 'react'
import { useCart } from '../context/CartContext'
import { useNavigate } from 'react-router-dom'
import api from '../lib/api'

// ── BANK DETAILS ──────────────────────────────────────────────────────────────
const ACCOUNTS = [
  {
    id: 'boc',
    bank: 'Bank of Ceylon (BOC)',
    branch: 'Maskeliya',
    account: '91941472',
    name: 'D.M.N.SEWWANDI DISSANAYAKE',
    color: '#FFD700'
  },
  {
    id: 'peoples',
    bank: "People's Bank",
    branch: 'Maskeliya',
    account: '178200180030904',
    name: 'D.M.N.Sewwandi',
    color: '#ed1c24'
  }
]

const STEPS = ['Your Details', 'Payment', 'Done']

export default function CheckoutPage() {
  const { cart, totalPrice, clearCart } = useCart()
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [order, setOrder] = useState(null)

  useEffect(() => {
    if (cart && cart.length === 0 && step < 2) navigate('/catalog')
  }, [cart, step, navigate])

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [step])

  if (!cart) return null

  return (
    <div style={{ minHeight: '100vh', background: '#fdf9f7', fontFamily: 'var(--sans, system-ui)' }}>
      {step < 2 && (
        <div style={{ borderBottom: '1px solid #fce7f3', background: 'white', padding: '20px 24px' }}>
          <div style={{ maxWidth: 720, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontFamily: 'var(--serif)', fontSize: 22, fontWeight: 900, fontStyle: 'italic', color: '#1c1917' }}>
              D&N ACCESSORIES
            </span>
            <StepIndicator current={step} />
          </div>
        </div>
      )}

      <div style={{ maxWidth: 720, margin: '0 auto', padding: '40px 24px' }}>
        {step === 0 && <KYCStep onNext={() => setStep(1)} items={cart} total={totalPrice} />}
        {step === 1 && <PaymentStep items={cart} total={totalPrice} onSuccess={(o) => { setOrder(o); clearCart(); setStep(2) }} />}
        {step === 2 && <SuccessStep order={order} onShopMore={() => navigate('/catalog')} />}
      </div>
    </div>
  )
}

// ── Step Indicator ────────────────────────────────────────────────────────────
function StepIndicator({ current }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
      {STEPS.map((label, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            <div style={{
              width: 28, height: 28, borderRadius: '50%',
              background: i < current ? '#16a34a' : i === current ? '#ec4899' : '#e7e5e4',
              color: i <= current ? 'white' : '#a8a29e',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, fontWeight: 900, transition: 'all 0.4s',
            }}>
              {i < current ? '✓' : i + 1}
            </div>
            <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: i === current ? '#ec4899' : '#a8a29e' }}>
              {label}
            </span>
          </div>
          {i < STEPS.length - 1 && (
            <div style={{ width: 40, height: 2, background: i < current ? '#16a34a' : '#e7e5e4', marginBottom: 18, transition: 'all 0.4s' }} />
          )}
        </div>
      ))}
    </div>
  )
}

// ── KYC Step ──────────────────────────────────────────────────────────────────
function KYCStep({ onNext, items, total }) {
  const [form, setForm] = useState({ full_name: '', nic: '', phone1: '', phone2: '', address: '', city: '' })
  const [errors, setErrors] = useState({})

  function validate() {
    const e = {}
    if (!form.full_name.trim()) e.full_name = 'Required'
    if (!form.nic.trim()) e.nic = 'Required'
    if (!form.phone1.trim()) e.phone1 = 'Required'
    if (!form.address.trim()) e.address = 'Required'
    return e
  }

  function handleNext() {
    const e = validate()
    if (Object.keys(e).length > 0) { setErrors(e); return }
    sessionStorage.setItem('vp_kyc', JSON.stringify(form))
    onNext()
  }

  return (
    <div>
      <SectionHeader title="Your Details" sub="We need this to process and deliver your order." />
      <MiniCart items={items} total={total} />
      <div style={{ background: 'white', borderRadius: 20, border: '1px solid #fce7f3', padding: 32, marginTop: 24 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          <Field label="Full Name" required value={form.full_name} error={errors.full_name} onChange={v => setForm({...form, full_name: v})} colSpan={2} />
          <Field label="NIC Number" required value={form.nic} error={errors.nic} onChange={v => setForm({...form, nic: v})} />
          <Field label="City" value={form.city} onChange={v => setForm({...form, city: v})} />
          <Field label="Phone" required value={form.phone1} error={errors.phone1} onChange={v => setForm({...form, phone1: v})} />
          <Field label="Secondary Phone" value={form.phone2} onChange={v => setForm({...form, phone2: v})} />
          <Field label="Address" required value={form.address} error={errors.address} onChange={v => setForm({...form, address: v})} colSpan={2} multiline />
        </div>
        <button onClick={handleNext} style={primaryBtn}>Continue to Payment &rarr;</button>
      </div>
    </div>
  )
}

// ── Payment Step ──────────────────────────────────────────────────────────────
function PaymentStep({ items, total, onSuccess }) {
  const [selectedBank, setSelectedBank] = useState(ACCOUNTS[0])
  const [slip, setSlip] = useState(null)
  const [preview, setPreview] = useState(null)
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(null)
  const fileRef = useRef()

  function handleFile(file) {
    if (!file) return
    setSlip(file)
    if (file.type.startsWith('image/')) {
      const reader = new FileReader()
      reader.onload = e => setPreview(e.target.result)
      reader.readAsDataURL(file)
    } else { setPreview('pdf') }
  }

  function copy(text, key) {
    navigator.clipboard.writeText(text)
    setCopied(key)
    setTimeout(() => setCopied(null), 2000)
  }

  async function handleSubmit() {
    if (!slip) return alert('Please upload your payment slip')
    setLoading(true)
    try {
      const kyc = JSON.parse(sessionStorage.getItem('vp_kyc') || '{}')
      const fd = new FormData()
      fd.append('slip',       slip)
      fd.append('full_name',  kyc.full_name  || '')
      fd.append('nic',        kyc.nic        || '')
      fd.append('phone1',     kyc.phone1     || '')
      fd.append('phone2',     kyc.phone2     || '')   // ← was missing
      fd.append('address',    kyc.address    || '')
      fd.append('city',       kyc.city       || '')   // ← was missing
      fd.append('items_json', JSON.stringify(items))
      fd.append('total',      total.toString())
      fd.append('bank_used',  selectedBank.bank)

      const res = await api.post('/orders', fd)
      onSuccess(res.data)
    } catch (err) {
      alert('Error submitting order. Please try again.')
    } finally { setLoading(false) }
  }

  return (
    <div>
      <SectionHeader title="Bank Transfer" sub="Select a bank and transfer the total amount." />
      <MiniCart items={items} total={total} />

      <div style={{ display: 'flex', gap: 12, marginTop: 24, marginBottom: 16 }}>
        {ACCOUNTS.map(acc => (
          <button
            key={acc.id}
            onClick={() => setSelectedBank(acc)}
            style={{
              flex: 1, padding: '12px', borderRadius: 12, border: '2px solid',
              borderColor: selectedBank.id === acc.id ? '#ec4899' : '#e7e5e4',
              background: 'white', cursor: 'pointer', transition: '0.2s',
              fontWeight: 700, fontSize: 12
            }}
          >
            {acc.bank}
          </button>
        ))}
      </div>

      <div style={{ background: 'white', borderRadius: 20, border: '1px solid #fce7f3', padding: 32 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #fce7f3' }}>
          <span style={{ fontSize: 12, color: '#a8a29e' }}>Account Name</span>
          <span style={{ fontSize: 13, fontWeight: 700 }}>{selectedBank.name}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #fce7f3' }}>
          <span style={{ fontSize: 12, color: '#a8a29e' }}>Account Number</span>
          <button onClick={() => copy(selectedBank.account, 'acc')} style={{ background: 'none', border: 'none', color: '#ec4899', fontWeight: 800, cursor: 'pointer' }}>
            {copied === 'acc' ? 'Copied!' : selectedBank.account}
          </button>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #fce7f3' }}>
          <span style={{ fontSize: 12, color: '#a8a29e' }}>Branch</span>
          <span style={{ fontSize: 13, fontWeight: 700 }}>{selectedBank.branch}</span>
        </div>

        <div style={{ marginTop: 24, padding: 20, background: 'linear-gradient(135deg, #ec4899, #d4a853)', borderRadius: 14, color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1 }}>TOTAL TO PAY</span>
          <span style={{ fontSize: 24, fontWeight: 900 }}>Rs {total.toLocaleString()}</span>
        </div>

        <div onClick={() => fileRef.current.click()} style={{ border: '2px dashed #fce7f3', borderRadius: 16, padding: 30, textAlign: 'center', marginTop: 24, cursor: 'pointer', background: '#fdf9f7' }}>
          {preview && preview !== 'pdf' && <img src={preview} style={{ maxHeight: 120, borderRadius: 8, marginBottom: 12 }} />}
          {preview === 'pdf' && <div style={{ fontSize: 32, marginBottom: 8 }}>📄</div>}
          <p style={{ fontSize: 13, fontWeight: 700, color: '#57534e' }}>{slip ? slip.name : 'Click to upload payment receipt'}</p>
          <input ref={fileRef} type="file" hidden onChange={e => handleFile(e.target.files[0])} />
        </div>

        <button onClick={handleSubmit} disabled={loading} style={primaryBtn}>
          {loading ? 'Processing...' : 'Submit Order'}
        </button>
      </div>
    </div>
  )
}

// ── Success Step ──────────────────────────────────────────────────────────────
// reference comes directly from backend — DN-YYYY-00001
// No more frontend formatting, both customer and admin see the same ref
function SuccessStep({ order, onShopMore }) {
  const [show, setShow] = useState(false)

  const reference = order?.reference || '—'

  useEffect(() => {
    setTimeout(() => { setShow(true); launchConfetti() }, 100)
  }, [])

  return (
    <div style={{ textAlign: 'center', opacity: show ? 1 : 0, transform: show ? 'translateY(0)' : 'translateY(20px)', transition: '0.6s' }}>
      <div style={{ fontSize: 64, marginBottom: 20 }}>🌸</div>
      <h1 style={{ fontSize: 32, fontWeight: 900, fontFamily: 'var(--serif)' }}>Order Received!</h1>
      <p style={{ margin: '20px 0', color: '#57534e', maxWidth: 400, marginInline: 'auto' }}>
        We are verifying your payment. We will contact you shortly to confirm delivery.
      </p>

      <div style={{ background: 'white', padding: 16, borderRadius: 12, border: '1px solid #fce7f3', display: 'inline-block', marginBottom: 24 }}>
        <span style={{ fontSize: 10, color: '#a8a29e', display: 'block', marginBottom: 4 }}>ORDER REFERENCE</span>
        <span style={{ fontSize: 20, fontWeight: 900, color: '#ec4899', letterSpacing: '1px' }}>
          {reference}
        </span>
      </div>

      <div>
        <button onClick={onShopMore} style={primaryBtn}>Back to Catalog</button>
      </div>
    </div>
  )
}

// ── Shared Helpers ────────────────────────────────────────────────────────────
function MiniCart({ items, total }) {
  return (
    <div style={{ background: 'white', borderRadius: 16, border: '1px solid #fce7f3', padding: 16 }}>
      {items.map(item => (
        <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
          <span>{item.name} x{item.quantity}</span>
          <span style={{ fontWeight: 700 }}>Rs {(item.price * item.quantity).toLocaleString()}</span>
        </div>
      ))}
      <div style={{ borderTop: '1px solid #fce7f3', marginTop: 10, paddingTop: 10, display: 'flex', justifyContent: 'space-between', fontWeight: 900 }}>
        <span>Total</span><span style={{ color: '#ec4899' }}>Rs {total.toLocaleString()}</span>
      </div>
    </div>
  )
}

function SectionHeader({ title, sub }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <h2 style={{ fontSize: 28, fontWeight: 900, fontFamily: 'var(--serif)', fontStyle: 'italic' }}>{title}</h2>
      <p style={{ fontSize: 13, color: '#a8a29e' }}>{sub}</p>
    </div>
  )
}

function Field({ label, value, onChange, error, required, colSpan, multiline, placeholder }) {
  const st = { width: '100%', padding: 12, borderRadius: 10, border: '1.5px solid #e7e5e4', marginTop: 6, fontSize: 13, boxSizing: 'border-box' }
  return (
    <div style={{ gridColumn: colSpan === 2 ? 'span 2' : 'span 1' }}>
      <label style={{ fontSize: 11, fontWeight: 700, color: '#57534e' }}>{label}{required && '*'}</label>
      {multiline
        ? <textarea rows={3} style={st} value={value} onChange={e => onChange(e.target.value)} />
        : <input style={st} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} />
      }
      {error && <p style={{ color: '#ef4444', fontSize: 10, marginTop: 4 }}>{error}</p>}
    </div>
  )
}

function launchConfetti() {
  const canvas = document.createElement('canvas')
  canvas.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:9'
  document.body.appendChild(canvas)
  const ctx = canvas.getContext('2d')
  canvas.width = window.innerWidth; canvas.height = window.innerHeight
  const particles = Array.from({ length: 80 }, () => ({
    x: Math.random() * canvas.width, y: -20, s: Math.random() * 4 + 2,
    c: ['#ec4899', '#ffd700', '#16a34a'][Math.floor(Math.random() * 3)]
  }))
  function render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    particles.forEach(p => { p.y += p.s; ctx.fillStyle = p.c; ctx.fillRect(p.x, p.y, 7, 7) })
    if (particles[0].y < canvas.height) requestAnimationFrame(render)
    else canvas.remove()
  }
  render()
}

const primaryBtn = {
  width: '100%', padding: '16px', background: 'linear-gradient(135deg, #ec4899, #d4a853)',
  color: 'white', border: 'none', borderRadius: 99, fontWeight: 900, cursor: 'pointer', marginTop: 20,
  fontSize: 12, letterSpacing: 1, textTransform: 'uppercase'
}