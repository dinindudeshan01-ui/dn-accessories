import { useState, useEffect } from 'react'
import adminApi from '../../lib/adminApi'
import {
  PageHeader, PageContent, KpiGrid, KpiCard,
  Card, CardHeader, Select, Spinner, Empty, tokens as T
} from '../../components/admin/AdminUI'

export default function AdminCashFlow() {
  const [data,    setData]    = useState(null)
  const [aging,   setAging]   = useState(null)
  const [month,   setMonth]   = useState(new Date().toISOString().slice(0, 7))
  const [loading, setLoading] = useState(true)
  const [tab,     setTab]     = useState('cashflow') // 'cashflow' | 'aging'

  const months = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(); d.setMonth(d.getMonth() - i)
    return d.toISOString().slice(0, 7)
  })

  useEffect(() => { loadAll() }, [month])

  async function loadAll() {
    setLoading(true)
    try {
      const [cf, ap] = await Promise.all([
        adminApi.get('/finance/cashflow', { params: { month } }),
        adminApi.get('/finance/ap-aging'),
      ])
      setData(cf.data)
      setAging(ap.data)
    } finally { setLoading(false) }
  }

  const monthLabel = new Date(month + '-01').toLocaleDateString('en-US', { year: 'numeric', month: 'long' })

  return (
    <>
      <PageHeader
        title="Cash Flow & AP Aging"
        subtitle="Actual money in and out"
        action={
          <Select value={month} onChange={e => setMonth(e.target.value)} style={{ width: 'auto', padding: '7px 12px', fontSize: 12 }}>
            {months.map(m => (
              <option key={m} value={m}>
                {new Date(m + '-01').toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}
              </option>
            ))}
          </Select>
        }
      />
      <PageContent>

        {/* Tab switcher */}
        <div style={{ display: 'flex', gap: 2, marginBottom: 20, background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: 4, width: 'fit-content' }}>
          {[{ k: 'cashflow', l: 'Cash Flow' }, { k: 'aging', l: 'AP Aging' }].map(t => (
            <button key={t.k} onClick={() => setTab(t.k)} style={{
              padding: '7px 20px', fontSize: 12, fontWeight: 700,
              borderRadius: 9, border: 'none', cursor: 'pointer', fontFamily: T.font,
              background: tab === t.k ? T.pink : 'transparent',
              color: tab === t.k ? '#fff' : T.muted,
              transition: 'all 0.15s',
              boxShadow: tab === t.k ? `0 0 16px rgba(255,45,120,0.3)` : 'none',
            }}>{t.l}</button>
          ))}
        </div>

        {loading ? <Spinner /> : (
          <>
            {/* ── CASH FLOW TAB ── */}
            {tab === 'cashflow' && data && (
              <>
                <KpiGrid>
                  <KpiCard
                    label="Cash In"
                    value={`Rs ${Math.round(data.cashIn).toLocaleString()}`}
                    change={`${data.orderCount} orders`}
                    changeUp
                    accent
                  />
                  <KpiCard
                    label="Bill Payments Out"
                    value={`Rs ${Math.round(data.billPayments).toLocaleString()}`}
                    change="Supplier payments"
                    changeUp={false}
                  />
                  <KpiCard
                    label="Expenses Out"
                    value={`Rs ${Math.round(data.expensesPaid).toLocaleString()}`}
                    change="Operating costs"
                    changeUp={false}
                  />
                  <KpiCard
                    label="Net Cash Flow"
                    value={`Rs ${Math.round(data.netCashFlow).toLocaleString()}`}
                    change={data.netCashFlow >= 0 ? 'Positive' : 'Negative'}
                    changeUp={data.netCashFlow >= 0}
                  />
                </KpiGrid>

                {/* AP Outstanding alert */}
                {data.apOutstanding > 0 && (
                  <div style={{ padding: '12px 16px', marginBottom: 16, background: 'rgba(255,197,61,0.08)', border: '1px solid rgba(255,197,61,0.25)', borderRadius: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 12, color: T.gold }}>⚠ Outstanding supplier bills (AP) — not yet paid out</span>
                    <span style={{ fontSize: 14, fontWeight: 900, color: T.gold }}>Rs {Math.round(data.apOutstanding).toLocaleString()}</span>
                  </div>
                )}

                {/* Cash flow breakdown card */}
                <Card>
                  <CardHeader title={`Cash Flow Summary — ${monthLabel}`} />
                  <div style={{ padding: '4px 0' }}>
                    <CashRow label="Sales received" value={data.cashIn} color={T.lime} positive />
                    <div style={{ height: 1, background: T.border, margin: '4px 20px' }} />
                    <CashRow label="Supplier bill payments" value={-data.billPayments} color={T.pink} />
                    <CashRow label="Operating expenses" value={-data.expensesPaid} color={T.pink} />
                    <div style={{ height: 1, background: T.borderHi, margin: '4px 20px' }} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '14px 20px', background: data.netCashFlow >= 0 ? 'rgba(184,255,60,0.05)' : 'rgba(255,45,120,0.05)' }}>
                      <span style={{ fontSize: 14, fontWeight: 900, color: T.text }}>NET CASH FLOW</span>
                      <span style={{ fontSize: 18, fontWeight: 900, color: data.netCashFlow >= 0 ? T.lime : T.pink, fontFamily: T.mono }}>
                        Rs {Math.round(Math.abs(data.netCashFlow)).toLocaleString()}
                        {data.netCashFlow < 0 ? ' (deficit)' : ''}
                      </span>
                    </div>
                  </div>
                </Card>

                {/* Daily chart */}
                {data.daily?.length > 0 && (
                  <Card>
                    <CardHeader title="Daily Cash Movement" />
                    <div style={{ padding: '20px' }}>
                      <DailyCashChart data={data.daily} />
                    </div>
                  </Card>
                )}
              </>
            )}

            {/* ── AP AGING TAB ── */}
            {tab === 'aging' && aging && (
              <>
                {/* Aging summary buckets */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10, marginBottom: 20 }}>
                  {[
                    { label: 'Current',   key: 'current',   color: T.lime,   dim: 'rgba(184,255,60,0.1)'  },
                    { label: '1–30 days', key: 'days1_30',  color: T.gold,   dim: 'rgba(255,197,61,0.1)'  },
                    { label: '31–60 days',key: 'days31_60', color: '#ff9500', dim: 'rgba(255,149,0,0.1)'   },
                    { label: '61–90 days',key: 'days61_90', color: T.pink,   dim: 'rgba(255,45,120,0.1)'  },
                    { label: '90+ days',  key: 'over90',    color: '#ff2d78', dim: 'rgba(255,45,120,0.18)' },
                  ].map(b => (
                    <div key={b.key} style={{ background: b.dim, border: `1px solid ${b.color}30`, borderRadius: 12, padding: '14px 16px', textAlign: 'center' }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: b.color, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>{b.label}</div>
                      <div style={{ fontSize: 18, fontWeight: 900, color: b.color }}>
                        Rs {Math.round(aging.totals[b.key]).toLocaleString()}
                      </div>
                      <div style={{ fontSize: 11, color: T.muted, marginTop: 4 }}>
                        {aging.buckets[b.key].length} bill{aging.buckets[b.key].length !== 1 ? 's' : ''}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Total outstanding */}
                {aging.totals.total > 0 && (
                  <div style={{ padding: '12px 16px', marginBottom: 16, background: 'rgba(255,45,120,0.06)', border: '1px solid rgba(255,45,120,0.2)', borderRadius: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 12, color: T.muted }}>{aging.billCount} unpaid/partial bills</span>
                    <span style={{ fontSize: 15, fontWeight: 900, color: T.pink }}>Total AP: Rs {Math.round(aging.totals.total).toLocaleString()}</span>
                  </div>
                )}

                {/* Bill list grouped by bucket */}
                {aging.billCount === 0 ? (
                  <Empty message="No outstanding bills — all clear!" />
                ) : (
                  [
                    { label: 'Current (not yet due)',   key: 'current',   color: T.lime   },
                    { label: '1–30 days overdue',        key: 'days1_30',  color: T.gold   },
                    { label: '31–60 days overdue',       key: 'days31_60', color: '#ff9500'},
                    { label: '61–90 days overdue',       key: 'days61_90', color: T.pink   },
                    { label: 'Over 90 days overdue',     key: 'over90',    color: T.pink   },
                  ].filter(b => aging.buckets[b.key].length > 0).map(bucket => (
                    <Card key={bucket.key} style={{ marginBottom: 12 }}>
                      <div style={{ padding: '10px 16px', borderBottom: `1px solid ${T.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: bucket.color }}>{bucket.label}</span>
                        <span style={{ fontSize: 12, color: T.muted }}>{aging.buckets[bucket.key].length} bill{aging.buckets[bucket.key].length !== 1 ? 's' : ''}</span>
                      </div>
                      {aging.buckets[bucket.key].map((bill, i) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 16px', borderBottom: i < aging.buckets[bucket.key].length - 1 ? `1px solid ${T.border}` : 'none', fontSize: 13 }}>
                          <div>
                            <span style={{ fontFamily: T.mono, fontSize: 12, color: T.gold, fontWeight: 700, marginRight: 10 }}>{bill.bill_number}</span>
                            <span style={{ color: T.text }}>{bill.supplier_name || 'No supplier'}</span>
                            <div style={{ fontSize: 11, color: T.muted, marginTop: 2 }}>
                              Due: {bill.due_date || bill.bill_date} · {bill.days_overdue > 0 ? `${bill.days_overdue} days overdue` : 'not yet due'}
                            </div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontWeight: 700, color: bucket.color }}>Rs {Math.round(bill.outstanding).toLocaleString()}</div>
                            <div style={{ fontSize: 11, color: T.muted }}>of Rs {Math.round(bill.total).toLocaleString()}</div>
                          </div>
                        </div>
                      ))}
                    </Card>
                  ))
                )}
              </>
            )}
          </>
        )}
      </PageContent>
    </>
  )
}

function CashRow({ label, value, color, positive }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 20px', borderBottom: `1px solid ${T.border}` }}>
      <span style={{ fontSize: 13, color: T.muted }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 700, color, fontFamily: T.mono }}>
        {value < 0 ? `(Rs ${Math.abs(value).toLocaleString()})` : `Rs ${value.toLocaleString()}`}
      </span>
    </div>
  )
}

function DailyCashChart({ data }) {
  const maxVal = Math.max(...data.map(d => Math.max(Number(d.cash_in || 0), Number(d.cash_out || 0))), 1)
  return (
    <div>
      <div style={{ display: 'flex', gap: 16, marginBottom: 12, fontSize: 11 }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: T.muted }}>
          <span style={{ width: 10, height: 10, borderRadius: 2, background: T.lime, display: 'inline-block' }} /> Cash in
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: T.muted }}>
          <span style={{ width: 10, height: 10, borderRadius: 2, background: T.pink, display: 'inline-block' }} /> Cash out
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 100, overflowX: 'auto' }}>
        {data.map((d, i) => {
          const inH  = Math.max(3, (Number(d.cash_in  || 0) / maxVal) * 90)
          const outH = Math.max(3, (Number(d.cash_out || 0) / maxVal) * 90)
          const label = d.day.slice(5) // MM-DD
          return (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, minWidth: 28, flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 90 }}>
                <div style={{ width: 8, height: inH,  background: T.lime, borderRadius: '2px 2px 0 0', opacity: 0.85 }} />
                <div style={{ width: 8, height: outH, background: T.pink, borderRadius: '2px 2px 0 0', opacity: 0.85 }} />
              </div>
              <span style={{ fontSize: 9, color: T.muted, whiteSpace: 'nowrap' }}>{label}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}