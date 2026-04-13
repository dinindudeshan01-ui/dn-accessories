import { useState, useEffect, useRef } from 'react'
import adminApi from '../../lib/adminApi'
import { uploadProductImage } from '../../lib/uploadProductImage'
import {
  PageHeader, PageContent, Card, Table, Tr, Td,
  StatusPill, Btn, Input, Select, Spinner, Empty,
  Modal, ModalFooter, ImgThumb, CatPill, tokens as T
} from '../../components/admin/AdminUI'

const CATS = ['Charms & pendents', 'plain', 'signature', 'bangle', 'supplies']
const SUBCATS = ['Butterfly Charms', 'Shell Charms', 'Daisy Charms', 'Flower Charms', 'Heart Charms', 'Premium Charms', 'Star & Sea Charms', 'Other Charms']

export default function AdminProducts() {
  const [products, setProducts] = useState([])
  const [loading, setLoading]   = useState(true)
  const [modal, setModal]       = useState(null)
  const [saving, setSaving]     = useState(false)
  const [uploading, setUploading] = useState(false)
  const [form, setForm]         = useState({ name:'', price:'', description:'', image_url:'', category:'Charms & pendents', subcategory:'', stock:'' })
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
    } finally {
      setUploading(false)
    }
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

  const stockStatus = s => s === 0 ? 'critical' : s <= 5 ? 'low' : 'ok'

  return (
    <>
      <PageHeader title="Products" subtitle={`${products.length} items`} action={<Btn onClick={openAdd}>+ Add Product</Btn>} />
      <PageContent>
        {loading ? <Spinner /> : (
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