import React, { useState, useEffect } from 'react'
import adminApi from '../../lib/adminApi'
import {
  PageHeader, PageContent, KpiGrid, KpiCard,
  Card, CardHeader, Table, Tr, Td, ExpandedRow,
  Btn, Input, Select, Spinner, Empty,
  Modal, ModalFooter, tokens as T
} from '../../components/admin/AdminUI'

export default function AdminSuppliers() {
  const [suppliers, setSuppliers] = useState([])
  const [loading,   setLoading]   = useState(true)
  const [modal,     setModal]     = useState(null)   // null | 'add' | supplier obj
  const [expanded,  setExpanded]  = useState(null)
  const [saving,    setSaving]    = useState(false)
  const [detail,    setDetail]    = useState({})     // { [id]: full supplier data }
  const [form, setForm] = useState({
    name:'', category:'', contact:'', email:'', address:'', lead_days:'3', opening_balance:'', notes:''
  })

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    try { const res = await adminApi.get('/suppliers'); setSuppliers(res.data) }
    finally { setLoading(false) }
  }

  async function loadDetail(id) {
    if (detail[id]) return // already loaded
    try {
      const res = await adminApi.get(`/suppliers/${id}`)
      setDetail(d => ({ ...d, [id]: res.data }))
    } catch {}
  }

  function openAdd() {
    setForm({ name:'', category:'', contact:'', email:'', address:'', lead_days:'3', opening_balance:'', notes:'' })
    setModal('add')
  }

  function openEdit(s) {
    setForm({
      name:            s.name,
      category:        s.category        || '',
      contact:         s.contact         || '',
      email:           s.email           || '',
      address:         s.address         || '',
      lead_days:       String(s.lead_days || 3),
      opening_balance: String(s.opening_balance || ''),
      notes:           s.notes           || '',
    })
    setModal(s)
  }

  async function save() {
    if (!form.name) return
    setSaving(true)
    try {
      modal === 'add'
        ? await adminApi.post('/suppliers', form)
        : await adminApi.put(`/suppliers/${modal.id}`, { ...form, status: modal.status || 'active' })
      await load(); setModal(null)
    } finally { setSaving(false) }
  }

  async function deleteSupplier(id) {
    if (!confirm('Delete this supplier?')) return
    try { await adminApi.delete(`/suppliers/${id}`); await load() }
    catch (e) { alert(e.response?.data?.error || 'Cannot delete this supplier') }
  }

  async function toggleExpand(id) {
    if (expanded === id) { setExpanded(null); return }
    setExpanded(id)
    await loadDetail(id)
  }

  // ── KPIs ─────────────────────────────────────────────────────
  const totalBilled      = suppliers.reduce((s, x) => s + (x.total_billed || 0), 0)
  const totalPaid        = suppliers.reduce((s, x) => s + (x.total_paid   || 0), 0)
  const totalOutstanding = suppliers.reduce((s, x) => s + (x.outstanding  || 0), 0)
  const activeCount      = suppliers.filter(s => s.status === 'active').length

  const billStatusCfg = {
    unpaid:  { label:'Unpaid',  color:T.pink, bg:'rgba(255,45,120,0.12)'  },
    partial: { label:'Partial', color:T.gold, bg:'rgba(255,197,61,0.14)'  },
    paid:    { label:'Paid',    color:T.lime, bg:'rgba(184,255,60,0.12)'  },
  }

  return (
    <>
      <PageHeader
        title="Suppliers"
        subtitle="Supplier center"
        action={<Btn onClick={openAdd}>+ Add Supplier</Btn>}
      />
      <PageContent>

        <KpiGrid>
          <KpiCard label="Active Suppliers" value={activeCount} />
          <KpiCard label="Total Billed"     value={`Rs ${Math.round(totalBilled).toLocaleString()}`} accent />
          <KpiCard label="Total Paid"       value={`Rs ${Math.round(totalPaid).toLocaleString()}`} />
          <KpiCard label="Outstanding"      value={`Rs ${Math.round(totalOutstanding).toLocaleString()}`}
            change={totalOutstanding > 0 ? 'Unpaid balance' : 'All clear'}
            changeUp={totalOutstanding === 0}
          />
        </KpiGrid>

        <Card>
          <CardHeader title={`${suppliers.length} suppliers`} />
          {loading ? <Spinner /> : suppliers.length === 0 ? (
            <Empty message="No suppliers yet — add your first supplier" />
          ) : (
            <Table headers={['Supplier', 'Contact', 'Opening Bal', 'Total Billed', 'Total Paid', 'Outstanding', 'Bills', 'Actions']}>
              {suppliers.map(s => {
                const outstanding = s.outstanding || 0
                return (
                  <React.Fragment key={s.id}>
                    <Tr onClick={() => toggleExpand(s.id)}>
                      <Td>
                        <div style={{ fontWeight:700, color:T.text }}>{s.name}</div>
                        {s.category && <div style={{ fontSize:11, color:T.muted, marginTop:2 }}>{s.category}</div>}
                      </Td>
                      <Td>
                        <div style={{ fontSize:12, color:T.text }}>{s.contact || '—'}</div>
                        {s.email && <div style={{ fontSize:11, color:T.muted }}>{s.email}</div>}
                      </Td>
                      <Td muted>Rs {Number(s.opening_balance || 0).toLocaleString()}</Td>
                      <Td style={{ color:T.text, fontWeight:600 }}>Rs {Number(s.total_billed || 0).toLocaleString()}</Td>
                      <Td style={{ color:T.lime }}>Rs {Number(s.total_paid || 0).toLocaleString()}</Td>
                      <Td>
                        <span style={{ fontWeight:700, color: outstanding > 0 ? T.pink : T.lime }}>
                          Rs {Number(outstanding).toLocaleString()}
                        </span>
                      </Td>
                      <Td muted>{s.bill_count || 0} {s.unpaid_bills > 0 && <span style={{ color:T.pink, fontSize:11 }}>({s.unpaid_bills} unpaid)</span>}</Td>
                      <Td onClick={e => e.stopPropagation()}>
                        <div style={{ display:'flex', gap:6 }}>
                          <Btn size="sm" variant="ghost" onClick={() => openEdit(s)}>Edit</Btn>
                          <Btn size="sm" variant="danger" onClick={() => deleteSupplier(s.id)}>Del</Btn>
                        </div>
                      </Td>
                    </Tr>

                    {/* Expanded: bill history */}
                    {expanded === s.id && (
                      <ExpandedRow colSpan={8}>
                        <SupplierDetail data={detail[s.id]} billStatusCfg={billStatusCfg} />
                      </ExpandedRow>
                    )}
                  </React.Fragment>
                )
              })}
            </Table>
          )}
        </Card>
      </PageContent>

      {/* Add / Edit Modal */}
      {modal && (
        <Modal title={modal === 'add' ? 'Add Supplier' : `Edit — ${modal.name}`} onClose={() => setModal(null)} width={520}>
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
            <Input label="Supplier Name *" value={form.name} onChange={e => setForm(f=>({...f,name:e.target.value}))} placeholder="e.g. Gem Palace" />

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
              <Input label="Category" value={form.category} onChange={e => setForm(f=>({...f,category:e.target.value}))} placeholder="e.g. Beads & Gems" />
              <Input label="Lead Days" type="number" value={form.lead_days} onChange={e => setForm(f=>({...f,lead_days:e.target.value}))} placeholder="3" />
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
              <Input label="Phone" value={form.contact} onChange={e => setForm(f=>({...f,contact:e.target.value}))} placeholder="+94 77 000 0000" />
              <Input label="Email" value={form.email} onChange={e => setForm(f=>({...f,email:e.target.value}))} placeholder="supplier@email.com" />
            </div>

            <Input label="Address" value={form.address} onChange={e => setForm(f=>({...f,address:e.target.value}))} placeholder="Supplier address" />

            <Input
              label="Opening Balance (Rs)"
              type="number"
              step="0.01"
              value={form.opening_balance}
              onChange={e => setForm(f=>({...f,opening_balance:e.target.value}))}
              placeholder="Amount already owed before using this system"
            />

            <div>
              <label style={{ display:'block', fontSize:10, fontWeight:700, color:T.muted, letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:6 }}>Notes</label>
              <textarea rows={2} value={form.notes} onChange={e => setForm(f=>({...f,notes:e.target.value}))} placeholder="Optional"
                style={{ width:'100%', padding:'9px 13px', background:T.surface, border:`1px solid ${T.border}`, borderRadius:10, color:T.text, fontSize:13, fontFamily:T.font, resize:'vertical', outline:'none', boxSizing:'border-box' }} />
            </div>
          </div>
          <ModalFooter onClose={() => setModal(null)} onSave={save} saving={saving} saveLabel="Save Supplier" />
        </Modal>
      )}
    </>
  )
}

