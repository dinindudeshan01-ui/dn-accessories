import { useState, useEffect, useRef } from 'react'
import adminApi from '../../lib/adminApi'
import { uploadProductImage } from '../../lib/uploadProductImage'
import {
  PageHeader, PageContent, Btn, Input, Select, Spinner, Empty,
  Modal, ModalFooter, tokens as T
} from '../../components/admin/AdminUI'

const CATS    = ['Charms & pendents', 'plain', 'signature', 'bangle', 'supplies', 'handmade']
const SUBCATS = ['Butterfly Charms', 'Shell Charms', 'Daisy Charms', 'Flower Charms', 'Heart Charms', 'Premium Charms', 'Star & Sea Charms', 'Other Charms']

function buildGroups(products) {
  const map = {}
  const order = []
  products.forEach(p => {
    const key = p.subcategory?.trim() || '__none__'
    if (!map[key]) { map[key] = []; order.push(key) }
    map[key].push(p)
  })
  return order.map(key => ({ key, label: key === '__none__' ? 'No Group' : key, items: map[key] }))
}

function toReorderPayload(groups) {
  return groups.map((g, gi) => ({
    subcategory: g.key,
    group_order: gi + 1,
    items: g.items.map((p, pi) => ({ id: p.id, sort_order: pi + 1 }))
  }))
}

