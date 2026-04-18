// src/pages/admin/AdminDashboard.jsx — Dashboard 2.0

import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAdmin } from '../../context/AdminContext'
import adminApi from '../../lib/adminApi'
import {
  PageHeader, PageContent, KpiGrid, KpiCard,
  Card, CardHeader, Table, Tr, Td, StatusPill, Spinner, LiveDot, tokens as T
} from '../../components/admin/AdminUI'

export default function AdminDashboard() {
  const { admin }           = useAdmin()
  const navigate            = useNavigate()
  const [stats, setStats]   = useState(null)
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      adminApi.get('/orders/stats'),
      adminApi.get('/orders?limit=6'),
    ]).then(([s, o]) => {
      setStats(s.data)
      setOrders(o.data)
    }).finally(() => setLoading(false))
  }, [])

  const today = new Date().toLocaleDateString('en-US', { weekday:'long', month:'long', day:'numeric' })

  if (loading) return <Spinner />

  // KPI computations
  const todayRev    = stats?.today?.revenue    || 0
  const lastWeekRev = stats?.today?.lastWeekRev || 0
  const wowPct      = lastWeekRev > 0
    ? (((todayRev - lastWeekRev) / lastWeekRev) * 100).toFixed(1)
    : todayRev > 0 ? '∞' : '0'
  const wowUp       = todayRev >= lastWeekRev
  const pendingCount = stats?.pending || 0
  const overdueAmt   = stats?.overdueAP?.amount || 0
  const overdueCount = stats?.overdueAP?.count  || 0
  const lowStockCnt  = stats?.lowStock || 0
  const topProd      = stats?.topProduct

  return (
    <>
      <PageHeader title="Dashboard" subtitle={today} action={<LiveDot />} />
      <PageContent>

        {/* ── Alert bar for reorder / overdue ── */}
        {(lowStockCnt > 0 || overdueCount > 0) && (
          <div style={{
            display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap'
          }}>
            {lowStockCnt > 0 && (
              <AlertChip
                color={T.gold}
                icon="⚠"
                label={`${lowStockCnt} material${lowStockCnt > 1 ? 's' : ''} at or below reorder level`}
                onClick={() => navigate('/admin/materials')}
              />
            )}
            {overdueCount > 0 && (
              <AlertChip
                color="#f87171"
                icon="⚡"
                label={`${overdueCount} overdue bill${overdueCount > 1 ? 's' : ''} — Rs ${overdueAmt.toLocaleString()} outstanding`}
                onClick={() => navigate('/admin/bills')}
              />
            )}
          </div>
        )}

        {/* ── KPI Row ── */}
        <KpiGrid>
          {/* Today's revenue */}
          <KpiCard
            label="Today's Revenue"
            value={`Rs ${todayRev.toLocaleString()}`}
            change={`${wowUp ? '▲' : '▼'} ${wowPct}% vs last week`}
            changeUp={wowUp}
            accent
          />
          {/* Pending orders */}
          <KpiCard
            label="Pending Orders"
            value={pendingCount}
            change={pendingCount > 0 ? 'Needs action' : 'All clear'}
            changeUp={pendingCount === 0}
          />
          {/* Overdue AP */}
          <KpiCard
            label="Overdue AP"
            value={overdueCount > 0 ? `${overdueCount} bills` : 'None'}
            change={overdueCount > 0 ? `Rs ${overdueAmt.toLocaleString()}` : 'All paid'}
            changeUp={overdueCount === 0}
          />
          {/* Low stock */}
          <KpiCard
            label="Low Stock Alerts"
            value={lowStockCnt}
            change={lowStockCnt > 0 ? 'Check materials' : 'All stocked'}
            changeUp={lowStockCnt === 0}
          />
          {/* Top product today */}
          <KpiCard
            label="Top Product Today"
            value={topProd ? `×${topProd.qty}` : '—'}
            change={topProd?.product_name || 'No sales yet'}
            changeUp={!!topProd}
          />
          {/* All-time revenue */}
          <KpiCard
            label="All-Time Revenue"
            value={`Rs ${(stats?.total?.revenue || 0).toLocaleString()}`}
            change={`${stats?.total?.count || 0} orders`}
            changeUp
          />
        </KpiGrid>

        {/* ── Charts row ── */}
        <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr', gap:16, marginBottom:16 }}>
          {/* 30-day line chart */}
          <Card>
            <CardHeader title="Revenue — Last 30 Days" />
            <div style={{ padding:'20px 18px 12px' }}>
              <LineChart data={stats?.daily30 || []} />
            </div>
          </Card>

          {/* This week bar */}
          <Card>
            <CardHeader title="This Week" />
            <div style={{ padding:'20px 18px' }}>
              <BarChart data={stats?.daily7 || []} />
            </div>
          </Card>
        </div>

        {/* ── Recent Orders ── */}
        <Card>
          <CardHeader title="Recent Orders" />
          <Table headers={['Order', 'Customer', 'Items', 'Total', 'Status', 'Date']}>
            {orders.map(o => (
              <Tr key={o.id} onClick={() => navigate('/admin/orders')} style={{ cursor:'pointer' }}>
                <Td pink>#{String(o.id).padStart(4,'0')}</Td>
                <Td>{o.full_name || '—'}</Td>
                <Td muted>{Array.isArray(o.items) ? o.items.length : 0} item{o.items?.length !== 1 ? 's' : ''}</Td>
                <Td>Rs {Number(o.total).toLocaleString()}</Td>
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

// ── Alert chip ────────────────────────────────────────────────
function AlertChip({ color, icon, label, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer',
        padding: '9px 16px', borderRadius: 10,
        background: `${color}18`, border: `1px solid ${color}40`,
        fontSize: 13, fontWeight: 600, color,
        transition: 'all 0.15s',
      }}
      onMouseEnter={e => e.currentTarget.style.background = `${color}28`}
      onMouseLeave={e => e.currentTarget.style.background = `${color}18`}
    >
      <span style={{ fontSize: 15 }}>{icon}</span>
      {label}
      <span style={{ marginLeft: 4, fontSize: 11, opacity: 0.7 }}>→</span>
    </div>
  )
}

// ── 30-day Chart.js line chart ────────────────────────────────
function LineChart({ data }) {
  const canvasRef = useRef(null)
  const chartRef  = useRef(null)

  useEffect(() => {
    if (!canvasRef.current) return

    // Build full 30-day series filling gaps with 0
    const days = []
    for (let i = 29; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const key = d.toISOString().split('T')[0]
      const found = data.find(r => r.day === key)
      days.push({ day: key, revenue: found?.revenue || 0 })
    }

    const labels   = days.map(d => {
      const dt = new Date(d.day + 'T00:00:00')
      return dt.toLocaleDateString('en-US', { month:'short', day:'numeric' })
    })
    const revenues = days.map(d => Number(d.revenue))

    // Destroy previous instance
    if (chartRef.current) { chartRef.current.destroy(); chartRef.current = null }

    // Dynamic import Chart.js from CDN-like inline via script tag
    if (!window.Chart) {
      const script = document.createElement('script')
      script.src = 'https://cdn.jsdelivr.net/npm/chart.js@4.4.2/dist/chart.umd.min.js'
      script.onload = () => buildChart(labels, revenues)
      document.head.appendChild(script)
    } else {
      buildChart(labels, revenues)
    }

    function buildChart(labels, revenues) {
      const ctx = canvasRef.current?.getContext('2d')
      if (!ctx) return

      const grad = ctx.createLinearGradient(0, 0, 0, 120)
      grad.addColorStop(0, 'rgba(255,45,120,0.35)')
      grad.addColorStop(1, 'rgba(255,45,120,0)')

      chartRef.current = new window.Chart(ctx, {
        type: 'line',
        data: {
          labels,
          datasets: [{
            data: revenues,
            borderColor: '#ff2d78',
            backgroundColor: grad,
            borderWidth: 2,
            pointRadius: 0,
            pointHoverRadius: 5,
            pointHoverBackgroundColor: '#ff2d78',
            tension: 0.4,
            fill: true,
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: '#13131f',
              borderColor: 'rgba(255,45,120,0.3)',
              borderWidth: 1,
              titleColor: '#6b6b85',
              bodyColor: '#f0f0f8',
              callbacks: {
                label: ctx => ` Rs ${Number(ctx.raw).toLocaleString()}`
              }
            }
          },
          scales: {
            x: {
              grid: { color: 'rgba(255,255,255,0.04)' },
              ticks: {
                color: '#6b6b85', font: { size: 10 },
                maxTicksLimit: 8,
                maxRotation: 0,
              },
              border: { color: 'rgba(255,255,255,0.07)' }
            },
            y: {
              grid: { color: 'rgba(255,255,255,0.04)' },
              ticks: {
                color: '#6b6b85', font: { size: 10 },
                callback: v => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v
              },
              border: { color: 'rgba(255,255,255,0.07)' }
            }
          }
        }
      })
    }

    return () => { if (chartRef.current) { chartRef.current.destroy(); chartRef.current = null } }
  }, [data])

  if (!data.length) return (
    <div style={{ height: 110, display:'flex', alignItems:'center', justifyContent:'center', color: T.muted, fontSize: 13 }}>
      No revenue data yet
    </div>
  )

  return <div style={{ height: 120, position:'relative' }}><canvas ref={canvasRef} /></div>
}

// ── 7-day bar chart (existing) ────────────────────────────────
function BarChart({ data }) {
  if (!data.length) return (
    <div style={{ color:T.muted, fontSize:13, textAlign:'center', padding:'20px 0' }}>No data yet</div>
  )

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
          <div
            title={`Rs ${Number(d.revenue).toLocaleString()}`}
            style={{
              width:'100%', borderRadius:'4px 4px 0 0',
              background: d.revenue > 0
                ? `linear-gradient(to top, ${T.pink}, ${T.purple})`
                : T.faint,
              height:`${Math.max(4, (d.revenue / max) * 76)}px`,
              transition:'height 0.5s ease',
              boxShadow: d.revenue > 0 ? `0 0 12px rgba(255,45,120,0.3)` : 'none',
            }}
          />
          <span style={{ fontSize:9, color:T.muted, fontWeight:700 }}>{d.label}</span>
        </div>
      ))}
    </div>
  )
}