// ── Supplier Detail (expanded row) ────────────────────────────
function SupplierDetail({ data, billStatusCfg }) {
  if (!data) return (
    <div style={{ padding:20, display:'flex', justifyContent:'center' }}>
      <div style={{ width:24, height:24, border:`2px solid rgba(255,255,255,0.07)`, borderTop:`2px solid ${T.pink}`, borderRadius:'50%', animation:'dn-spin 0.7s linear infinite' }} />
    </div>
  )

  return (
    <div style={{ display:'grid', gridTemplateColumns:'1fr 2fr', gap:24, padding:'8px 4px' }}>

      {/* Supplier info */}
      <div>
        <SLabel>Supplier Details</SLabel>
        <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
          {[
            { label:'Category',    value: data.category    },
            { label:'Phone',       value: data.contact     },
            { label:'Email',       value: data.email       },
            { label:'Address',     value: data.address     },
            { label:'Lead Days',   value: data.lead_days ? `${data.lead_days} days` : null },
            { label:'Notes',       value: data.notes       },
          ].filter(r => r.value).map((r, i) => (
            <div key={i} style={{ display:'flex', justifyContent:'space-between', fontSize:12, padding:'5px 0', borderBottom:`1px solid ${T.border}` }}>
              <span style={{ color:T.muted }}>{r.label}</span>
              <span style={{ color:T.text, fontWeight:600, textAlign:'right', maxWidth:200 }}>{r.value}</span>
            </div>
          ))}
        </div>

        {/* Balance summary */}
        <div style={{ marginTop:16 }}>
          <SLabel>Balance Summary</SLabel>
          {[
            { label:'Opening Balance', value: data.opening_balance || 0,  color: T.text },
            { label:'Total Billed',    value: data.total_billed    || 0,  color: T.text },
            { label:'Total Paid',      value: data.total_paid      || 0,  color: T.lime },
            { label:'Outstanding',     value: data.outstanding     || 0,  color: (data.outstanding||0) > 0 ? T.pink : T.lime },
          ].map((r, i) => (
            <div key={i} style={{ display:'flex', justifyContent:'space-between', fontSize:13, padding:'7px 0', borderBottom:`1px solid ${T.border}` }}>
              <span style={{ color:T.muted }}>{r.label}</span>
              <span style={{ color:r.color, fontWeight:700 }}>Rs {Number(r.value).toLocaleString()}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Bill history */}
      <div>
        <SLabel>Bill History ({data.bills?.length || 0} bills)</SLabel>
        {!data.bills?.length ? (
          <div style={{ color:T.muted, fontSize:12, padding:'16px 0' }}>No bills yet</div>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
            {data.bills.map((b, i) => {
              const cfg = billStatusCfg[b.status] || billStatusCfg.unpaid
              return (
                <div key={i} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 14px', background:T.surface, border:`1px solid ${T.border}`, borderRadius:10, fontSize:12 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                    <span style={{ fontFamily:'monospace', color:T.gold, fontWeight:700 }}>{b.bill_number}</span>
                    <span style={{ color:T.muted }}>{b.bill_date}</span>
                    {b.due_date && <span style={{ color:T.muted, fontSize:11 }}>Due: {b.due_date}</span>}
                  </div>
                  <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                    <div style={{ textAlign:'right' }}>
                      <div style={{ color:T.text, fontWeight:700 }}>Rs {Number(b.total).toLocaleString()}</div>
                      {b.outstanding > 0 && <div style={{ color:T.pink, fontSize:11 }}>Owes Rs {Number(b.outstanding).toLocaleString()}</div>}
                    </div>
                    <span style={{ fontSize:9, fontWeight:800, padding:'3px 9px', borderRadius:99, background:cfg.bg, color:cfg.color, letterSpacing:'0.08em', textTransform:'uppercase' }}>
                      {cfg.label}
                    </span>
                    {b.bill_image_url && (
                      <a href={b.bill_image_url} target="_blank" rel="noreferrer" style={{ color:T.cyan, fontSize:11, fontWeight:700, textDecoration:'none' }} onClick={e => e.stopPropagation()}>
                        📄 Bill
                      </a>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

    </div>
  )
}

function SLabel({ children }) {
  return <div style={{ fontSize:10, fontWeight:700, color:T.muted, letterSpacing:'0.12em', textTransform:'uppercase', marginBottom:10 }}>{children}</div>
}