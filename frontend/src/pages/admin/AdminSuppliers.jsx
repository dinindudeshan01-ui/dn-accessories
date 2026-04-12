// src/pages/admin/AdminSuppliers.jsx

import { useState, useEffect } from 'react'
import adminApi from '../../lib/adminApi'
import {
  PageHeader, PageContent, Card, CardHeader, Table, Tr, Td,
  StatusPill, Btn, Input, Select, Spinner, Empty, Modal, ModalFooter, Tabs, tokens as T
} from '../../components/admin/AdminUI'

export default function AdminSuppliers() {
  const [suppliers, setSuppliers] = useState([])
  const [cogs, setCogs]           = useState([])
  const [loading, setLoading]     = useState(true)
  const [tab, setTab]             = useState('suppliers')
  const [modal, setModal]         = useState(false)
  const [cogsModal, setCogsModal] = useState(false)
  const [saving, setSaving]       = useState(false)

  const [sForm, setSForm] = useState({ name:'', category:'', contact:'', lead_days:3 })
  const [cForm, setCForm] = useState({ supplier_id:'', item_name:'', quantity:'', unit:'units', unit_cost:'', date:new Date().toISOString().split('T')[0] })

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    setLoading(true)
    try {
      const [s,c] = await Promise.all([adminApi.get('/finance/suppliers'), adminApi.get('/finance/cogs')])
      setSuppliers(s.data); setCogs(c.data)
    } finally { setLoading(false) }
  }

  async function addSupplier() {
    if (!sForm.name) return
    setSaving(true)
    try { await adminApi.post('/finance/suppliers', sForm); setSForm({ name:'', category:'', contact:'', lead_days:3 }); setModal(false); await loadAll() }
    finally { setSaving(false) }
  }

  async function addCogs() {
    if (!cForm.item_name || !cForm.quantity || !cForm.unit_cost) return
    setSaving(true)
    try { await adminApi.post('/finance/cogs', cForm); setCForm(f => ({...f, item_name:'', quantity:'', unit_cost:''})); setCogsModal(false); await loadAll() }
    finally { setSaving(false) }
  }

  const totalCogs = cogs.reduce((s,c) => s + c.total, 0)

  return (
    <>
      <PageHeader
        title="Suppliers & COGS"
        subtitle="Track supplier costs"
        action={
          <div style={{ display:'flex', gap:8 }}>
            <Btn variant="ghost" onClick={() => setCogsModal(true)}>+ COGS Entry</Btn>
            <Btn onClick={() => setModal(true)}>+ Add Supplier</Btn>
          </div>
        }
      />
      <PageContent>
        <Tabs
          tabs={[{ key:'suppliers', label:'Suppliers' }, { key:'cogs', label:'COGS Entries' }]}
          active={tab}
          onChange={setTab}
        />

        {loading ? <Spinner /> : tab === 'suppliers' ? (
          <Card>
            <CardHeader title={`Rs {suppliers.length} suppliers`} />
            <Table headers={['Supplier','Category','Contact','Lead Time','Total Paid','Status']}>
              {suppliers.length === 0
                ? <tr><td colSpan={6}><Empty message="No suppliers yet" /></td></tr>
                : suppliers.map(s => (
                  <Tr key={s.id}>
                    <Td style={{ fontWeight:600, color:T.text }}>{s.name}</Td>
                    <Td muted>{s.category}</Td>
                    <Td muted>{s.contact || '—'}</Td>
                    <Td muted>{s.lead_days} days</Td>
                    <Td pink>Rs {Number(s.total_paid).toFixed(2)}</Td>
                    <Td><StatusPill status={s.status} /></Td>
                  </Tr>
                ))}
            </Table>
          </Card>
        ) : (
          <Card>
            <CardHeader title={`Rs {cogs.length} entries — Total COGS: LKR Rs {totalCogs.toLocaleString()}`} />
            <Table headers={['Date','Item','Supplier','Qty','Unit','Unit Cost','Total']}>
              {cogs.length === 0
                ? <tr><td colSpan={7}><Empty message="No COGS entries yet" /></td></tr>
                : cogs.map(c => (
                  <Tr key={c.id}>
                    <Td muted>{c.date}</Td>
                    <Td style={{ fontWeight:600, color:T.text }}>{c.item_name}</Td>
                    <Td muted>{c.supplier_name || '—'}</Td>
                    <Td muted>{c.quantity}</Td>
                    <Td muted>{c.unit}</Td>
                    <Td muted>Rs {c.unit_cost.toFixed(2)}</Td>
                    <Td pink>Rs {c.total.toFixed(2)}</Td>
                  </Tr>
                ))}
            </Table>
          </Card>
        )}
      </PageContent>

      {modal && (
        <Modal title="Add Supplier" onClose={() => setModal(false)}>
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
            <Input label="Supplier Name" value={sForm.name} onChange={e => setSForm(f => ({...f, name:e.target.value}))} placeholder="e.g. Gem Traders PVT" />
            <Input label="Category" value={sForm.category} onChange={e => setSForm(f => ({...f, category:e.target.value}))} placeholder="e.g. Beads / Stones" />
            <Input label="Contact / WhatsApp" value={sForm.contact} onChange={e => setSForm(f => ({...f, contact:e.target.value}))} placeholder="+94 77..." />
            <Input label="Lead Time (days)" type="number" value={sForm.lead_days} onChange={e => setSForm(f => ({...f, lead_days:e.target.value}))} />
          </div>
          <ModalFooter onClose={() => setModal(false)} onSave={addSupplier} saving={saving} />
        </Modal>
      )}

      {cogsModal && (
        <Modal title="Add COGS Entry" onClose={() => setCogsModal(false)}>
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
            <Input label="Item Name" value={cForm.item_name} onChange={e => setCForm(f => ({...f, item_name:e.target.value}))} placeholder="e.g. Beads (Assorted)" />
            <Select label="Supplier" value={cForm.supplier_id} onChange={e => setCForm(f => ({...f, supplier_id:e.target.value}))}>
              <option value="">— No supplier —</option>
              {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </Select>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12 }}>
              <Input label="Quantity" type="number" value={cForm.quantity} onChange={e => setCForm(f => ({...f, quantity:e.target.value}))} placeholder="0" />
              <Input label="Unit" value={cForm.unit} onChange={e => setCForm(f => ({...f, unit:e.target.value}))} placeholder="units / m / kg" />
              <Input label="Unit Cost (Rs)" type="number" step="0.01" value={cForm.unit_cost} onChange={e => setCForm(f => ({...f, unit_cost:e.target.value}))} placeholder="0.00" />
            </div>
            {cForm.quantity && cForm.unit_cost && (
              <div style={{ padding:'10px 14px', background:'rgba(255,45,120,0.08)', borderRadius:9, fontSize:13, color:T.pink, fontWeight:700 }}>
                Total: Rs Rs {(parseFloat(cForm.quantity||0)*parseFloat(cForm.unit_cost||0)).toFixed(2)}
              </div>
            )}
            <Input label="Date" type="date" value={cForm.date} onChange={e => setCForm(f => ({...f, date:e.target.value}))} />
          </div>
          <ModalFooter onClose={() => setCogsModal(false)} onSave={addCogs} saving={saving} />
        </Modal>
      )}
    </>
  )
}