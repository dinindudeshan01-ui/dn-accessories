// src/pages/admin/AdminOrders.jsx — v2: bulk actions + timeline

import React, { useState, useEffect, useRef } from 'react'
import adminApi from '../../lib/adminApi'
import {
  PageHeader, PageContent, KpiGrid, KpiCard, Card, CardHeader,
  Table, Tr, Td, StatusPill, Btn, Select, Spinner, ExpandedRow, tokens as T
} from '../../components/admin/AdminUI'

const STATUSES = ['pending', 'paid', 'shipped', 'refunded', 'cancelled']

const STATUS_QUICK = [
  { label: 'Approve',  value: 'paid',      color: '#16a34a', bg: 'rgba(22,163,74,0.12)'   },
  { label: 'Shipped',  value: 'shipped',   color: '#3b82f6', bg: 'rgba(59,130,246,0.12)'  },
  { label: 'Refund',   value: 'refunded',  color: '#f59e0b', bg: 'rgba(245,158,11,0.12)'  },
  { label: 'Cancel',   value: 'cancelled', color: '#ef4444', bg: 'rgba(239,68,68,0.12)'   },
]

const STATUS_COLORS = {
  pending:   '#ffc53d',
  paid:      '#4ade80',
  shipped:   '#60a5fa',
  refunded:  '#fbbf24',
  cancelled: '#f87171',
}

function formatRef(o) {
  if (o.reference) return o.reference
  const year = new Date(o.created_at).getFullYear()
  return `DN-${year}-${String(o.id).padStart(5, '0')}`
}

