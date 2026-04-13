import { useState, useEffect, useRef } from 'react'
import adminApi from '../../lib/adminApi'
import { uploadProductImage } from '../../lib/uploadProductImage'
import {
  PageHeader, PageContent, Card, Table, Tr, Td,
  StatusPill, Btn, Input, Select, Spinner, Empty,
  Modal, ModalFooter, ImgThumb, CatPill, tokens as T
} from '../../components/admin/AdminUI'

const CATS    = ['Charms & pendents', 'plain', 'signature', 'bangle', 'supplies']
const SUBCATS = ['Butterfly Charms', 'Shell Charms', 'Daisy Charms', 'Flower Charms', 'Heart Charms', 'Premium Charms', 'Star & Sea Charms', 'Other Charms']

// ── View toggle: 'table' | 'grid' ────────────────────────────────────────────
export default function AdminProducts() {
  const [products,   setProducts]   = useState([])
  const [loading,    setLoading]    = useState(true)
  const [modal,      setModal]      = useState(null)
  const [saving,     setSaving]     = useState(false)
  const [uploading,  setUploading]  = useState(false)
  const [view,       setView]       = useState('grid')   // 'table' | 'grid'
  const [reordering, setReordering] = useState(false)
  const [form, setForm] = useState({
    name:'', price:'', description:'', image_url:'',
    category:'Charms & pendents', subcategory:'', stock:''
  })
  const fileInputRef = useRef(null)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    try { const res = await adminApi.get('/products'); setProducts(res.data) }
    finally { setLoading(false) }
  }

  function openAdd() {
    setForm({ name:'', price:'', description:'', image_url:'', category:'Charms & pendents', subcategory:'', stock:'' })
    setModal('add')
  }

  function openEdit(p) {
    setForm({ name:p.name, price:p.price, description:p.description||'', image_url:p.image_url||'', category:p.category||'Charms & pendents', subcategory:p.subcategory||'', stock:p.stock })
    setModal(p)
  }

  async function handleImagePick(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const url = await uploadProductImage(file)
      setForm(f => ({ ...f, image_url: url }))
    } catch (err) {
      alert('Image upload failed: ' + err.message)
    } finally { setUploading(false) }
  }

  async function save() {
    if (!form.name || !form.price) return
    setSaving(true)
    try {
      modal === 'add'
        ? await adminApi.post('/products', form)
        : await adminApi.put(`/products/${modal.id}`, form)
      await load(); setModal(null)
    } finally { setSaving(false) }
  }

  async function deleteProduct(id) {
    if (!confirm('Delete this product?')) return
    await adminApi.delete(`/products/${id}`); await load()
  }

  // ── Save new order to backend ─────────────────────────────────────────────
  async function saveOrder(reordered) {
    setReordering(true)
    try {
      const order = reordered.map((p, i) => ({ id: p.id, sort_order: i + 1 }))
      await adminApi.patch('/products/reorder', { order })
      setProducts(reordered)
    } catch (e) {
      alert('Failed to save order: ' + e.message)
    } finally { setReordering(false) }
  }

  const stockStatus = s => s === 0 ? 'critical' : s <= 5 ? 'low' : 'ok'

  return (
    <>
      <PageHeader
        title="Products"
        subtitle={`${products.length} items`}
        action={
          <div style={{ display:'flex', gap:8 }}>
            {/* View toggle */}
            <div style={{ display:'flex', borderRadius:10, overflow:'hidden', border:`1px solid ${T.border}` }}>
              <ViewToggleBtn active={view==='table'} onClick={() => setView('table')} label="≡ Table" />
              <ViewToggleBtn active={view==='grid'}  onClick={() => setView('grid')}  label="⠿ Drag" />
            </div>
            <Btn onClick={openAdd}>+ Add Product</Btn>
          </div>
        }
      />
      <PageContent>
        {loading ? <Spinner /> : view === 'table' ? (
          // ── TABLE VIEW ──────────────────────────────────────────────────────
          <Card>
            <Table headers={['', 'Name', 'Category', 'Subcategory', 'Price', 'Stock', 'Status', 'Actions']}>
              {products.length === 0
                ? <tr><td colSpan={8}><Empty message="No products yet — add your first one" /></td></tr>
                : products.map(p => (
                  <Tr key={p.id}>
                    <Td><ImgThumb src={p.image_url} /></Td>
                    <Td>
                      <div style={{ fontWeight:600, color:T.text }}>{p.name}</div>
                      <div style={{ fontSize:11, color:T.muted, marginTop:2 }}>{p.description?.slice(0,38)}{p.description?.length > 38 ? '…' : ''}</div>
                    </Td>
                    <Td><CatPill label={p.category} /></Td>
                    <Td muted style={{ fontSize:12 }}>{p.subcategory || '—'}</Td>
                    <Td pink>Rs {Number(p.price).toFixed(2)}</Td>
                    <Td muted>{p.stock}</Td>
                    <Td><StatusPill status={stockStatus(p.stock)} /></Td>
                    <Td>
                      <div style={{ display:'flex', gap:6 }}>
                        <Btn size="sm" variant="ghost" onClick={() => openEdit(p)}>Edit</Btn>
                        <Btn size="sm" variant="danger" onClick={() => deleteProduct(p.id)}>Del</Btn>
                      </div>
                    </Td>
                  </Tr>
                ))}
            </Table>
          </Card>
        ) : (
          // ── DRAG GRID VIEW ──────────────────────────────────────────────────
          <>
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:16, padding:'10px 14px', background:T.surface, borderRadius:12, border:`1px solid ${T.border}` }}>
              <span style={{ fontSize:18 }}>↕</span>
              <span style={{ fontSize:12, color:T.muted }}>
                Drag cards to reorder. Order is saved automatically when you drop.
              </span>
              {reordering && <span style={{ fontSize:11, color:T.gold, marginLeft:'auto' }}>Saving…</span>}
            </div>
            <DragGrid
              products={products}
              onReorder={saveOrder}
              onEdit={openEdit}
              onDelete={deleteProduct}
              stockStatus={stockStatus}
            />
          </>
        )}
      </PageContent>

      {modal && (
        <Modal title={modal === 'add' ? 'Add Product' : 'Edit Product'} onClose={() => setModal(null)}>
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
            <Input label="Product Name" value={form.name} onChange={e => setForm(f => ({...f, name:e.target.value}))} placeholder="e.g. Butterfly Charm Pink" />
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
              <Input label="Price (Rs)" type="number" step="0.01" value={form.price} onChange={e => setForm(f => ({...f, price:e.target.value}))} placeholder="0.00" />
              <Input label="Stock" type="number" value={form.stock} onChange={e => setForm(f => ({...f, stock:e.target.value}))} placeholder="0" />
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
              <Select label="Category" value={form.category} onChange={e => setForm(f => ({...f, category:e.target.value}))}>
                {CATS.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase()+c.slice(1)}</option>)}
              </Select>
              <Select label="Subcategory (Group)" value={form.subcategory} onChange={e => setForm(f => ({...f, subcategory:e.target.value}))}>
                <option value="">-- None --</option>
                {SUBCATS.map(s => <option key={s} value={s}>{s}</option>)}
              </Select>
            </div>

            {/* Image Upload */}
            <div>
              <label style={{ display:'block', fontSize:10, fontWeight:700, color:T.muted, letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:6 }}>
                Product Image
              </label>
              <div style={{ display:'flex', gap:10, alignItems:'center' }}>
                <Btn size="sm" variant="ghost" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                  {uploading ? 'Uploading…' : '📁 Pick Image'}
                </Btn>
                {form.image_url && <span style={{ fontSize:11, color:T.muted }}>✓ Uploaded</span>}
              </div>
              <input ref={fileInputRef} type="file" accept="image/*" style={{ display:'none' }} onChange={handleImagePick} />
              {form.image_url && (
                <img src={form.image_url} alt="preview" style={{ marginTop:10, height:110, objectFit:'cover', borderRadius:10, border:`1px solid ${T.border}` }} />
              )}
            </div>

            <div>
              <label style={{ display:'block', fontSize:10, fontWeight:700, color:T.muted, letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:6 }}>Description</label>
              <textarea rows={3} value={form.description} onChange={e => setForm(f => ({...f, description:e.target.value}))}
                style={{ width:'100%', padding:'9px 13px', background:'#0f0f1a', border:`1px solid ${T.border}`, borderRadius:10, color:T.text, fontSize:13, outline:'none', resize:'vertical', fontFamily:T.font, boxSizing:'border-box' }} />
            </div>
          </div>
          <ModalFooter onClose={() => setModal(null)} onSave={save} saving={saving} saveLabel="Save Product" />
        </Modal>
      )}
    </>
  )
}

