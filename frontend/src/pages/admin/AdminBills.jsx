import { useState, useEffect, useRef } from 'react'
import adminApi from '../../lib/adminApi'
import {
  PageHeader, PageContent, KpiGrid, KpiCard,
  Card, CardHeader, Table, Tr, Td, ExpandedRow,
  Btn, Input, Select, Spinner, Empty,
  Modal, ModalFooter, StatusPill, tokens as T
} from '../../components/admin/AdminUI'

const BANKS = ['BOC', 'Peoples Bank', 'Cash', 'Other']
const UNITS  = ['g', 'kg', 'ml', 'L', 'pcs', 'pack', 'm', 'cm']

export default function AdminBills() {
  const [bills,     setBills]     = useState([])
  const [suppliers, setSuppliers] = useState([])
  const [materials, setMaterials] = useState([])
  const [loading,   setLoading]   = useState(true)
  const [expanded,  setExpanded]  = useState(null)
  const [modal,     setModal]     = useState(null)
  const [saving,    setSaving]    = useState(false)
  const [imageModal,setImageModal]= useState(null)
  const fileRef = useRef()

  const [showAddSupplier, setShowAddSupplier] = useState(false)
  const [newSupplier,     setNewSupplier]     = useState({ name:'', phone:'', email:'' })
  const [savingSupplier,  setSavingSupplier]  = useState(false)

  const [addMatIdx,   setAddMatIdx]   = useState(null)
  const [newMaterial, setNewMaterial] = useState({ name:'', unit:'g' })
  const [savingMat,   setSavingMat]   = useState(false)

  const emptyForm = () => ({ supplier_id:'', bill_date:today(), due_date:'', notes:'', items:[{ material_id:'', qty:'', unit_cost:'' }] })
  const [form,    setForm]    = useState(emptyForm())
  const [billImg, setBillImg] = useState(null)
  const [imgPrev, setImgPrev] = useState(null)
  const [payForm, setPayForm] = useState({ amount:'', payment_date:today(), payment_method:'bank', bank_account:'BOC', notes:'' })

  function today() { return new Date().toISOString().split('T')[0] }

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    try {
      const [b, s, m] = await Promise.all([
        adminApi.get('/bills'),
        adminApi.get('/suppliers'),
        adminApi.get('/materials'),
      ])
      setBills(b.data)
      setSuppliers(s.data)
      setMaterials(m.data)
    } finally { setLoading(false) }
  }

  function handleImage(file) {
    if (!file) return
    setBillImg(file)
    if (file.type.startsWith('image/')) {
      const r = new FileReader()
      r.onload = e => setImgPrev(e.target.result)
      r.readAsDataURL(file)
    } else { setImgPrev('pdf') }
  }

  function addItem()     { setForm(f => ({ ...f, items:[...f.items, { material_id:'', qty:'', unit_cost:'' }] })) }
  function removeItem(i) { setForm(f => ({ ...f, items:f.items.filter((_,idx)=>idx!==i) })) }
  function updateItem(i, k, v) {
    setForm(f => {
      const items = [...f.items]
      items[i] = { ...items[i], [k]:v }
      if (k === 'material_id' && v) {
        const mat = materials.find(m => String(m.id) === String(v))
        if (mat && mat.avg_cost > 0) items[i].unit_cost = String(mat.avg_cost.toFixed(2))
      }
      return { ...f, items }
    })
  }

  const billTotal = form.items.reduce((s, i) => s + ((parseFloat(i.qty)||0) * (parseFloat(i.unit_cost)||0)), 0)

  async function saveQuickSupplier() {
    if (!newSupplier.name.trim()) return
    setSavingSupplier(true)
    try {
      const res = await adminApi.post('/suppliers', newSupplier)
      const created = res.data
      setSuppliers(prev => [...prev, created].sort((a,b) => a.name.localeCompare(b.name)))
      setForm(f => ({ ...f, supplier_id: String(created.id) }))
      setNewSupplier({ name:'', phone:'', email:'' })
      setShowAddSupplier(false)
    } finally { setSavingSupplier(false) }
  }

  async function saveQuickMaterial() {
    if (!newMaterial.name.trim()) return
    setSavingMat(true)
    try {
      const res = await adminApi.post('/materials', newMaterial)
      const created = res.data
      setMaterials(prev => [...prev, created].sort((a,b) => a.name.localeCompare(b.name)))
      if (addMatIdx !== null) updateItem(addMatIdx, 'material_id', String(created.id))
      setNewMaterial({ name:'', unit:'g' })
      setAddMatIdx(null)
    } finally { setSavingMat(false) }
  }

  async function saveBill() {
    const validItems = form.items.filter(i => i.material_id && i.qty && i.unit_cost)
    if (!validItems.length) return alert('Add at least one complete line item')
    setSaving(true)
    try {
      const fd = new FormData()
      fd.append('supplier_id', form.supplier_id)
      fd.append('bill_date',   form.bill_date)
      fd.append('due_date',    form.due_date)
      fd.append('notes',       form.notes)
      fd.append('items',       JSON.stringify(validItems))
      if (billImg) fd.append('bill_image', billImg)
      await adminApi.post('/bills', fd)
      await load()
      setModal(null)
      setForm(emptyForm())
      setBillImg(null)
      setImgPrev(null)
    } finally { setSaving(false) }
  }

  async function savePayment() {
    if (!payForm.amount) return
    setSaving(true)
    try {
      await adminApi.post(`/bills/${modal.id}/pay`, payForm)
      await load()
      setModal(null)
    } finally { setSaving(false) }
  }

  async function deleteBill(id) {
    if (!confirm('Delete this bill? Stock will be reversed.')) return
    try { await adminApi.delete(`/bills/${id}`); await load() }
    catch (e) { alert(e.response?.data?.error || 'Cannot delete this bill') }
  }

  const totalBilled = bills.reduce((s, b) => s + b.total, 0)
  const totalPaid   = bills.reduce((s, b) => s + (b.amount_paid || 0), 0)
  const outstanding = totalBilled - totalPaid
  const unpaidCount = bills.filter(b => b.status === 'unpaid').length

  const billStatusCfg = {
    unpaid:  { label:'Unpaid',  color:T.pink, bg:'rgba(255,45,120,0.12)'  },
    partial: { label:'Partial', color:T.gold, bg:'rgba(255,197,61,0.14)'  },
    paid:    { label:'Paid',    color:T.lime, bg:'rgba(184,255,60,0.12)'  },
  }

  return (
    <>
      <PageHeader
        title="Bills"
        subtitle="Supplier purchase bills"
        action={<Btn onClick={() => { setForm(emptyForm()); setBillImg(null); setImgPrev(null); setShowAddSupplier(false); setAddMatIdx(null); setModal('new') }}>+ New Bill</Btn>}
      />
      <PageContent>
        <KpiGrid>
          <KpiCard label="Total Billed"  value={`Rs ${Math.round(totalBilled).toLocaleString()}`} accent />
          <KpiCard label="Total Paid"    value={`Rs ${Math.round(totalPaid).toLocaleString()}`} />
          <KpiCard label="Outstanding"   value={`Rs ${Math.round(outstanding).toLocaleString()}`}
            change={outstanding > 0 ? 'Unpaid balance' : 'All clear'} changeUp={outstanding === 0} />
          <KpiCard label="Unpaid Bills"  value={unpaidCount}
            change={unpaidCount > 0 ? 'Needs payment' : 'All paid'} changeUp={unpaidCount === 0} />
        </KpiGrid>

        <Card>
          <CardHeader title={`${bills.length} bills`} />
          {loading ? <Spinner /> : bills.length === 0 ? (
            <Empty message="No bills yet — create your first purchase bill" />
          ) : (
            <Table headers={['Bill #', 'Supplier', 'Date', 'Total', 'Paid', 'Outstanding', 'Status', 'Actions']}>
              {bills.map(b => {
                const cfg  = billStatusCfg[b.status] || billStatusCfg.unpaid
                const owed = b.total - (b.amount_paid || 0)
                return (
                  <>
                    <Tr key={b.id} onClick={() => setExpanded(expanded === b.id ? null : b.id)}>
                      <Td><span style={{ fontFamily:'monospace', fontSize:12, color:T.gold, fontWeight:700 }}>{b.bill_number}</span></Td>
                      <Td>{b.supplier_name || <span style={{ color:T.muted }}>No supplier</span>}</Td>
                      <Td muted>{b.bill_date}</Td>
                      <Td style={{ fontWeight:700, color:T.text }}>Rs {Number(b.total).toLocaleString()}</Td>
                      <Td style={{ color:T.lime }}>Rs {Number(b.amount_paid||0).toLocaleString()}</Td>
                      <Td style={{ color: owed > 0 ? T.pink : T.lime, fontWeight:700 }}>Rs {Number(owed).toLocaleString()}</Td>
                      <Td>
                        <span style={{ fontSize:10, fontWeight:700, padding:'3px 10px', borderRadius:99, background:cfg.bg, color:cfg.color, letterSpacing:'0.08em', textTransform:'uppercase' }}>
                          {cfg.label}
                        </span>
                      </Td>
                      <Td onClick={e => e.stopPropagation()}>
                        <div style={{ display:'flex', gap:6 }}>
                          {b.status !== 'paid' && (
                            <Btn size="sm" onClick={() => { setPayForm({ amount:'', payment_date:today(), payment_method:'bank', bank_account:'BOC', notes:'' }); setModal(b) }}>Pay</Btn>
                          )}
                          {b.status === 'unpaid' && (
                            <Btn size="sm" variant="danger" onClick={() => deleteBill(b.id)}>Del</Btn>
                          )}
                        </div>
                      </Td>
                    </Tr>
                    {expanded === b.id && (
                      <ExpandedRow key={`${b.id}-exp`} colSpan={8}>
                        <BillDetail billId={b.id} imageModal={setImageModal} />
                      </ExpandedRow>
                    )}
                  </>
                )
              })}
            </Table>
          )}
        </Card>
      </PageContent>

      {/* ── New Bill Modal ── */}
      {modal === 'new' && (
        <Modal title="New Purchase Bill" onClose={() => setModal(null)} width={660}>
          <div style={{ display:'flex', flexDirection:'column', gap:16 }}>

            {/* Supplier + Dates */}
            <div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12 }}>
                <div>
                  <Select label="Supplier" value={form.supplier_id} onChange={e => setForm(f=>({...f,supplier_id:e.target.value}))}>
                    <option value="">— No supplier —</option>
                    {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </Select>
                  <button
                    onClick={() => setShowAddSupplier(v => !v)}
                    style={{ marginTop:6, background:'none', border:'none', padding:0, fontSize:11, color:T.pink, cursor:'pointer', fontFamily:T.font }}
                  >
                    {showAddSupplier ? '▲ Cancel' : '+ New supplier'}
                  </button>
                </div>
                <Input label="Bill Date" type="date" value={form.bill_date} onChange={e => setForm(f=>({...f,bill_date:e.target.value}))} />
                <Input label="Due Date"  type="date" value={form.due_date}  onChange={e => setForm(f=>({...f,due_date:e.target.value}))}  />
              </div>

              {/* Quick-add supplier */}
              {showAddSupplier && (
                <div style={{ marginTop:10, padding:'14px 16px', background:'rgba(255,45,120,0.05)', border:'1px solid rgba(255,45,120,0.2)', borderRadius:10 }}>
                  <div style={{ fontSize:10, fontWeight:700, color:T.pink, letterSpacing:'0.12em', textTransform:'uppercase', marginBottom:10 }}>New Supplier</div>
                  <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr 1fr auto', gap:10, alignItems:'flex-end' }}>
                    <Input label="Name *" value={newSupplier.name} onChange={e => setNewSupplier(s=>({...s,name:e.target.value}))} placeholder="Supplier name" onKeyDown={e => e.key==='Enter' && saveQuickSupplier()} />
                    <Input label="Phone"  value={newSupplier.phone} onChange={e => setNewSupplier(s=>({...s,phone:e.target.value}))} placeholder="Optional" />
                    <Input label="Email"  value={newSupplier.email} onChange={e => setNewSupplier(s=>({...s,email:e.target.value}))} placeholder="Optional" />
                    <Btn onClick={saveQuickSupplier} disabled={savingSupplier} style={{ alignSelf:'flex-end', whiteSpace:'nowrap' }}>
                      {savingSupplier ? '...' : '✓ Add'}
                    </Btn>
                  </div>
                </div>
              )}
            </div>

            {/* Line items */}
            <div>
              <div style={{ fontSize:10, fontWeight:700, color:T.muted, letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:10 }}>Items</div>
              <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                {form.items.map((item, i) => {
                  const lineTotal   = (parseFloat(item.qty)||0) * (parseFloat(item.unit_cost)||0)
                  const isAddingMat = addMatIdx === i
                  return (
                    <div key={i}>
                      <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr 1fr 1fr auto', gap:8, alignItems:'flex-end' }}>
                        <div>
                          <Select value={item.material_id} onChange={e => updateItem(i,'material_id',e.target.value)}>
                            <option value="">— Select material —</option>
                            {materials.map(m => <option key={m.id} value={m.id}>{m.name} ({m.unit})</option>)}
                          </Select>
                          <button
                            onClick={() => { setAddMatIdx(isAddingMat ? null : i); setNewMaterial({ name:'', unit:'g' }) }}
                            style={{ marginTop:5, background:'none', border:'none', padding:0, fontSize:11, color:T.pink, cursor:'pointer', fontFamily:T.font }}
                          >
                            {isAddingMat ? '▲ Cancel' : '+ New material'}
                          </button>
                        </div>
                        <Input type="number" placeholder="Qty"       value={item.qty}       onChange={e => updateItem(i,'qty',e.target.value)} />
                        <Input type="number" step="0.01" placeholder="Unit cost" value={item.unit_cost} onChange={e => updateItem(i,'unit_cost',e.target.value)} />
                        <div style={{ fontSize:12, color:T.pink, fontWeight:700, padding:'9px 0', textAlign:'right' }}>
                          {lineTotal > 0 ? `Rs ${lineTotal.toLocaleString()}` : '—'}
                        </div>
                        <button onClick={() => { removeItem(i); if (addMatIdx===i) setAddMatIdx(null) }}
                          style={{ background:'none', border:'none', color:T.muted, cursor:'pointer', fontSize:18, padding:'4px 8px' }}>×</button>
                      </div>

                      {/* Quick-add material */}
                      {isAddingMat && (
                        <div style={{ marginTop:8, padding:'12px 14px', background:'rgba(255,45,120,0.05)', border:'1px solid rgba(255,45,120,0.2)', borderRadius:10 }}>
                          <div style={{ fontSize:10, fontWeight:700, color:T.pink, letterSpacing:'0.12em', textTransform:'uppercase', marginBottom:10 }}>New Material</div>
                          <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr auto', gap:10, alignItems:'flex-end' }}>
                            <Input label="Name *" value={newMaterial.name} onChange={e => setNewMaterial(m=>({...m,name:e.target.value}))} placeholder="e.g. Cotton thread" onKeyDown={e => e.key==='Enter' && saveQuickMaterial()} />
                            <Select label="Unit" value={newMaterial.unit} onChange={e => setNewMaterial(m=>({...m,unit:e.target.value}))}>
                              {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                            </Select>
                            <Btn onClick={saveQuickMaterial} disabled={savingMat} style={{ alignSelf:'flex-end', whiteSpace:'nowrap' }}>
                              {savingMat ? '...' : '✓ Add'}
                            </Btn>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
              <button onClick={addItem}
                style={{ marginTop:8, background:'none', border:`1px dashed ${T.border}`, borderRadius:8, color:T.muted, fontSize:12, cursor:'pointer', padding:'7px 14px', width:'100%', fontFamily:T.font, transition:'all 0.15s' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor=T.pink; e.currentTarget.style.color=T.pink }}
                onMouseLeave={e => { e.currentTarget.style.borderColor=T.border; e.currentTarget.style.color=T.muted }}
              >+ Add Item</button>
            </div>

            {/* Bill total */}
            {billTotal > 0 && (
              <div style={{ display:'flex', justifyContent:'flex-end' }}>
                <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:10, padding:'10px 18px', textAlign:'right' }}>
                  <div style={{ fontSize:10, color:T.muted, textTransform:'uppercase', letterSpacing:'0.1em' }}>Bill Total</div>
                  <div style={{ fontSize:22, fontWeight:900, color:T.pink }}>Rs {billTotal.toLocaleString()}</div>
                </div>
              </div>
            )}

            <Input label="Notes" value={form.notes} onChange={e => setForm(f=>({...f,notes:e.target.value}))} placeholder="Optional note" />

            {/* Bill image */}
            <div>
              <div style={{ fontSize:10, fontWeight:700, color:T.muted, letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:8 }}>Attach Bill / Receipt</div>
              <div
                onClick={() => fileRef.current?.click()}
                style={{ border:`2px dashed ${T.border}`, borderRadius:12, padding:'20px', textAlign:'center', cursor:'pointer', transition:'all 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.borderColor=T.pink}
                onMouseLeave={e => e.currentTarget.style.borderColor=T.border}
              >
                {imgPrev && imgPrev !== 'pdf' && <img src={imgPrev} alt="" style={{ maxHeight:80, borderRadius:8, marginBottom:8 }} />}
                {imgPrev === 'pdf' && <div style={{ fontSize:28, marginBottom:4 }}>📄</div>}
                <div style={{ fontSize:12, color:T.muted }}>{billImg ? billImg.name : 'Click to attach image or PDF'}</div>
                <input ref={fileRef} type="file" accept="image/*,.pdf" hidden onChange={e => handleImage(e.target.files[0])} />
              </div>
            </div>
          </div>
          <ModalFooter onClose={() => setModal(null)} onSave={saveBill} saving={saving} saveLabel="Save Bill" />
        </Modal>
      )}

      {/* ── Payment Modal ── */}
      {modal && modal !== 'new' && (
        <Modal title={`Record Payment — ${modal.bill_number}`} onClose={() => setModal(null)} width={420}>
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
            <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:10, padding:'14px 16px', display:'flex', justifyContent:'space-between' }}>
              <span style={{ fontSize:12, color:T.muted }}>Outstanding</span>
              <span style={{ fontSize:16, fontWeight:900, color:T.pink }}>Rs {Number(modal.total-(modal.amount_paid||0)).toLocaleString()}</span>
            </div>
            <Input label="Amount Paid (Rs)" type="number" step="0.01" value={payForm.amount} onChange={e => setPayForm(f=>({...f,amount:e.target.value}))} placeholder="0.00" />
            <Input label="Payment Date" type="date" value={payForm.payment_date} onChange={e => setPayForm(f=>({...f,payment_date:e.target.value}))} />
            <Select label="Payment Method" value={payForm.payment_method} onChange={e => setPayForm(f=>({...f,payment_method:e.target.value}))}>
              <option value="bank">Bank Transfer</option>
              <option value="cash">Cash</option>
            </Select>
            {payForm.payment_method === 'bank' && (
              <Select label="Bank Account" value={payForm.bank_account} onChange={e => setPayForm(f=>({...f,bank_account:e.target.value}))}>
                {BANKS.map(b => <option key={b} value={b}>{b}</option>)}
              </Select>
            )}
            <Input label="Notes" value={payForm.notes} onChange={e => setPayForm(f=>({...f,notes:e.target.value}))} placeholder="Optional" />
          </div>
          <ModalFooter onClose={() => setModal(null)} onSave={savePayment} saving={saving} saveLabel="Record Payment" />
        </Modal>
      )}

      {/* Image lightbox */}
      {imageModal && (
        <div onClick={() => setImageModal(null)} style={{ position:'fixed', inset:0, zIndex:9999, background:'rgba(0,0,0,0.9)', display:'flex', alignItems:'center', justifyContent:'center', padding:24 }}>
          {imageModal.endsWith('.pdf') || imageModal.includes('pdf')
            ? <iframe src={imageModal} style={{ width:'90vw', height:'90vh', borderRadius:12 }} />
            : <img src={imageModal} alt="Bill" style={{ maxWidth:'90vw', maxHeight:'90vh', borderRadius:12, objectFit:'contain' }} onClick={e => e.stopPropagation()} />
          }
          <button onClick={() => setImageModal(null)} style={{ position:'fixed', top:20, right:24, background:'rgba(255,255,255,0.1)', border:'none', color:'white', fontSize:28, width:44, height:44, borderRadius:'50%', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>×</button>
        </div>
      )}
    </>
  )
}

function BillDetail({ billId, imageModal }) {
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    adminApi.get(`/bills/${billId}`)
      .then(r => setData(r.data))
      .finally(() => setLoading(false))
  }, [billId])

  if (loading) return <div style={{ padding:20 }}><Spinner /></div>
  if (!data)   return null

  return (
    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:20, padding:'8px 4px' }}>
      <div>
        <SLabel>Line Items</SLabel>
        {data.items.map((item, i) => (
          <div key={i} style={{ display:'flex', justifyContent:'space-between', padding:'8px 0', borderBottom:`1px solid ${T.border}`, fontSize:13 }}>
            <div>
              <div style={{ color:T.text, fontWeight:600 }}>{item.material_name}</div>
              <div style={{ color:T.muted, fontSize:11 }}>{item.qty} {item.unit} @ Rs {Number(item.unit_cost).toFixed(2)}</div>
            </div>
            <div style={{ color:T.pink, fontWeight:700 }}>Rs {Number(item.total).toLocaleString()}</div>
          </div>
        ))}
        <div style={{ display:'flex', justifyContent:'flex-end', paddingTop:10, fontWeight:900, color:T.text, fontSize:14 }}>
          Total: Rs {Number(data.total).toLocaleString()}
        </div>
      </div>
      <div>
        <SLabel>Payment History</SLabel>
        {!data.payments?.length ? (
          <div style={{ color:T.muted, fontSize:12, padding:'10px 0' }}>No payments yet</div>
        ) : data.payments.map((p, i) => (
          <div key={i} style={{ padding:'8px 0', borderBottom:`1px solid ${T.border}`, fontSize:12 }}>
            <div style={{ display:'flex', justifyContent:'space-between' }}>
              <span style={{ color:T.lime, fontWeight:700 }}>Rs {Number(p.amount).toLocaleString()}</span>
              <span style={{ color:T.muted }}>{p.payment_date}</span>
            </div>
            <div style={{ color:T.muted, marginTop:2 }}>{p.bank_account || p.payment_method}</div>
          </div>
        ))}
        <div style={{ paddingTop:10, display:'flex', justifyContent:'space-between', fontSize:12 }}>
          <span style={{ color:T.muted }}>Outstanding</span>
          <span style={{ color: data.outstanding > 0 ? T.pink : T.lime, fontWeight:700 }}>Rs {Number(data.outstanding).toLocaleString()}</span>
        </div>
      </div>
      <div>
        <SLabel>Bill Document</SLabel>
        {data.bill_image_url ? (
          <div onClick={() => imageModal(data.bill_image_url)} style={{ cursor:'pointer', borderRadius:10, overflow:'hidden', border:`1px solid ${T.border}`, marginBottom:10 }}>
            {data.bill_image_url.match(/\.(jpg|jpeg|png|webp)$/i)
              ? <img src={data.bill_image_url} alt="Bill" style={{ width:'100%', maxHeight:120, objectFit:'cover', display:'block' }}
                  onMouseEnter={e => e.target.style.opacity=0.8} onMouseLeave={e => e.target.style.opacity=1} />
              : <div style={{ padding:'16px', textAlign:'center', color:T.pink, fontSize:13, fontWeight:700 }}>📄 View PDF</div>
            }
          </div>
        ) : (
          <div style={{ color:T.muted, fontSize:12, padding:'10px 0' }}>No document attached</div>
        )}
        {data.notes && <div style={{ fontSize:12, color:T.muted, marginTop:8 }}>{data.notes}</div>}
      </div>
    </div>
  )
}

function SLabel({ children }) {
  return <div style={{ fontSize:10, fontWeight:700, color:T.muted, letterSpacing:'0.12em', textTransform:'uppercase', marginBottom:10 }}>{children}</div>
}