export default function AdminOrders() {
  const [orders,     setOrders]     = useState([])
  const [stats,      setStats]      = useState(null)
  const [filter,     setFilter]     = useState('')
  const [loading,    setLoading]    = useState(true)
  const [expanded,   setExpanded]   = useState(null)
  const [slipModal,  setSlipModal]  = useState(null)
  const [selected,   setSelected]   = useState(new Set())
  const [bulkStatus, setBulkStatus] = useState('shipped')
  const [bulking,    setBulking]    = useState(false)
  const [timelines,  setTimelines]  = useState({})

  useEffect(() => { load() }, [filter])

  async function load() {
    setLoading(true)
    try {
      const [o, s] = await Promise.all([
        adminApi.get('/orders', { params: filter ? { status: filter } : {} }),
        adminApi.get('/orders/stats'),
      ])
      setOrders(o.data)
      setStats(s.data)
    } finally { setLoading(false) }
  }

  async function updateStatus(id, status) {
    await adminApi.patch(`/orders/${id}/status`, { status })
    await load()
  }

  async function loadTimeline(orderId) {
    try {
      const res = await adminApi.get(`/orders/${orderId}/timeline`)
      setTimelines(prev => ({ ...prev, [orderId]: res.data }))
    } catch { setTimelines(prev => ({ ...prev, [orderId]: [] })) }
  }

  function toggleExpand(id) {
    const next = expanded === id ? null : id
    setExpanded(next)
    if (next && !timelines[next]) loadTimeline(next)
  }

  // ── Selection ──
  function toggleSelect(id) {
    setSelected(prev => {
      const n = new Set(prev)
      n.has(id) ? n.delete(id) : n.add(id)
      return n
    })
  }
  function toggleSelectAll() {
    if (selected.size === orders.length) setSelected(new Set())
    else setSelected(new Set(orders.map(o => o.id)))
  }

  // ── Bulk status ──
  async function doBulkStatus() {
    if (!selected.size) return
    setBulking(true)
    try {
      await adminApi.post('/orders/bulk-status', { ids: [...selected], status: bulkStatus })
      setSelected(new Set())
      await load()
    } finally { setBulking(false) }
  }

  // ── Bulk CSV export ──
  function exportCsv() {
    const toExport = orders.filter(o => selected.size ? selected.has(o.id) : true)
    const rows = [
      ['Reference','Customer','Phone','City','Total','Status','Bank','Date','Items'],
      ...toExport.map(o => [
        formatRef(o),
        o.full_name || '',
        o.phone1 || '',
        o.city || '',
        o.total,
        o.status,
        o.bank_used || '',
        new Date(o.created_at).toLocaleDateString(),
        (o.items || []).map(i => `${i.name}×${i.qty||i.quantity||1}`).join('; '),
      ])
    ]
    const csv  = rows.map(r => r.map(c => `"${String(c).replace(/"/g,'""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = `orders-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  // ── Bulk print slips ──
  function printSlips() {
    const toprint = orders.filter(o => selected.has(o.id) && o.slip_url)
    if (!toprint.length) return alert('No slip-uploaded orders selected')
    const win = window.open('', '_blank')
    win.document.write(`<html><head><style>
      body { margin: 0; background: #fff; }
      .slip { page-break-after: always; padding: 20px; text-align: center; }
      img { max-width: 100%; }
      .info { font-family: sans-serif; font-size: 14px; margin-bottom: 12px; }
    </style></head><body>`)
    toprint.forEach(o => {
      win.document.write(`<div class="slip">
        <div class="info"><strong>${formatRef(o)}</strong> — ${o.full_name} — Rs ${Number(o.total).toLocaleString()}</div>
        ${o.slip_url.match(/\.pdf$/i) ? `<iframe src="${o.slip_url}" width="100%" height="600"></iframe>` : `<img src="${o.slip_url}" />`}
      </div>`)
    })
    win.document.write('</body></html>')
    win.document.close()
    win.print()
  }

  const revenue = stats?.total?.revenue || 0
  const count   = stats?.total?.count   || 0
  const avg     = count > 0 ? revenue / count : 0
  const pending = stats?.byStatus?.find(s => s.status === 'pending')?.count || 0
  const allSelected = orders.length > 0 && selected.size === orders.length
  const someSelected = selected.size > 0

  return (
    <>
      <PageHeader
        title="Orders"
        subtitle="Revenue tracking & payment approval"
        action={
          <Select value={filter} onChange={e => setFilter(e.target.value)}
            style={{ width: 'auto', padding: '7px 12px', fontSize: 12 }}>
            <option value="">All Status</option>
            {STATUSES.map(s => (
              <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
            ))}
          </Select>
        }
      />

      <PageContent>
        <KpiGrid>
          <KpiCard label="Total Orders"     value={count} />
          <KpiCard label="Revenue"          value={`Rs ${revenue.toLocaleString()}`} accent />
          <KpiCard label="Avg Order Value"  value={`Rs ${Math.round(avg).toLocaleString()}`} />
          <KpiCard label="Pending Approval" value={pending}
            change={pending > 0 ? 'Needs review' : 'All clear'}
            changeUp={pending === 0}
          />
        </KpiGrid>

        <Card>
          {/* Bulk action bar */}
          {someSelected && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
              padding: '12px 18px', borderBottom: `1px solid ${T.border}`,
              background: 'rgba(255,45,120,0.05)',
            }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: T.pink }}>
                {selected.size} selected
              </span>
              <Select
                value={bulkStatus}
                onChange={e => setBulkStatus(e.target.value)}
                style={{ padding: '5px 10px', fontSize: 12, width: 'auto' }}
              >
                {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </Select>
              <Btn size="sm" onClick={doBulkStatus} disabled={bulking}>
                {bulking ? 'Updating…' : `Mark as ${bulkStatus}`}
              </Btn>
              <Btn size="sm" variant="ghost" onClick={exportCsv}>⬇ CSV</Btn>
              <Btn size="sm" variant="ghost" onClick={printSlips}>🖨 Print Slips</Btn>
              <button
                onClick={() => setSelected(new Set())}
                style={{ marginLeft: 'auto', background: 'none', border: 'none', color: T.muted, cursor: 'pointer', fontSize: 18 }}
              >×</button>
            </div>
          )}

          <CardHeader
            title={`${orders.length} orders`}
            action={
              <Btn size="sm" variant="ghost" onClick={exportCsv} title="Export all to CSV">⬇ Export CSV</Btn>
            }
          />

          {loading ? <Spinner /> : (
            <Table headers={[
              <input type="checkbox" checked={allSelected} onChange={toggleSelectAll}
                style={{ cursor:'pointer', accentColor: T.pink }} />,
              'Reference', 'Customer', 'Items', 'Total', 'Bank', 'Status', 'Date', 'Actions'
            ]}>
              {orders.map(o => (
                <React.Fragment key={o.id}>
                  <Tr
                    onClick={() => toggleExpand(o.id)}
                    style={{ background: expanded === o.id ? 'rgba(255,45,120,0.04)' : selected.has(o.id) ? 'rgba(255,45,120,0.06)' : undefined }}
                  >
                    <Td onClick={e => e.stopPropagation()} style={{ width: 36 }}>
                      <input
                        type="checkbox"
                        checked={selected.has(o.id)}
                        onChange={() => toggleSelect(o.id)}
                        style={{ cursor:'pointer', accentColor: T.pink }}
                      />
                    </Td>
                    <Td pink style={{ fontFamily: 'monospace', fontSize: 12 }}>{formatRef(o)}</Td>
                    <Td>
                      <div style={{ fontWeight: 600, color: T.text, fontSize: 13 }}>{o.full_name || '—'}</div>
                      <div style={{ fontSize: 11, color: T.muted, marginTop: 2 }}>{o.phone1 || ''}</div>
                    </Td>
                    <Td muted>{o.items?.length || 0} item{o.items?.length !== 1 ? 's' : ''}</Td>
                    <Td style={{ fontWeight: 700, color: T.text }}>Rs {Number(o.total).toLocaleString()}</Td>
                    <Td muted style={{ fontSize: 11 }}>{o.bank_used || '—'}</Td>
                    <Td><StatusPill status={o.status} /></Td>
                    <Td muted style={{ fontSize: 11 }}>{new Date(o.created_at).toLocaleDateString()}</Td>
                    <Td onClick={e => e.stopPropagation()}>
                      <Select
                        value={o.status}
                        onChange={e => updateStatus(o.id, e.target.value)}
                        style={{ padding: '4px 8px', fontSize: 11, width: 'auto' }}
                      >
                        {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                      </Select>
                    </Td>
                  </Tr>

                  {expanded === o.id && (
                    <ExpandedRow colSpan={9}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 20, paddingTop: 16 }}>

                        {/* Customer Details */}
                        <div>
                          <SectionLabel>Customer Details</SectionLabel>
                          <InfoGrid rows={[
                            { label: 'Full Name', value: o.full_name },
                            { label: 'NIC',       value: o.nic },
                            { label: 'Phone 1',   value: o.phone1 },
                            { label: 'Phone 2',   value: o.phone2  || '—' },
                            { label: 'City',      value: o.city    || '—' },
                            { label: 'Address',   value: o.address },
                            { label: 'Bank Used', value: o.bank_used || '—' },
                          ]} />
                        </div>

                        {/* Order Items */}
                        <div>
                          <SectionLabel>Order Items</SectionLabel>
                          {(o.items || []).map((item, i) => (
                            <div key={i} style={{
                              display: 'flex', justifyContent: 'space-between',
                              padding: '7px 0', borderBottom: `1px solid ${T.border}`, fontSize: 13
                            }}>
                              <span style={{ color: T.text }}>
                                {item.name} <span style={{ color: T.muted }}>× {item.qty || item.quantity || 1}</span>
                              </span>
                              <span style={{ color: T.pink, fontWeight: 700 }}>
                                Rs {(item.price * (item.qty || item.quantity || 1)).toLocaleString()}
                              </span>
                            </div>
                          ))}
                          <div style={{ textAlign: 'right', marginTop: 10, fontWeight: 900, color: T.text, fontSize: 14 }}>
                            Total: Rs {Number(o.total).toLocaleString()}
                          </div>
                        </div>

                        {/* Payment Slip + Quick Actions */}
                        <div>
                          <SectionLabel>Payment Slip</SectionLabel>
                          {o.slip_url ? (
                            o.slip_url.match(/\.(jpg|jpeg|png|webp)$/i) ? (
                              <img
                                src={o.slip_url}
                                alt="Payment slip"
                                onClick={() => setSlipModal(o.slip_url)}
                                style={{
                                  width: '100%', maxHeight: 160, objectFit: 'cover',
                                  borderRadius: 10, border: `1px solid ${T.border}`,
                                  cursor: 'pointer', marginBottom: 10,
                                }}
                              />
                            ) : (
                              <a href={o.slip_url} target="_blank" rel="noreferrer" style={{
                                display: 'block', padding: '12px 16px',
                                background: 'rgba(255,45,120,0.08)', border: `1px solid rgba(255,45,120,0.2)`,
                                borderRadius: 10, color: T.pink, fontSize: 12, fontWeight: 700,
                                textDecoration: 'none', marginBottom: 10, textAlign: 'center',
                              }}>📄 View PDF Slip →</a>
                            )
                          ) : (
                            <div style={{ padding: '16px 0', color: T.muted, fontSize: 12 }}>No slip uploaded</div>
                          )}

                          <SectionLabel style={{ marginTop: 16 }}>Quick Actions</SectionLabel>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {STATUS_QUICK.filter(q => q.value !== o.status).map(q => (
                              <button key={q.value} onClick={() => updateStatus(o.id, q.value)} style={{
                                padding: '9px 14px', borderRadius: 9, border: 'none',
                                background: q.bg, color: q.color,
                                fontSize: 12, fontWeight: 700, cursor: 'pointer',
                                textAlign: 'left', letterSpacing: '0.5px',
                              }}>
                                {q.label} Order
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Order Timeline */}
                        <div>
                          <SectionLabel>Status Timeline</SectionLabel>
                          <OrderTimeline events={timelines[o.id]} createdAt={o.created_at} />
                        </div>

                      </div>
                    </ExpandedRow>
                  )}
                </React.Fragment>
              ))}
            </Table>
          )}
        </Card>
      </PageContent>

      {slipModal && (
        <div
          onClick={() => setSlipModal(null)}
          style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'rgba(0,0,0,0.85)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
          }}
        >
          <img src={slipModal} alt="Payment slip"
            style={{ maxWidth: '90vw', maxHeight: '90vh', borderRadius: 12, objectFit: 'contain' }}
            onClick={e => e.stopPropagation()} />
          <button onClick={() => setSlipModal(null)} style={{
            position: 'fixed', top: 20, right: 24,
            background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white',
            fontSize: 28, width: 44, height: 44, borderRadius: '50%', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>&times;</button>
        </div>
      )}
    </>
  )
}

// ── Order Timeline component ──────────────────────────────────
function OrderTimeline({ events, createdAt }) {
  if (!events) return <div style={{ color: T.muted, fontSize: 12, paddingTop: 8 }}>Loading…</div>

  const allEvents = [
    { to_status: 'pending', created_at: createdAt, changed_by: 'customer', isCreated: true },
    ...(events || []),
  ]

  return (
    <div style={{ position: 'relative', paddingLeft: 20 }}>
      {/* Vertical line */}
      <div style={{
        position: 'absolute', left: 7, top: 8, bottom: 8,
        width: 2, background: `linear-gradient(to bottom, ${T.pink}, ${T.faint})`,
        borderRadius: 2,
      }} />

      {allEvents.map((ev, i) => {
        const color = STATUS_COLORS[ev.to_status] || T.muted
        return (
          <div key={i} style={{ display: 'flex', gap: 12, marginBottom: 16, position: 'relative' }}>
            {/* Dot */}
            <div style={{
              position: 'absolute', left: -13, top: 3,
              width: 10, height: 10, borderRadius: '50%',
              background: color, boxShadow: `0 0 6px ${color}88`,
              border: `2px solid ${T.card}`, flexShrink: 0,
            }} />

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                <span style={{
                  fontSize: 11, fontWeight: 700, color,
                  background: `${color}18`, padding: '1px 8px', borderRadius: 999,
                  textTransform: 'uppercase', letterSpacing: '0.06em',
                }}>
                  {ev.isCreated ? 'Created' : ev.to_status}
                </span>
              </div>
              <div style={{ fontSize: 11, color: T.muted }}>
                {new Date(ev.created_at).toLocaleString('en-US', {
                  month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                })}
              </div>
              {ev.changed_by && (
                <div style={{ fontSize: 10, color: T.faint === ev.changed_by ? T.muted : T.muted, marginTop: 1 }}>
                  {ev.isCreated ? 'by customer' : `by ${ev.changed_by}`}
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Helpers ───────────────────────────────────────────────────
function SectionLabel({ children, style }) {
  return (
    <div style={{
      fontSize: 10, fontWeight: 700, letterSpacing: '0.12em',
      textTransform: 'uppercase', color: T.muted, marginBottom: 10, ...style
    }}>
      {children}
    </div>
  )
}

function InfoGrid({ rows }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {rows.map((r, i) => (
        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '5px 0', borderBottom: `1px solid ${T.border}` }}>
          <span style={{ color: T.muted }}>{r.label}</span>
          <span style={{ color: T.text, fontWeight: 600, textAlign: 'right', maxWidth: 160 }}>{r.value || '—'}</span>
        </div>
      ))}
    </div>
  )
}