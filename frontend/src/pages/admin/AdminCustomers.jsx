// src/pages/admin/AdminCustomers.jsx — v2: LTV + VIP

import { useState, useEffect } from 'react'
import adminApi from '../../lib/adminApi'
import {
  PageHeader, PageContent, KpiGrid, KpiCard, Card, CardHeader,
  Table, Tr, Td, Btn, Spinner, tokens as T
} from '../../components/admin/AdminUI'

function formatRef(o) {
  if (o.reference) return o.reference
  const year = new Date(o.created_at).getFullYear()
  return `DN-${year}-${String(o.id).padStart(5, '0')}`
}

function StatusPill({ status }) {
  const map = {
    pending:   { bg: 'rgba(255,197,61,0.15)',  color: '#ffc53d' },
    paid:      { bg: 'rgba(22,163,74,0.15)',   color: '#4ade80' },
    shipped:   { bg: 'rgba(59,130,246,0.15)',  color: '#60a5fa' },
    refunded:  { bg: 'rgba(245,158,11,0.15)',  color: '#fbbf24' },
    cancelled: { bg: 'rgba(239,68,68,0.15)',   color: '#f87171' },
  }
  const s = map[status] || { bg: 'rgba(255,255,255,0.08)', color: T.muted }
  return (
    <span style={{
      padding: '3px 10px', borderRadius: 999, fontSize: 11, fontWeight: 700,
      background: s.bg, color: s.color, textTransform: 'uppercase', letterSpacing: '0.06em'
    }}>{status}</span>
  )
}

