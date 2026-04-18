// src/pages/admin/AdminMaterials.jsx — v2: reorder alerts + auto-draft bill

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import adminApi from '../../lib/adminApi'
import {
  PageHeader, PageContent, KpiGrid, KpiCard,
  Card, CardHeader, Table, Tr, Td,
  Btn, Input, Select, Spinner, Empty,
  Modal, ModalFooter, AlertBanner, tokens as T
} from '../../components/admin/AdminUI'

export default function AdminMaterials() {
  const navigate = useNavigate()
  const [materials, setMaterials] = useState([])
  const [units,     setUnits]     = useState([])
  const [loading,   setLoading]   = useState(true)
  const [modal,     setModal]     = useState(null)
  const [histModal, setHistModal] = useState(null)
  const [saving,    setSaving]    = useState(false)
  const [form, setForm] = useState({
    name:'', unit:'piece', opening_stock:'', opening_cost:'', reorder_level:'', notes:''
  })

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    try {
      const [m, u] = await Promise.all([
        adminApi.get('/materials'),
        adminApi.get('/materials/units'),
      ])
      setMaterials(m.data)
      setUnits(u.data)
    } finally { setLoading(false) }
  }

  function openAdd() {
    setForm({ name:'', unit:'piece', opening_stock:'', opening_cost:'', reorder_level:'', notes:'' })
    setModal('add')
  }

  function openEdit(m) {
    setForm({ name:m.name, unit:m.unit, opening_stock:'', opening_cost:'', reorder_level:String(m.reorder_level||''), notes:m.notes||'' })
    setModal(m)
  }

  async function save() {
    if (!form.name || !form.unit) return
    setSaving(true)
    try {
      modal === 'add'
        ? await adminApi.post('/materials', form)
        : await adminApi.put(`/materials/${modal.id}`, form)
      await load(); setModal(null)
    } finally { setSaving(false) }
  }

  async function deleteMaterial(id) {
    if (!confirm('Delete this material?')) return
    try { await adminApi.delete(`/materials/${id}`); await load() }
    catch (e) { alert(e.response?.data?.error || 'Cannot delete this material') }
  }

  // Auto-draft bill: navigate to Bills with prefilled query params
  function autoDraftBill(m) {
    // Encode material info as URL state
    navigate('/admin/bills', {
      state: {
        autoDraft: true,
        material: { id: m.id, name: m.name, unit: m.unit, avg_cost: m.avg_cost }
      }
    })
  }

  const totalValue = materials.reduce((s, m) => s + (m.qty_in_stock * m.avg_cost), 0)
  const belowReorder = materials.filter(m => m.reorder_level > 0 && m.qty_in_stock <= m.reorder_level)
  const lowStock   = belowReorder.length
  const outOfStock = materials.filter(m => m.qty_in_stock === 0).length

  const stockStatus = m => {
    if (m.qty_in_stock === 0) return 'critical'
    if (m.reorder_level > 0 && m.qty_in_stock <= m.reorder_level) return 'low'
    return 'ok'
  }

  const statusCfg = {
    ok:       { label:'OK',  color:T.lime, bg:'rgba(184,255,60,0.12)' },
    low:      { label:'Low', color:T.gold, bg:'rgba(255,197,61,0.14)' },
    critical: { label:'Out', color:T.pink, bg:'rgba(255,45,120,0.12)' },
  }

  return (
    <>
      <PageHeader
        title="Materials"
        subtitle="Raw material inventory"
        action={<Btn onClick={openAdd}>+ Add Material</Btn>}
      />
      <PageContent>

        {/* Reorder alert banner */}
        {(lowStock > 0 || outOfStock > 0) && (
          <AlertBanner
            type={outOfStock > 0 ? 'danger' : 'warning'}
            title={outOfStock > 0
              ? `${outOfStock} material${outOfStock > 1 ? 's' : ''} out of stock`
              : `${lowStock} material${lowStock > 1 ? 's' : ''} below reorder level`}
            body="Check the list below and use Auto-Draft Bill to quickly create a purchase order."
          />
        )}

        {/* Per-material reorder chips */}
        {belowReorder.length > 0 && (
          <div style={{ display:'flex', flexWrap:'wrap', gap:10, marginBottom:20 }}>
            {belowReorder.map(m => (
              <div key={m.id} style={{
                display:'flex', alignItems:'center', gap:10, padding:'10px 14px',
                background: m.qty_in_stock === 0 ? 'rgba(255,45,120,0.08)' : 'rgba(255,197,61,0.08)',
                border: `1px solid ${m.qty_in_stock === 0 ? 'rgba(255,45,120,0.25)' : 'rgba(255,197,61,0.25)'}`,
                borderRadius: 10,
              }}>
                <div>
                  <div style={{ fontSize:12, fontWeight:700, color: m.qty_in_stock === 0 ? T.pink : T.gold }}>
                    {m.qty_in_stock === 0 ? '⚠ OUT' : '⚡ LOW'} — {m.name}
                  </div>
                  <div style={{ fontSize:11, color:T.muted, marginTop:2 }}>
                    {m.qty_in_stock} {m.unit} in stock · reorder at {m.reorder_level}
                  </div>
                </div>
                <button
                  onClick={() => autoDraftBill(m)}
                  style={{
                    padding:'6px 12px', borderRadius:8, border:`1px solid ${T.border}`,
                    background: T.card, color: T.cyan, fontSize:11, fontWeight:700,
                    cursor:'pointer', whiteSpace:'nowrap',
                    transition:'all 0.15s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = T.cyan}
                  onMouseLeave={e => e.currentTarget.style.borderColor = T.border}
                >
                  Auto-Draft Bill →
                </button>
              </div>
            ))}
          </div>
        )}

        <KpiGrid>
          <KpiCard label="Total Materials"  value={materials.length} />
          <KpiCard label="Inventory Value"  value={`Rs ${Math.round(totalValue).toLocaleString()}`} accent />
          <KpiCard label="Low Stock"        value={lowStock}   change={lowStock   > 0 ? 'Needs reorder' : 'All good'} changeUp={lowStock   === 0} />
          <KpiCard label="Out of Stock"     value={outOfStock} change={outOfStock > 0 ? 'Urgent'        : 'All good'} changeUp={outOfStock === 0} />
        </KpiGrid>

        <Card>
          <CardHeader title={`${materials.length} materials`} />
          {loading ? <Spinner /> : materials.length === 0 ? (
            <Empty message="No materials yet — add your first raw material" />
          ) : (
            <Table headers={['Material', 'Unit', 'In Stock', 'Avg Cost', 'Stock Value', 'Reorder At', 'Status', 'Actions']}>
              {materials.map(m => {
                const st  = stockStatus(m)
                const cfg = statusCfg[st]
                return (
                  <Tr key={m.id} style={{ background: st !== 'ok' ? `${cfg.bg.replace('0.12','0.03')}` : undefined }}>
                    <Td>
                      <div style={{ fontWeight:600, color:T.text }}>{m.name}</div>
                      {m.notes && <div style={{ fontSize:11, color:T.muted, marginTop:2 }}>{m.notes.slice(0,40)}{m.notes.length>40?'…':''}</div>}
                    </Td>
                    <Td muted>{m.unit}</Td>
                    <Td>
                      <span style={{ fontWeight:700, color: st==='critical'?T.pink : st==='low'?T.gold : T.text }}>
                        {m.qty_in_stock}
                      </span>
                    </Td>
                    <Td muted>Rs {Number(m.avg_cost).toFixed(2)}</Td>
                    <Td pink>Rs {Math.round(m.qty_in_stock * m.avg_cost).toLocaleString()}</Td>
                    <Td muted>{m.reorder_level || '—'}</Td>
                    <Td>
                      <span style={{ fontSize:10, fontWeight:700, padding:'3px 10px', borderRadius:99, background:cfg.bg, color:cfg.color, letterSpacing:'0.08em', textTransform:'uppercase' }}>
                        {cfg.label}
                      </span>
                    </Td>
                    <Td>
                      <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                        {st !== 'ok' && (
                          <Btn size="sm" variant="ghost" onClick={() => autoDraftBill(m)}
                            style={{ color: T.cyan, borderColor: 'rgba(0,229,255,0.3)' }}>
                            📋 Draft Bill
                          </Btn>
                        )}
                        <Btn size="sm" variant="ghost" onClick={() => setHistModal(m)}>History</Btn>
                        <Btn size="sm" variant="ghost" onClick={() => openEdit(m)}>Edit</Btn>
                        <Btn size="sm" variant="danger" onClick={() => deleteMaterial(m.id)}>Del</Btn>
                      </div>
                    </Td>
                  </Tr>
                )
              })}
            </Table>
          )}
        </Card>
      </PageContent>

      {/* Add / Edit Modal */}
      {modal && (
        <Modal title={modal==='add' ? 'Add Material' : `Edit — ${modal.name}`} onClose={() => setModal(null)}>
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
            <Input label="Material Name" value={form.name} onChange={e => setForm(f=>({...f,name:e.target.value}))} placeholder="e.g. Butterfly beads" />
            <Select label="Unit" value={form.unit} onChange={e => setForm(f=>({...f,unit:e.target.value}))}>
              {units.map(u => <option key={u.id} value={u.name}>{u.name}</option>)}
            </Select>
            {modal === 'add' && (
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                <Input label="Opening Stock (qty)"       type="number"             value={form.opening_stock} onChange={e => setForm(f=>({...f,opening_stock:e.target.value}))} placeholder="0" />
                <Input label="Opening Cost (Rs per unit)" type="number" step="0.01" value={form.opening_cost} onChange={e => setForm(f=>({...f,opening_cost:e.target.value}))} placeholder="0.00" />
              </div>
            )}
            <Input label="Reorder Level" type="number" value={form.reorder_level} onChange={e => setForm(f=>({...f,reorder_level:e.target.value}))} placeholder="Alert when stock falls below this" />
            <div>
              <label style={{ display:'block', fontSize:10, fontWeight:700, color:T.muted, letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:6 }}>Notes</label>
              <textarea rows={2} value={form.notes} onChange={e => setForm(f=>({...f,notes:e.target.value}))} placeholder="Optional"
                style={{ width:'100%', padding:'9px 13px', background:T.surface, border:`1px solid ${T.border}`, borderRadius:10, color:T.text, fontSize:13, fontFamily:T.font, resize:'vertical', outline:'none', boxSizing:'border-box' }} />
            </div>
            {modal !== 'add' && (
              <div style={{ padding:'10px 14px', background:'rgba(0,229,255,0.06)', border:'1px solid rgba(0,229,255,0.15)', borderRadius:10, fontSize:12, color:T.muted }}>
                💡 Stock and average cost update automatically when you add purchase bills.
              </div>
            )}
          </div>
          <ModalFooter onClose={() => setModal(null)} onSave={save} saving={saving} saveLabel="Save Material" />
        </Modal>
      )}

      {/* Cost History Modal */}
      {histModal && <HistoryModal material={histModal} onClose={() => setHistModal(null)} />}
    </>
  )
}

function HistoryModal({ material, onClose }) {
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    adminApi.get(`/materials/${material.id}`)
      .then(r => setData(r.data))
      .finally(() => setLoading(false))
  }, [material.id])

  return (
    <Modal title={`${material.name} — Cost History`} onClose={onClose} width={560}>
      {loading ? <Spinner /> : (
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10 }}>
            {[
              { label:'In Stock',    value:`${data.qty_in_stock} ${data.unit}` },
              { label:'Avg Cost',    value:`Rs ${Number(data.avg_cost).toFixed(2)}` },
              { label:'Total Value', value:`Rs ${Math.round(data.qty_in_stock * data.avg_cost).toLocaleString()}` },
            ].map((s,i) => (
              <div key={i} style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:10, padding:'12px 14px' }}>
                <div style={{ fontSize:10, fontWeight:700, color:T.muted, textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:4 }}>{s.label}</div>
                <div style={{ fontSize:16, fontWeight:900, color:T.text }}>{s.value}</div>
              </div>
            ))}
          </div>
          <div style={{ fontSize:10, fontWeight:700, color:T.muted, letterSpacing:'0.12em', textTransform:'uppercase' }}>Purchase History</div>
          {!data.history?.length ? (
            <div style={{ color:T.muted, fontSize:13, padding:'20px 0', textAlign:'center' }}>No history yet</div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
              {data.history.map((h,i) => (
                <div key={i} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px 14px', background:T.surface, border:`1px solid ${T.border}`, borderRadius:10, fontSize:12 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <span style={{ fontSize:9, fontWeight:800, letterSpacing:'0.1em', textTransform:'uppercase', padding:'2px 7px', borderRadius:5, background: h.source==='opening'?'rgba(0,229,255,0.1)':'rgba(184,255,60,0.1)', color: h.source==='opening'?T.cyan:T.lime }}>
                      {h.source==='opening' ? 'Opening' : h.bill_number || 'Bill'}
                    </span>
                    <span style={{ color:T.muted }}>{h.date}</span>
                  </div>
                  <div style={{ textAlign:'right' }}>
                    <div style={{ color:T.text, fontWeight:600 }}>{h.qty} {data.unit} @ Rs {Number(h.unit_cost).toFixed(2)}</div>
                    <div style={{ color:T.pink, fontSize:11 }}>Rs {Number(h.total).toLocaleString()}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div style={{ display:'flex', justifyContent:'flex-end' }}>
            <Btn variant="ghost" onClick={onClose}>Close</Btn>
          </div>
        </div>
      )}
    </Modal>
  )
}