// ── View Toggle Button ────────────────────────────────────────────────────────
function ViewToggleBtn({ active, onClick, label }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding:'6px 14px', fontSize:11, fontWeight:700, border:'none', cursor:'pointer',
        background: active ? T.pink : 'transparent',
        color: active ? 'white' : T.muted,
        transition:'all 0.2s',
      }}
    >{label}</button>
  )
}

// ── Drag Grid ─────────────────────────────────────────────────────────────────
function DragGrid({ products, onReorder, onEdit, onDelete, stockStatus }) {
  const [items,    setItems]    = useState(products)
  const [dragIdx,  setDragIdx]  = useState(null)  // index being dragged
  const [overIdx,  setOverIdx]  = useState(null)  // index being hovered

  // Keep in sync if parent reloads
  useEffect(() => { setItems(products) }, [products])

  function handleDragStart(e, idx) {
    setDragIdx(idx)
    e.dataTransfer.effectAllowed = 'move'
    // ghost image: transparent (we paint our own highlight)
    const ghost = document.createElement('div')
    ghost.style.position = 'absolute'; ghost.style.top = '-9999px'
    document.body.appendChild(ghost)
    e.dataTransfer.setDragImage(ghost, 0, 0)
    setTimeout(() => document.body.removeChild(ghost), 0)
  }

  function handleDragOver(e, idx) {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (idx !== overIdx) setOverIdx(idx)
  }

  function handleDrop(e, idx) {
    e.preventDefault()
    if (dragIdx === null || dragIdx === idx) { reset(); return }
    const next = [...items]
    const [moved] = next.splice(dragIdx, 1)
    next.splice(idx, 0, moved)
    setItems(next)
    onReorder(next)
    reset()
  }

  function handleDragEnd() { reset() }

  function reset() { setDragIdx(null); setOverIdx(null) }

  if (items.length === 0) return <Empty message="No products yet — add your first one" />

  return (
    <div style={{
      display:'grid',
      gridTemplateColumns:'repeat(auto-fill, minmax(200px, 1fr))',
      gap:14,
    }}>
      {items.map((p, idx) => (
        <DragCard
          key={p.id}
          product={p}
          idx={idx}
          isDragging={dragIdx === idx}
          isOver={overIdx === idx && dragIdx !== idx}
          stockStatus={stockStatus}
          onEdit={onEdit}
          onDelete={onDelete}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onDragEnd={handleDragEnd}
        />
      ))}
    </div>
  )
}

