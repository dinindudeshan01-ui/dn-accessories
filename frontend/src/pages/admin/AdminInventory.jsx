// src/pages/admin/AdminInventory.jsx

import { useState, useEffect } from 'react'
import adminApi from '../../lib/adminApi'
import {
  PageHeader, PageContent, KpiGrid, KpiCard, Card, CardHeader,
  Table, Tr, Td, StatusPill, Btn, Spinner, ImgThumb, CatPill, tokens as T
} from '../../components/admin/AdminUI'

export default function AdminInventory() {
  const [products, setProducts] = useState([])
  const [loading, setLoading]   = useState(true)
  const [editing, setEditing]   = useState({})
  const [saving, setSaving]     = useState({})

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    try { const res = await adminApi.get('/products'); setProducts(res.data) }
    finally { setLoading(false) }
  }

  async function saveStock(id) {
    const val = editing[id]
    if (val === undefined || val === '') return
    setSaving(s => ({...s, [id]:true}))
    try {
      await adminApi.patch(`/products/${id}/stock`, { stock: parseInt(val) })
      await load()
      setEditing(e => { const n={...e}; delete n[id]; return n })
    } finally { setSaving(s => { const n={...s}; delete n[id]; return n }) }
  }

  const stockStatus   = s => s === 0 ? 'critical' : s <= 5 ? 'low' : 'ok'
  const totalUnits    = products.reduce((s,p) => s + p.stock, 0)
  const totalValue    = products.reduce((s,p) => s + (p.stock * p.price * 0.35), 0)
  const lowStockCount = products.filter(p => p.stock > 0 && p.stock <= 5).length
  const outOfStock    = products.filter(p => p.stock === 0).length

  return (
    <>
      <PageHeader title="Inventory" subtitle="Stock levels & valuation" action={<Btn onClick={load} variant="ghost">↻ Refresh</Btn>} />
      <PageContent>
        <KpiGrid>
          <KpiCard label="Total SKUs"      value={products.length} />
          <KpiCard label="Total Units"     value={totalUnits} />
          <KpiCard label="Est. Cost Value" value={`Rs ${totalValue.toLocaleString()}`} accent />
          <KpiCard label="Needs Reorder"   value={lowStockCount + outOfStock}
            change={lowStockCount + outOfStock > 0 ? `${outOfStock} out of stock` : 'All stocked'}
            changeUp={lowStockCount + outOfStock === 0}
          />
        </KpiGrid>

        <Card>
          <CardHeader title="Stock Levels" />
          {loading ? <Spinner /> : (
            <Table headers={['Product','Category','Price','In Stock','Status','Update']}>
              {products.map(p => {
                const isEditing = editing[p.id] !== undefined
                return (
                  <Tr key={p.id}>
                    <Td>
                      <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                        <ImgThumb src={p.image_url} size={36} />
                        <span style={{ fontWeight:600, color:T.text, fontSize:13 }}>{p.name}</span>
                      </div>
                    </Td>
                    <Td><CatPill label={p.category} /></Td>
                    <Td pink>${p.price.toFixed(2)}</Td>
                    <Td style={{ fontWeight:700, color: p.stock === 0 ? T.pink : p.stock <= 5 ? T.gold : T.text }}>
                      {p.stock}
                    </Td>
                    <Td><StatusPill status={stockStatus(p.stock)} /></Td>
                    <Td>
                      <div style={{ display:'flex', gap:6, alignItems:'center' }}>
                        <input
                          type="number"
                          className="dn-input"
                          value={isEditing ? editing[p.id] : p.stock}
                          onChange={e => setEditing(ed => ({...ed, [p.id]: e.target.value}))}
                          onFocus={() => setEditing(ed => ({...ed, [p.id]: String(p.stock)}))}
                          style={{ width:64, padding:'5px 8px', background: isEditing ? '#0f0f1a' : 'transparent', border:`1px solid ${isEditing ? T.pink : T.border}`, borderRadius:7, color:T.text, fontSize:12, outline:'none', fontFamily:'inherit' }}
                        />
                        {isEditing && (
                          <Btn size="sm" onClick={() => saveStock(p.id)} disabled={saving[p.id]}>
                            {saving[p.id] ? '…' : 'Save'}
                          </Btn>
                        )}
                      </div>
                    </Td>
                  </Tr>
                )
              })}
            </Table>
          )}
        </Card>

        {products.filter(p => p.stock <= 5).length > 0 && (
          <Card style={{ border:`1px solid rgba(255,197,61,0.2)`, background:'rgba(255,197,61,0.03)' }}>
            <CardHeader title="⚠ Reorder Alerts" />
            <div style={{ padding:'12px 20px' }}>
              {products.filter(p => p.stock <= 5).map(p => (
                <div key={p.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 0', borderBottom:`1px solid ${T.border}`, fontSize:13 }}>
                  <span style={{ color:T.text }}>{p.name}</span>
                  <span style={{ color: p.stock === 0 ? T.pink : T.gold, fontWeight:700 }}>
                    {p.stock === 0 ? 'OUT OF STOCK' : `Only ${p.stock} left`}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        )}

      </PageContent>
    </>
  )
}