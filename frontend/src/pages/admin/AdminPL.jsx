// src/pages/admin/AdminPL.jsx

import { useState, useEffect } from 'react'
import adminApi from '../../lib/adminApi'
import {
  PageHeader, PageContent, KpiGrid, KpiCard, Card, Select, Spinner,
  PLSection, PLRow, PLTotal, NetProfitRow, tokens as T
} from '../../components/admin/AdminUI'

export default function AdminPL() {
  const [data, setData]       = useState(null)
  const [month, setMonth]     = useState(new Date().toISOString().slice(0,7))
  const [loading, setLoading] = useState(true)

  useEffect(() => { load() }, [month])

  async function load() {
    setLoading(true)
    try { const res = await adminApi.get('/finance/pl', { params:{ month } }); setData(res.data) }
    finally { setLoading(false) }
  }

  const months = Array.from({length:12},(_,i) => { const d=new Date(); d.setMonth(d.getMonth()-i); return d.toISOString().slice(0,7) })

  return (
    <>
      <PageHeader
        title="Profit & Loss"
        subtitle="Income statement"
        action={
          <Select value={month} onChange={e => setMonth(e.target.value)} style={{ width:'auto', padding:'7px 12px', fontSize:12 }}>
            {months.map(m => <option key={m} value={m}>{new Date(m+'-01').toLocaleDateString('en-US',{year:'numeric',month:'long'})}</option>)}
          </Select>
        }
      />
      <PageContent>
        {loading || !data ? <Spinner /> : (
          <>
            <KpiGrid>
              <KpiCard label="Gross Revenue" value={`LKR ${data.revenue.toLocaleString()}`} accent />
              <KpiCard label="Cost of Goods"  value={`LKR ${data.cogs.toLocaleString()}`} />
              <KpiCard label="Gross Profit"   value={`LKR ${data.grossProfit.toLocaleString()}`}
                changeUp={data.grossProfit > 0}
                change={data.revenue > 0 ? `${((data.grossProfit/data.revenue)*100).toFixed(0)}% margin` : ''}
              />
              <KpiCard label="Net Profit"     value={`LKR ${data.netProfit.toLocaleString()}`}
                changeUp={data.netProfit > 0}
                change={data.revenue > 0 ? `${((data.netProfit/data.revenue)*100).toFixed(0)}% margin` : ''}
              />
            </KpiGrid>

            <Card>
              <div style={{ padding:'16px 20px', borderBottom:`1px solid ${T.border}`, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <span style={{ fontSize:14, fontWeight:700, color:T.text }}>Income Statement</span>
                <span style={{ fontSize:11, color:T.muted }}>
                  {new Date(month+'-01').toLocaleDateString('en-US',{year:'numeric',month:'long'})}
                </span>
              </div>

              <PLSection title="INCOME" />
              <PLRow label="Product Sales" value={data.revenue} positive />
              <PLTotal label="Total Income" value={data.revenue} />

              <PLSection title="COST OF GOODS SOLD" />
              <PLRow label="Supplier / Material Costs" value={-data.cogs} />
              <PLTotal label="Total COGS" value={-data.cogs} />

              <PLSection title="OPERATING EXPENSES" />
              {data.expenses.length === 0
                ? <PLRow label="No expenses recorded" value={0} muted />
                : data.expenses.map((e,i) => <PLRow key={i} label={e.category} value={-e.total} />)
              }
              <PLTotal label="Total OpEx" value={-data.totalExpenses} />

              <NetProfitRow value={data.netProfit} />
            </Card>
          </>
        )}
      </PageContent>
    </>
  )
}