// ── Individual Draggable Card ─────────────────────────────────────────────────
function DragCard({ product: p, idx, isDragging, isOver, stockStatus, onEdit, onDelete, onDragStart, onDragOver, onDrop, onDragEnd }) {
  const T_local = {
    bg:     '#13131f',
    border: 'rgba(255,255,255,0.07)',
    borderHi:'rgba(255,45,120,0.5)',
    text:   '#f0f0f8',
    muted:  '#6b6b85',
    pink:   '#ff2d78',
    gold:   '#ffc53d',
  }

  const borderColor = isOver ? T_local.borderHi : isDragging ? 'rgba(255,197,61,0.4)' : T_local.border

  return (
    <div
      draggable
      onDragStart={e => onDragStart(e, idx)}
      onDragOver={e => onDragOver(e, idx)}
      onDrop={e => onDrop(e, idx)}
      onDragEnd={onDragEnd}
      style={{
        background: T_local.bg,
        border: `2px solid ${borderColor}`,
        borderRadius: 14,
        overflow: 'hidden',
        opacity: isDragging ? 0.45 : 1,
        transform: isOver ? 'scale(1.03)' : 'scale(1)',
        transition: 'border-color 0.15s, transform 0.15s, opacity 0.15s',
        cursor: 'grab',
        userSelect: 'none',
        boxShadow: isOver ? `0 0 20px rgba(255,45,120,0.2)` : 'none',
        position: 'relative',
      }}
    >
      {/* Drag handle indicator */}
      <div style={{
        position:'absolute', top:8, right:8, zIndex:2,
        fontSize:12, color: T_local.muted, lineHeight:1,
        letterSpacing:1,
      }}>⠿</div>

      {/* Order badge */}
      <div style={{
        position:'absolute', top:8, left:8, zIndex:2,
        background:'rgba(0,0,0,0.55)', borderRadius:6,
        fontSize:9, fontWeight:900, color: T_local.muted,
        padding:'2px 7px', letterSpacing:'0.5px',
      }}>#{idx + 1}</div>

      {/* Image */}
      <div style={{ aspectRatio:'4/3', overflow:'hidden', background:'#0a0a14' }}>
        {p.image_url
          ? <img src={p.image_url} alt={p.name} style={{ width:'100%', height:'100%', objectFit:'cover', display:'block', pointerEvents:'none' }} />
          : <div style={{ width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center', color: T_local.muted, fontSize:28 }}>📦</div>
        }
      </div>

      {/* Info */}
      <div style={{ padding:'12px 12px 10px' }}>
        <div style={{ fontWeight:700, fontSize:13, color: T_local.text, marginBottom:3, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{p.name}</div>
        <div style={{ fontSize:11, color: T_local.muted, marginBottom:8, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
          {p.subcategory || p.category || '—'}
        </div>

        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
          <span style={{ fontSize:14, fontWeight:900, color: T_local.pink }}>Rs {Number(p.price).toFixed(2)}</span>
          <StockBadge status={stockStatus(p.stock)} stock={p.stock} />
        </div>

        {/* Actions */}
        <div style={{ display:'flex', gap:6 }}
          onMouseDown={e => e.stopPropagation()} // prevent drag starting from buttons
        >
          <ActionBtn onClick={() => onEdit(p)}>Edit</ActionBtn>
          <ActionBtn danger onClick={() => onDelete(p.id)}>Del</ActionBtn>
        </div>
      </div>
    </div>
  )
}

function StockBadge({ status, stock }) {
  const cfg = {
    ok:       { bg:'rgba(22,163,74,0.15)',  color:'#4ade80', label: `${stock} in stock` },
    low:      { bg:'rgba(255,197,61,0.15)', color:'#ffc53d', label: `${stock} left` },
    critical: { bg:'rgba(255,45,120,0.15)', color:'#ff2d78', label: 'Out of stock' },
  }[status] || { bg:'transparent', color:'#6b6b85', label: '—' }

  return (
    <span style={{ fontSize:9, fontWeight:900, letterSpacing:'0.5px', textTransform:'uppercase', padding:'3px 8px', borderRadius:6, background:cfg.bg, color:cfg.color }}>
      {cfg.label}
    </span>
  )
}

function ActionBtn({ children, onClick, danger }) {
  const [hov, setHov] = useState(false)
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        flex:1, padding:'5px 0', fontSize:10, fontWeight:800,
        letterSpacing:'0.5px', textTransform:'uppercase', border:'none',
        borderRadius:7, cursor:'pointer', transition:'all 0.15s',
        background: danger
          ? (hov ? '#ff2d78' : 'rgba(255,45,120,0.12)')
          : (hov ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.05)'),
        color: danger ? (hov ? 'white' : '#ff2d78') : '#f0f0f8',
      }}
    >{children}</button>
  )
}