export default function AdminProducts() {
  const [groups,    setGroups]    = useState([])
  const [loading,   setLoading]   = useState(true)
  const [modal,     setModal]     = useState(null)
  const [saving,    setSaving]    = useState(false)
  const [uploading, setUploading] = useState(false)
  const [syncing,   setSyncing]   = useState(false)
  const [form, setForm] = useState({
    name:'', price:'', description:'', image_url:'',
    category:'Charms & pendents', subcategory:'', stock:''
  })
  const fileInputRef = useRef(null)
  const productCount = groups.reduce((n, g) => n + g.items.length, 0)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    try {
      const res = await adminApi.get('/products')
      setGroups(buildGroups(res.data))
    } finally { setLoading(false) }
  }

  function openAdd() {
    setForm({ name:'', price:'', description:'', image_url:'', category:'Charms & pendents', subcategory:'', stock:'' })
    setModal('add')
  }

  function openEdit(p) {
    setForm({ name:p.name, price:String(p.price), description:p.description||'', image_url:p.image_url||'', category:p.category||'Charms & pendents', subcategory:p.subcategory||'', stock:String(p.stock) })
    setModal(p)
  }

  async function handleImagePick(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const url = await uploadProductImage(file)
      setForm(f => ({ ...f, image_url: url }))
    } catch (err) { alert('Image upload failed: ' + err.message) }
    finally { setUploading(false) }
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

  async function persistOrder(newGroups) {
    setSyncing(true)
    try {
      await adminApi.patch('/products/reorder', { groups: toReorderPayload(newGroups) })
    } catch (e) { alert('Failed to save order: ' + e.message) }
    finally { setSyncing(false) }
  }

  function handleGroupReorder(newGroups) {
    setGroups(newGroups)
    persistOrder(newGroups)
  }

  function handleItemReorder(groupKey, newItems) {
    const newGroups = groups.map(g => g.key === groupKey ? { ...g, items: newItems } : g)
    setGroups(newGroups)
    persistOrder(newGroups)
  }

  const stockStatus = s => s === 0 ? 'critical' : s <= 5 ? 'low' : 'ok'

  return (
    <>
      <PageHeader
        title="Products"
        subtitle={`${productCount} items · ${groups.length} groups`}
        action={
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            {syncing && <span style={{ fontSize:11, color:T.gold }}>Saving…</span>}
            <Btn onClick={openAdd}>+ Add Product</Btn>
          </div>
        }
      />

      <PageContent>
        {loading ? <Spinner /> : groups.length === 0 ? (
          <Empty message="No products yet — add your first one" />
        ) : (
          <GroupBoard
            groups={groups}
            onGroupReorder={handleGroupReorder}
            onItemReorder={handleItemReorder}
            onEdit={openEdit}
            onDelete={deleteProduct}
            stockStatus={stockStatus}
          />
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
            <div>
              <label style={{ display:'block', fontSize:10, fontWeight:700, color:T.muted, letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:6 }}>Product Image</label>
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

function GroupBoard({ groups, onGroupReorder, onItemReorder, onEdit, onDelete, stockStatus }) {
  const [dragGroupIdx, setDragGroupIdx] = useState(null)
  const [overGroupIdx, setOverGroupIdx] = useState(null)

  function onGroupDragStart(e, idx) { setDragGroupIdx(idx); e.dataTransfer.effectAllowed = 'move'; suppressGhost(e) }
  function onGroupDragOver(e, idx)  { e.preventDefault(); if (idx !== overGroupIdx) setOverGroupIdx(idx) }
  function onGroupDrop(e, idx) {
    e.preventDefault()
    if (dragGroupIdx === null || dragGroupIdx === idx) { resetGroup(); return }
    const next = [...groups]
    const [moved] = next.splice(dragGroupIdx, 1)
    next.splice(idx, 0, moved)
    onGroupReorder(next)
    resetGroup()
  }
  function resetGroup() { setDragGroupIdx(null); setOverGroupIdx(null) }

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
      <div style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 14px', background:T.surface, borderRadius:12, border:`1px solid ${T.border}` }}>
        <span style={{ fontSize:16 }}>↕</span>
        <span style={{ fontSize:12, color:T.muted }}>Drag <strong style={{color:T.text}}>group headers</strong> to reorder sections · Drag <strong style={{color:T.text}}>cards</strong> to reorder within a group · What you see here = what customers see</span>
      </div>
      {groups.map((group, gi) => (
        <GroupSection
          key={group.key}
          group={group}
          idx={gi}
          isDragging={dragGroupIdx === gi}
          isOver={overGroupIdx === gi && dragGroupIdx !== gi}
          onDragStart={onGroupDragStart}
          onDragOver={onGroupDragOver}
          onDrop={onGroupDrop}
          onDragEnd={resetGroup}
          onItemReorder={onItemReorder}
          onEdit={onEdit}
          onDelete={onDelete}
          stockStatus={stockStatus}
        />
      ))}
    </div>
  )
}

function GroupSection({ group, idx, isDragging, isOver, onDragStart, onDragOver, onDrop, onDragEnd, onItemReorder, onEdit, onDelete, stockStatus }) {
  const [itemDragIdx, setItemDragIdx] = useState(null)
  const [itemOverIdx, setItemOverIdx] = useState(null)

  function onItemDragStart(e, i) { e.stopPropagation(); setItemDragIdx(i); e.dataTransfer.effectAllowed = 'move'; suppressGhost(e) }
  function onItemDragOver(e, i)  { e.preventDefault(); e.stopPropagation(); if (i !== itemOverIdx) setItemOverIdx(i) }
  function onItemDrop(e, i) {
    e.preventDefault(); e.stopPropagation()
    if (itemDragIdx === null || itemDragIdx === i) { resetItem(); return }
    const next = [...group.items]
    const [moved] = next.splice(itemDragIdx, 1)
    next.splice(i, 0, moved)
    onItemReorder(group.key, next)
    resetItem()
  }
  function resetItem() { setItemDragIdx(null); setItemOverIdx(null) }

  const borderColor = isOver ? 'rgba(255,45,120,0.5)' : isDragging ? 'rgba(255,197,61,0.35)' : T.border

  return (
    <div style={{ border:`2px solid ${borderColor}`, borderRadius:16, overflow:'hidden', opacity:isDragging?0.45:1, transform:isOver?'scale(1.01)':'scale(1)', transition:'border-color 0.15s, transform 0.15s, opacity 0.15s', boxShadow:isOver?'0 0 24px rgba(255,45,120,0.15)':'none' }}>
      <div
        draggable
        onDragStart={e => onDragStart(e, idx)}
        onDragOver={e => onDragOver(e, idx)}
        onDrop={e => onDrop(e, idx)}
        onDragEnd={onDragEnd}
        style={{ display:'flex', alignItems:'center', gap:12, padding:'14px 18px', background:T.surface, borderBottom:`1px solid ${T.border}`, cursor:'grab', userSelect:'none' }}
      >
        <span style={{ fontSize:16, color:T.muted, letterSpacing:2 }}>⠿⠿</span>
        <span style={{ fontSize:10, fontWeight:900, color:T.muted, background:T.faint, padding:'2px 8px', borderRadius:6 }}>#{idx + 1}</span>
        <span style={{ flex:1, fontWeight:800, fontSize:14, color:T.text }}>{group.label}</span>
        <span style={{ fontSize:11, color:T.muted }}>{group.items.length} {group.items.length === 1 ? 'item' : 'items'}</span>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(180px, 1fr))', gap:12, padding:14, background:T.card }}>
        {group.items.map((p, pi) => (
          <ProductCard
            key={p.id} product={p} idx={pi}
            isDragging={itemDragIdx === pi} isOver={itemOverIdx === pi && itemDragIdx !== pi}
            stockStatus={stockStatus} onEdit={onEdit} onDelete={onDelete}
            onDragStart={onItemDragStart} onDragOver={onItemDragOver} onDrop={onItemDrop} onDragEnd={resetItem}
          />
        ))}
      </div>
    </div>
  )
}

function ProductCard({ product: p, idx, isDragging, isOver, stockStatus, onEdit, onDelete, onDragStart, onDragOver, onDrop, onDragEnd }) {
  const stockCfg = {
    ok:       { bg:'rgba(22,163,74,0.15)',  color:'#4ade80' },
    low:      { bg:'rgba(255,197,61,0.15)', color:'#ffc53d' },
    critical: { bg:'rgba(255,45,120,0.15)', color:'#ff2d78' },
  }[stockStatus(p.stock)] || {}

  const borderColor = isOver ? 'rgba(255,45,120,0.6)' : isDragging ? 'rgba(255,197,61,0.4)' : T.border

  return (
    <div
      draggable
      onDragStart={e => onDragStart(e, idx)} onDragOver={e => onDragOver(e, idx)}
      onDrop={e => onDrop(e, idx)} onDragEnd={onDragEnd}
      style={{ background:T.surface, border:`2px solid ${borderColor}`, borderRadius:12, overflow:'hidden', opacity:isDragging?0.4:1, transform:isOver?'scale(1.04)':'scale(1)', transition:'all 0.15s', cursor:'grab', userSelect:'none', boxShadow:isOver?'0 0 16px rgba(255,45,120,0.2)':'none', position:'relative' }}
    >
      <div style={{ position:'absolute', top:6, left:6, zIndex:2, background:'rgba(0,0,0,0.6)', borderRadius:5, fontSize:8, fontWeight:900, color:T.muted, padding:'2px 6px' }}>{idx + 1}</div>
      <div style={{ position:'absolute', top:6, right:6, zIndex:2, fontSize:11, color:T.muted }}>⠿</div>
      <div style={{ aspectRatio:'1/1', overflow:'hidden', background:'#0a0a14' }}>
        {p.image_url
          ? <img src={p.image_url} alt={p.name} style={{ width:'100%', height:'100%', objectFit:'cover', display:'block', pointerEvents:'none' }} />
          : <div style={{ width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:28 }}>📦</div>
        }
      </div>
      <div style={{ padding:'10px 10px 8px' }}>
        <div style={{ fontWeight:700, fontSize:12, color:T.text, marginBottom:2, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{p.name}</div>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8 }}>
          <span style={{ fontSize:13, fontWeight:900, color:T.pink }}>Rs {Number(p.price).toFixed(0)}</span>
          <span style={{ fontSize:8, fontWeight:900, letterSpacing:'0.5px', textTransform:'uppercase', padding:'2px 6px', borderRadius:5, background:stockCfg.bg, color:stockCfg.color }}>
            {p.stock === 0 ? 'Out' : p.stock <= 5 ? `${p.stock} left` : `${p.stock}`}
          </span>
        </div>
        <div style={{ display:'flex', gap:5 }} onMouseDown={e => e.stopPropagation()}>
          <ActionBtn onClick={() => onEdit(p)}>Edit</ActionBtn>
          <ActionBtn danger onClick={() => onDelete(p.id)}>Del</ActionBtn>
        </div>
      </div>
    </div>
  )
}

function ActionBtn({ children, onClick, danger }) {
  const [hov, setHov] = useState(false)
  return (
    <button
      onClick={onClick} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ flex:1, padding:'5px 0', fontSize:9, fontWeight:900, letterSpacing:'0.5px', textTransform:'uppercase', border:'none', borderRadius:6, cursor:'pointer', transition:'all 0.15s', background:danger?(hov?'#ff2d78':'rgba(255,45,120,0.12)'):(hov?'rgba(255,255,255,0.1)':'rgba(255,255,255,0.05)'), color:danger?(hov?'white':'#ff2d78'):T.text }}
    >{children}</button>
  )
}

function suppressGhost(e) {
  const ghost = document.createElement('div')
  ghost.style.cssText = 'position:absolute;top:-9999px;'
  document.body.appendChild(ghost)
  e.dataTransfer.setDragImage(ghost, 0, 0)
  setTimeout(() => document.body.removeChild(ghost), 0)
}