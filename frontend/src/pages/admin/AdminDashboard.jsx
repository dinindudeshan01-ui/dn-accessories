// src/pages/admin/AdminDashboard.jsx

import { useState, useEffect } from 'react'
import { useAdmin } from '../../context/AdminContext'
import adminApi from '../../lib/adminApi'
import {
  PageHeader, PageContent, KpiGrid, KpiCard,
  Card, CardHeader, Table, Tr, Td, StatusPill, Spinner, LiveDot, tokens as T
} from '../../components/admin/AdminUI'

export default function AdminDashboard() {
  const { admin } = useAdmin()
  const [stats, setStats]       = useState(null)
  const [orders, setOrders]     = useState([])
  const [products, setProducts] = useState([])
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    Promise.all([
      adminApi.get('/orders/stats'),
      adminApi.get('/orders?limit=6'),
      adminApi.get('/products'),
    ]).then(([s, o, p]) => {
      setStats(s.data)
      setOrders(o.data)
      setProducts(p.data)
    }).finally(() => setLoading(false))
  }, [])

  const revenue    = stats?.total?.revenue || 0
  const orderCount = stats?.total?.count   || 0
  const lowStock   = products.filter(p => p.stock > 0 && p.stock <= 5).length
  const outOfStock = products.filter(p => p.stock === 0).length
  const today      = new Date().toLocaleDateString('en-US', { weekday:'long', month:'long', day:'numeric' })

  if (loading) return <Spinner />

  return (
    <>
      <PageHeader
        title="Dashboard"
        subtitle={today}
        action={<LiveDot />}
      />
      <PageContent>

        <KpiGrid>
          <KpiCard label="Total Revenue"  value={`Rs ${revenue.toLocaleString()}`} accent />
          <KpiCard label="Total Orders"   value={orderCount} />
          <KpiCard label="Products"       value={products.length} />
          <KpiCard label="Needs Reorder"  value={lowStock + outOfStock}
            change={lowStock + outOfStock > 0 ? 'Items need attention' : 'All stocked'}
            changeUp={lowStock + outOfStock === 0}
          />
        </KpiGrid>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:16 }}>
          <Card>
            <CardHeader title="Sales — Last 7 Days" />
            <div style={{ padding:'20px 18px' }}>
              <BarChart data={stats?.daily7 || []} />
            </div>
          </Card>

          <Card>
            <CardHeader title="Top Products" />
            <Table headers={['Product', 'Stock', 'Price']}>
              {products.slice(0,5).map(p => (
                <Tr key={p.id}>
                  <Td>{p.name}</Td>
                  <Td muted>{p.stock}</Td>
                  <Td pink>${p.price.toFixed(2)}</Td>
                </Tr>
              ))}
            </Table>
          </Card>
        </div>

        <Card>
          <CardHeader title="Recent Orders" />
          <Table headers={['Order', 'Items', 'Total', 'Status', 'Date']}>
            {orders.map(o => (
              <Tr key={o.id}>
                <Td pink>#{String(o.id).padStart(4,'0')}</Td>
                <Td muted>{o.items?.length || 0} item{o.items?.length !== 1 ? 's' : ''}</Td>
                <Td>${o.total.toFixed(2)}</Td>
                <Td><StatusPill status={o.status} /></Td>
                <Td muted>{new Date(o.created_at).toLocaleDateString()}</Td>
              </Tr>
            ))}
          </Table>
        </Card>

      </PageContent>
    </>
  )
}

function BarChart({ data }) {
  if (!data.length) return <div style={{ color:T.muted, fontSize:13, textAlign:'center', padding:'20px 0' }}>No data yet</div>

  const max  = Math.max(...data.map(d => d.revenue || 0), 1)
  const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']

  const filled = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i)
    const key   = d.toISOString().split('T')[0]
    const found = data.find(r => r.day === key)
    filled.push({ day: key, label: days[d.getDay()], revenue: found?.revenue || 0 })
  }

  return (
    <div style={{ display:'flex', alignItems:'flex-end', gap:6, height:90 }}>
      {filled.map((d, i) => (
        <div key={i} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:6 }}>
          <div style={{
            width:'100%', borderRadius:'4px 4px 0 0',
            background: d.revenue > 0
              ? `linear-gradient(to top, ${T.pink}, ${T.purple})`
              : T.faint,
            height:`${Math.max(4, (d.revenue / max) * 76)}px`,
            transition:'height 0.5s ease',
            boxShadow: d.revenue > 0 ? `0 0 12px rgba(255,45,120,0.3)` : 'none',
          }} />
          <span style={{ fontSize:9, color:T.muted, fontWeight:700 }}>{d.label}</span>
        </div>
      ))}
    </div>
  )
}