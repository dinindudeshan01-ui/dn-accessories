// src/pages/admin/AdminOrders.jsx

import { useState, useEffect } from 'react'
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

export default function AdminOrders() {
  const [orders, setOrders]     = useState([])
  const [stats, setStats]       = useState(null)
  const [filter, setFilter]     = useState('')
  const [loading, setLoading]   = useState(true)
  const [expanded, setExpanded] = useState(null)
  const [slipModal, setSlipModal] = useState(null)

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

  const revenue  = stats?.total?.revenue || 0
  const count    = stats?.total?.count   || 0
  const avg      = count > 0 ? revenue / count : 0
  const pending  = stats?.byStatus?.find(s => s.status === 'pending')?.count  || 0
  const refunds  = stats?.byStatus?.find(s => s.status === 'refunded')?.count || 0

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
          <KpiCard label="Total Orders"    value={count} />
          <KpiCard label="Revenue"         value={`Rs ${revenue.toLocaleString()}`} accent />
          <KpiCard label="Avg Order Value" value={`Rs ${avg.toLocaleString()}`} />
          <KpiCard label="Pending Approval" value={pending}
            change={pending > 0 ? 'Needs review' : 'All clear'}
            changeUp={pending === 0}
          />
        </KpiGrid>

        <Card>
          <CardHeader title={`${orders.length} orders`} />
          {loading ? <Spinner /> : (
            <Table headers={['Reference', 'Customer', 'Items', 'Total', 'Status', 'Date', 'Actions']}>
              {orders.map(o => (
                <>
                  <Tr
                    key={o.id}
                    onClick={() => setExpanded(expanded === o.id ? null : o.id)}
                    style={{ background: expanded === o.id ? 'rgba(255,45,120,0.04)' : undefined }}
                  >
                    <Td pink style={{ fontFamily: 'monospace', fontSize: 12, letterSpacing: '0.5px' }}>
                      {o.reference || `#${String(o.id).padStart(4, '0')}`}
                    </Td>
                    <Td>
                      <div style={{ fontWeight: 600, color: T.text, fontSize: 13 }}>{o.full_name || '—'}</div>
                      <div style={{ fontSize: 11, color: T.muted, marginTop: 2 }}>{o.phone1 || ''}</div>
                    </Td>
                    <Td muted>{o.items?.length || 0} item{o.items?.length !== 1 ? 's' : ''}</Td>
                    <Td style={{ fontWeight: 700, color: T.text }}>${o.total.toFixed(2)}</Td>
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
                    <ExpandedRow key={`${o.id}-exp`} colSpan={7}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 20, paddingTop: 16 }}>

                        {/* KYC Details */}
                        <div>
                          <SectionLabel>Customer Details</SectionLabel>
                          <InfoGrid rows={[
                            { label: 'Full Name', value: o.full_name },
                            { label: 'NIC',       value: o.nic },
                            { label: 'Phone 1',   value: o.phone1 },
                            { label: 'Phone 2',   value: o.phone2 || '—' },
                            { label: 'City',      value: o.city   || '—' },
                            { label: 'Address',   value: o.address },
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
                              <span style={{ color: T.text }}>{item.name} <span style={{ color: T.muted }}>× {item.qty || item.quantity || 1}</span></span>
                              <span style={{ color: T.pink, fontWeight: 700 }}>
                                ${(item.price * (item.qty || item.quantity || 1)).toFixed(2)}
                              </span>
                            </div>
                          ))}
                          <div style={{ textAlign: 'right', marginTop: 10, fontWeight: 900, color: T.text, fontSize: 14 }}>
                            Total: ${o.total.toFixed(2)}
                          </div>
                        </div>

                        {/* Payment Slip + Quick Actions */}
                        <div>
                          <SectionLabel>Payment Slip</SectionLabel>
                          {o.slip_url ? (
                            <div>
                              {o.slip_url.match(/\.(jpg|jpeg|png|webp)$/i) ? (
                                <img
                                  src={o.slip_url}
                                  alt="Payment slip"
                                  onClick={() => setSlipModal(o.slip_url)}
                                  style={{
                                    width: '100%', maxHeight: 160, objectFit: 'cover',
                                    borderRadius: 10, border: `1px solid ${T.border}`,
                                    cursor: 'pointer', marginBottom: 10,
                                    transition: 'opacity 0.2s',
                                  }}
                                  onMouseEnter={e => e.target.style.opacity = 0.85}
                                  onMouseLeave={e => e.target.style.opacity = 1}
                                />
                              ) : (
                                <a
                                  href={o.slip_url}
                                  target="_blank"
                                  rel="noreferrer"
                                  style={{
                                    display: 'block', padding: '12px 16px',
                                    background: 'rgba(255,45,120,0.08)',
                                    border: `1px solid rgba(255,45,120,0.2)`,
                                    borderRadius: 10, color: T.pink,
                                    fontSize: 12, fontWeight: 700,
                                    textDecoration: 'none', marginBottom: 10,
                                    textAlign: 'center',
                                  }}
                                >
                                  View PDF Slip →
                                </a>
                              )}
                            </div>
                          ) : (
                            <div style={{ padding: '16px 0', color: T.muted, fontSize: 12 }}>
                              No slip uploaded
                            </div>
                          )}

                          {/* Quick action buttons */}
                          <SectionLabel style={{ marginTop: 16 }}>Quick Actions</SectionLabel>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {STATUS_QUICK.filter(q => q.value !== o.status).map(q => (
                              <button
                                key={q.value}
                                onClick={() => updateStatus(o.id, q.value)}
                                style={{
                                  padding: '9px 14px', borderRadius: 9, border: 'none',
                                  background: q.bg, color: q.color,
                                  fontSize: 12, fontWeight: 700, cursor: 'pointer',
                                  textAlign: 'left', letterSpacing: '0.5px',
                                  transition: 'filter 0.15s',
                                }}
                                onMouseEnter={e => e.currentTarget.style.filter = 'brightness(1.2)'}
                                onMouseLeave={e => e.currentTarget.style.filter = 'none'}
                              >
                                {q.label} Order
                              </button>
                            ))}
                          </div>
                        </div>

                      </div>
                    </ExpandedRow>
                  )}
                </>
              ))}
            </Table>
          )}
        </Card>
      </PageContent>

      {/* Full-screen slip preview modal */}
      {slipModal && (
        <div
          onClick={() => setSlipModal(null)}
          style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'rgba(0,0,0,0.85)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 24,
          }}
        >
          <img
            src={slipModal}
            alt="Payment slip"
            style={{ maxWidth: '90vw', maxHeight: '90vh', borderRadius: 12, objectFit: 'contain' }}
            onClick={e => e.stopPropagation()}
          />
          <button
            onClick={() => setSlipModal(null)}
            style={{
              position: 'fixed', top: 20, right: 24,
              background: 'rgba(255,255,255,0.1)', border: 'none',
              color: 'white', fontSize: 28, width: 44, height: 44,
              borderRadius: '50%', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'Arial, sans-serif',
            }}
          >
            &times;
          </button>
        </div>
      )}
    </>
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────────
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