export default function AdminCustomers() {
  const [customers, setCustomers] = useState([])
  const [stats,     setStats]     = useState(null)
  const [loading,   setLoading]   = useState(true)
  const [search,    setSearch]    = useState('')
  const [expanded,  setExpanded]  = useState(null)
  const [sortBy,    setSortBy]    = useState('ltv') // ltv | orders | avg | recent

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    try {
      const [c, s] = await Promise.all([
        adminApi.get('/customers'),
        adminApi.get('/customers/stats'),
      ])
      setCustomers(c.data)
      setStats(s.data)
    } finally { setLoading(false) }
  }

  const filtered = customers
    .filter(c =>
      c.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      c.nic?.toLowerCase().includes(search.toLowerCase()) ||
      c.phone1?.includes(search) ||
      c.city?.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => {
      if (sortBy === 'ltv')    return b.total_spent - a.total_spent
      if (sortBy === 'orders') return b.order_count - a.order_count
      if (sortBy === 'avg')    return (b.avg_order_value || 0) - (a.avg_order_value || 0)
      if (sortBy === 'recent') return new Date(b.last_order) - new Date(a.last_order)
      return 0
    })

  return (
    <>
      <PageHeader title="Customers" subtitle="Lifetime value & order history" />
      <PageContent>

        <KpiGrid>
          <KpiCard label="Total Customers"  value={stats?.total   ?? '—'} color={T.pink} />
          <KpiCard label="Repeat Customers" value={stats?.repeat  ?? '—'} color={T.cyan} />
          <KpiCard label="VIP Customers"    value={stats?.vipCount ?? '—'} color={T.gold} />
          <KpiCard
            label="Top Spender"
            value={stats?.topSpend ? `Rs ${Number(stats.topSpend.spent).toLocaleString()}` : '—'}
            change={stats?.topSpend?.full_name}
            changeUp
          />
        </KpiGrid>

        {/* Search + sort */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
          <input
            className="dn-input"
            placeholder="Search by name, NIC, phone or city…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              flex: 1, minWidth: 220, maxWidth: 380,
              background: T.card, border: `1px solid ${T.border}`,
              borderRadius: 10, padding: '10px 16px',
              color: T.text, fontSize: 13
            }}
          />
          <div style={{ display: 'flex', gap: 6 }}>
            {[
              { v: 'ltv',    l: 'Sort: LTV' },
              { v: 'orders', l: 'Sort: Orders' },
              { v: 'avg',    l: 'Sort: Avg Order' },
              { v: 'recent', l: 'Sort: Recent' },
            ].map(({ v, l }) => (
              <button key={v} onClick={() => setSortBy(v)} style={{
                padding: '8px 14px', borderRadius: 9, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700,
                background: sortBy === v ? T.pink : T.card,
                color:      sortBy === v ? '#fff'  : T.muted,
                transition: 'all 0.15s',
              }}>{l}</button>
            ))}
          </div>
        </div>

        <Card>
          <CardHeader title={`${filtered.length} Customer${filtered.length !== 1 ? 's' : ''}`} sub="Grouped by NIC" />

          {loading ? (
            <div style={{ padding: 60, textAlign: 'center' }}><Spinner /></div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: 60, textAlign: 'center', color: T.muted, fontSize: 13 }}>
              {search ? 'No customers match your search.' : 'No orders yet — customers appear here automatically.'}
            </div>
          ) : (
            <Table headers={['Customer', 'NIC', 'Contact', 'City', 'Orders', 'Avg Order', 'Total LTV', 'First → Last', '']}>
              {filtered.map((c, i) => (
                <>
                  <Tr key={c.nic + i}>
                    <Td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        {/* Avatar */}
                        <div style={{
                          width: 34, height: 34, borderRadius: 10,
                          background: c.is_vip ? 'rgba(255,197,61,0.15)' : 'rgba(255,45,120,0.12)',
                          border: `1px solid ${c.is_vip ? 'rgba(255,197,61,0.3)' : 'rgba(255,45,120,0.2)'}`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 14, fontWeight: 900,
                          color: c.is_vip ? T.gold : T.pink, flexShrink: 0,
                          position: 'relative',
                        }}>
                          {c.full_name?.[0]?.toUpperCase() || '?'}
                        </div>

                        <div>
                          <div style={{ fontWeight: 700, color: T.text, fontSize: 13 }}>{c.full_name}</div>
                          <div style={{ display: 'flex', gap: 5, marginTop: 2, flexWrap: 'wrap' }}>
                            {c.is_vip && (
                              <span style={{
                                fontSize: 9, fontWeight: 800, color: T.gold,
                                background: 'rgba(255,197,61,0.12)', padding: '1px 6px',
                                borderRadius: 999, letterSpacing: '0.06em'
                              }}>⭐ VIP</span>
                            )}
                            {c.order_count > 1 && (
                              <span style={{
                                fontSize: 9, fontWeight: 700, color: T.lime,
                                background: 'rgba(184,255,60,0.1)', padding: '1px 6px',
                                borderRadius: 999, letterSpacing: '0.06em'
                              }}>REPEAT</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </Td>

                    <Td>
                      <span style={{ fontFamily: T.mono, fontSize: 12, color: T.muted }}>{c.nic || '—'}</span>
                    </Td>

                    <Td>
                      <div style={{ fontSize: 12, color: T.text }}>{c.phone1}</div>
                      {c.phone2 && <div style={{ fontSize: 11, color: T.muted }}>{c.phone2}</div>}
                    </Td>

                    <Td>
                      <span style={{ fontSize: 12, color: T.muted }}>{c.city || '—'}</span>
                    </Td>

                    <Td>
                      <span style={{
                        fontWeight: 800, color: T.cyan,
                        background: 'rgba(0,229,255,0.08)',
                        padding: '3px 10px', borderRadius: 999, fontSize: 12
                      }}>{c.order_count}</span>
                    </Td>

                    <Td>
                      <span style={{ fontSize: 12, color: T.text }}>
                        Rs {Math.round(c.avg_order_value || 0).toLocaleString()}
                      </span>
                    </Td>

                    <Td>
                      <span style={{ fontWeight: 800, color: T.gold, fontSize: 13 }}>
                        Rs {Number(c.total_spent).toLocaleString()}
                      </span>
                    </Td>

                    <Td>
                      <div style={{ fontSize: 10, color: T.muted }}>
                        <div>{c.first_order ? new Date(c.first_order).toLocaleDateString() : '—'}</div>
                        <div style={{ color: T.text, fontSize: 11, marginTop: 2 }}>
                          → {c.last_order ? new Date(c.last_order).toLocaleDateString() : '—'}
                        </div>
                      </div>
                    </Td>

                    <Td>
                      <Btn size="sm" variant="ghost" onClick={() => setExpanded(expanded === c.nic ? null : c.nic)}>
                        {expanded === c.nic ? '▲ Hide' : '▼ Orders'}
                      </Btn>
                    </Td>
                  </Tr>

                  {expanded === c.nic && (
                    <tr key={c.nic + '-exp'}>
                      <td colSpan={9} style={{ padding: '0 0 12px 0', background: 'transparent' }}>
                        <div style={{
                          margin: '0 8px', borderRadius: 12,
                          background: c.is_vip ? 'rgba(255,197,61,0.04)' : 'rgba(255,45,120,0.04)',
                          border: `1px solid ${c.is_vip ? 'rgba(255,197,61,0.12)' : 'rgba(255,45,120,0.12)'}`,
                          overflow: 'hidden'
                        }}>
                          <div style={{
                            padding: '10px 16px', borderBottom: `1px solid ${T.border}`,
                            fontSize: 12, color: T.muted, display: 'flex', gap: 24, flexWrap: 'wrap',
                          }}>
                            <span>📍 {[c.address, c.city].filter(Boolean).join(', ') || 'No address'}</span>
                            <span>📦 {c.order_count} orders  ·  Rs {Number(c.total_spent).toLocaleString()} lifetime</span>
                            <span>📅 First: {c.first_order ? new Date(c.first_order).toLocaleDateString() : '—'}</span>
                          </div>

                          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                              <tr>
                                {['Reference','Date','Items','Total','Status'].map(h => (
                                  <th key={h} style={{
                                    padding: '8px 14px', textAlign: 'left',
                                    fontSize: 10, fontWeight: 800, color: T.muted,
                                    letterSpacing: '0.1em', textTransform: 'uppercase',
                                    borderBottom: `1px solid ${T.border}`
                                  }}>{h}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {c.orders.map(o => {
                                let items = []
                                try { items = JSON.parse(o.items_json || '[]') } catch {}
                                return (
                                  <tr key={o.id} className="dn-tr">
                                    <td style={{ padding: '9px 14px', fontFamily: T.mono, fontSize: 12, color: T.cyan }}>{formatRef(o)}</td>
                                    <td style={{ padding: '9px 14px', fontSize: 12, color: T.muted }}>{new Date(o.created_at).toLocaleDateString()}</td>
                                    <td style={{ padding: '9px 14px', fontSize: 12, color: T.text, maxWidth: 220 }}>
                                      {items.map(it => `${it.name} ×${it.qty || it.quantity || 1}`).join(', ') || '—'}
                                    </td>
                                    <td style={{ padding: '9px 14px', fontSize: 13, fontWeight: 700, color: T.gold }}>Rs {Number(o.total).toLocaleString()}</td>
                                    <td style={{ padding: '9px 14px' }}><StatusPill status={o.status} /></td>
                                  </tr>
                                )
                              })}
                            </tbody>
                          </table>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </Table>
          )}
        </Card>

      </PageContent>
    </>
  )
}