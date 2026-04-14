// src/pages/admin/AdminPL.jsx
// Phase 4 — Accrual P&L with full drill-down
// COGS = materials used in sold products (order_cogs table)
// Revenue = confirmed sales only (paid + shipped)

import { useState, useEffect } from 'react'
import adminApi from '../../lib/adminApi'
import {
  PageHeader, PageContent, KpiGrid, KpiCard,
  Card, Select, Spinner, Modal, Btn,
  PLSection, PLRow, PLTotal, NetProfitRow, tokens as T
} from '../../components/admin/AdminUI'

export default function AdminPL() {
  const [data,    setData]    = useState(null)
  const [month,   setMonth]   = useState(new Date().toISOString().slice(0, 7))
  const [loading, setLoading] = useState(true)
  const [drill,   setDrill]   = useState(null) // null | 'cogs' | 'revenue' | 'expense'

  useEffect(() => { load() }, [month])

  async function load() {
    setLoading(true)
    try {
      const res = await adminApi.get('/finance/pl', { params: { month } })
      setData(res.data)
    } finally { setLoading(false) }
  }

  const months = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(); d.setMonth(d.getMonth() - i)
    return d.toISOString().slice(0, 7)
  })

  const monthLabel = new Date(month + '-01').toLocaleDateString('en-US', { year: 'numeric', month: 'long' })

  return (
    <>
      <PageHeader
        title="Profit & Loss"
        subtitle="Accrual basis — confirmed sales only"
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
        {loading || !data ? <Spinner /> : (
          <>
            {/* KPI Cards */}
            <KpiGrid>
              <KpiCard
                label="Gross Revenue"
                value={`Rs ${Math.round(data.revenue).toLocaleString()}`}
                accent
              />
              <KpiCard
                label="Cost of Goods Sold"
                value={`Rs ${Math.round(data.cogs).toLocaleString()}`}
              />
              <KpiCard
                label="Gross Profit"
                value={`Rs ${Math.round(data.grossProfit).toLocaleString()}`}
                changeUp={data.grossProfit > 0}
                change={data.revenue > 0 ? `${((data.grossProfit / data.revenue) * 100).toFixed(0)}% margin` : ''}
              />
              <KpiCard
                label="Net Profit"
                value={`Rs ${Math.round(data.netProfit).toLocaleString()}`}
                changeUp={data.netProfit > 0}
                change={data.revenue > 0 ? `${((data.netProfit / data.revenue) * 100).toFixed(0)}% margin` : ''}
              />
            </KpiGrid>

            {/* No recipe warning */}
            {data.noRecipe?.length > 0 && (
              <div style={{ padding: '12px 16px', marginBottom: 16, background: 'rgba(255,197,61,0.08)', border: '1px solid rgba(255,197,61,0.25)', borderRadius: 12, fontSize: 12, color: T.gold }}>
                ⚠ {data.noRecipe.length} product{data.noRecipe.length > 1 ? 's' : ''} sold without a recipe —
                COGS may be understated. Go to <strong>Inventory → Recipes</strong> to fix.
                <span style={{ color: T.muted, marginLeft: 8 }}>
                  ({data.noRecipe.map(p => p.product_name).join(', ')})
                </span>
              </div>
            )}

            {/* Income Statement */}
            <Card>
              <div style={{ padding: '16px 20px', borderBottom: `1px solid ${T.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: T.text }}>Income Statement</span>
                <span style={{ fontSize: 11, color: T.muted }}>{monthLabel}</span>
              </div>

              {/* ── INCOME ── */}
              <PLSection title="INCOME" />
              <ClickablePLRow
                label="Product Sales"
                value={data.revenue}
                positive
                onClick={() => setDrill('revenue')}
              />
              <PLTotal label="Total Income" value={data.revenue} />

              {/* ── COGS ── */}
              <PLSection title="COST OF GOODS SOLD" />
              <ClickablePLRow
                label="Materials Used in Sales"
                value={-data.cogs}
                onClick={() => setDrill('cogs')}
                hint="Click to see breakdown"
              />
              <PLTotal label="Total COGS" value={-data.cogs} />

              {/* ── OPEX ── */}
              <PLSection title="OPERATING EXPENSES" />
              {data.expenses.length === 0
                ? <PLRow label="No expenses recorded" value={0} muted />
                : data.expenses.map((e, i) => (
                  <PLRow key={i} label={e.category} value={-e.total} />
                ))
              }
              <PLTotal label="Total OpEx" value={-data.totalExpenses} />

              {/* ── NET PROFIT ── */}
              <NetProfitRow value={data.netProfit} />

              {/* ── Bills reference note ── */}
              {data.billsThisPeriod && (
                <div style={{ padding: '12px 20px', borderTop: `1px solid ${T.border}`, display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                  <span style={{ color: T.muted }}>Supplier bills this period (for reference — not P&L)</span>
                  <div style={{ display: 'flex', gap: 20 }}>
                    <span style={{ color: T.text }}>Billed: Rs {Math.round(data.billsThisPeriod.total || 0).toLocaleString()}</span>
                    <span style={{ color: data.billsThisPeriod.outstanding > 0 ? T.pink : T.lime }}>
                      Outstanding: Rs {Math.round(data.billsThisPeriod.outstanding || 0).toLocaleString()}
                    </span>
                  </div>
                </div>
              )}
            </Card>
          </>
        )}
      </PageContent>

      {/* ── COGS Drill-down Modal ── */}
      {drill === 'cogs' && data && (
        <CogsDrillDown
          data={data}
          monthLabel={monthLabel}
          onClose={() => setDrill(null)}
        />
      )}

      {/* ── Revenue Drill-down Modal ── */}
      {drill === 'revenue' && data && (
        <RevenueDrillDown
          month={month}
          monthLabel={monthLabel}
          onClose={() => setDrill(null)}
        />
      )}
    </>
  )
}

// ── Clickable P&L Row ─────────────────────────────────────────
function ClickablePLRow({ label, value, positive, onClick, hint }) {
  const [hov, setHov] = useState(false)
  const color = positive ? T.lime : value >= 0 ? T.text : T.pink

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '9px 20px',
        borderBottom: `1px solid ${T.border}`,
        cursor: 'pointer',
        background: hov ? 'rgba(255,45,120,0.04)' : 'transparent',
        transition: 'background 0.15s',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 13, color: T.muted }}>{label}</span>
        {hint && (
          <span style={{ fontSize: 10, color: T.pink, fontWeight: 700, opacity: hov ? 1 : 0.5, transition: 'opacity 0.15s' }}>
            ↗ {hint}
          </span>
        )}
      </div>
      <span style={{ fontSize: 13, fontWeight: 600, color, fontFamily: "'JetBrains Mono', monospace" }}>
        {value < 0
          ? `(Rs ${Math.abs(value).toLocaleString()})`
          : `Rs ${value.toLocaleString()}`
        }
      </span>
    </div>
  )
}

// ── COGS Drill-down Modal ─────────────────────────────────────
function CogsDrillDown({ data, monthLabel, onClose }) {
  const [view, setView] = useState('product') // 'product' | 'material'

  return (
    <Modal title={`COGS Breakdown — ${monthLabel}`} onClose={onClose} width={620}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* Summary */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 10, padding: '12px 16px' }}>
            <div style={{ fontSize: 10, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>Total COGS</div>
            <div style={{ fontSize: 20, fontWeight: 900, color: T.pink }}>Rs {Math.round(data.cogs).toLocaleString()}</div>
            <div style={{ fontSize: 11, color: T.muted, marginTop: 2 }}>Materials used in sold products</div>
          </div>
          <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 10, padding: '12px 16px' }}>
            <div style={{ fontSize: 10, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>Gross Margin</div>
            <div style={{ fontSize: 20, fontWeight: 900, color: data.grossProfit > 0 ? T.lime : T.pink }}>
              {data.revenue > 0 ? `${((data.grossProfit / data.revenue) * 100).toFixed(1)}%` : '—'}
            </div>
            <div style={{ fontSize: 11, color: T.muted, marginTop: 2 }}>Revenue − COGS</div>
          </div>
        </div>

        {/* View toggle */}
        <div style={{ display: 'flex', gap: 2, background: T.surface, border: `1px solid ${T.border}`, borderRadius: 10, padding: 3, width: 'fit-content' }}>
          {[{ k: 'product', l: 'By Product' }, { k: 'material', l: 'By Material' }].map(v => (
            <button key={v.k} onClick={() => setView(v.k)} style={{
              padding: '6px 16px', fontSize: 11, fontWeight: 700, borderRadius: 8,
              border: 'none', cursor: 'pointer', fontFamily: T.font,
              background: view === v.k ? T.pink : 'transparent',
              color: view === v.k ? 'white' : T.muted,
              transition: 'all 0.15s',
            }}>{v.l}</button>
          ))}
        </div>

        {/* By Product */}
        {view === 'product' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {!data.cogsByProduct?.length ? (
              <div style={{ color: T.muted, fontSize: 13, textAlign: 'center', padding: '20px 0' }}>No COGS data for this period</div>
            ) : data.cogsByProduct.map((p, i) => {
              const pct = data.cogs > 0 ? (p.total_cost / data.cogs) * 100 : 0
              return (
                <div key={i} style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 10, padding: '12px 14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: T.text }}>{p.product_name}</div>
                      <div style={{ fontSize: 11, color: T.muted, marginTop: 2 }}>
                        {p.total_qty} units sold · {p.order_count} order{p.order_count > 1 ? 's' : ''}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 14, fontWeight: 900, color: T.pink }}>Rs {Math.round(p.total_cost).toLocaleString()}</div>
                      <div style={{ fontSize: 11, color: T.muted }}>{pct.toFixed(1)}% of COGS</div>
                    </div>
                  </div>
                  {/* Progress bar */}
                  <div style={{ height: 3, background: T.faint, borderRadius: 99, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: `linear-gradient(90deg, ${T.pink}, ${T.purple})`, borderRadius: 99 }} />
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* By Material */}
        {view === 'material' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {!data.cogsByMaterial?.length ? (
              <div style={{ color: T.muted, fontSize: 13, textAlign: 'center', padding: '20px 0' }}>No material data for this period</div>
            ) : data.cogsByMaterial.map((m, i) => {
              const pct = data.cogs > 0 ? (m.total_cost / data.cogs) * 100 : 0
              return (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: T.surface, border: `1px solid ${T.border}`, borderRadius: 10, fontSize: 12 }}>
                  <div>
                    <div style={{ fontWeight: 700, color: T.text }}>{m.material_name}</div>
                    <div style={{ color: T.muted, marginTop: 2 }}>
                      {Number(m.total_qty).toFixed(2)} {m.unit} used · avg Rs {Number(m.avg_cost).toFixed(2)}/{m.unit}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 700, color: T.pink }}>Rs {Math.round(m.total_cost).toLocaleString()}</div>
                    <div style={{ color: T.muted, fontSize: 11 }}>{pct.toFixed(1)}%</div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* No recipe warning */}
        {data.noRecipe?.length > 0 && (
          <div style={{ padding: '10px 14px', background: 'rgba(255,197,61,0.08)', border: '1px solid rgba(255,197,61,0.2)', borderRadius: 10, fontSize: 12, color: T.gold }}>
            ⚠ Products sold without recipe (COGS not captured):
            <span style={{ color: T.muted, marginLeft: 6 }}>
              {data.noRecipe.map(p => `${p.product_name} (×${p.total_qty})`).join(', ')}
            </span>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Btn variant="ghost" onClick={onClose}>Close</Btn>
        </div>
      </div>
    </Modal>
  )
}

// ── Revenue Drill-down Modal ──────────────────────────────────
function RevenueDrillDown({ month, monthLabel, onClose }) {
  const [orders,  setOrders]  = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    adminApi.get('/orders', { params: { status: 'paid', limit: 200 } })
      .then(res => {
        // Filter to this month
        const filtered = res.data.filter(o => {
          const oMonth = new Date(o.created_at).toISOString().slice(0, 7)
          return oMonth === month
        })
        // Also get shipped
        return adminApi.get('/orders', { params: { status: 'shipped', limit: 200 } })
          .then(res2 => {
            const shipped = res2.data.filter(o => new Date(o.created_at).toISOString().slice(0, 7) === month)
            setOrders([...filtered, ...shipped].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)))
          })
      })
      .finally(() => setLoading(false))
  }, [month])

  const total = orders.reduce((s, o) => s + o.total, 0)

  return (
    <Modal title={`Revenue Breakdown — ${monthLabel}`} onClose={onClose} width={580}>
      {loading ? <Spinner /> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

          {/* Total */}
          <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 10, padding: '14px 16px', display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 12, color: T.muted }}>{orders.length} confirmed orders</span>
            <span style={{ fontSize: 18, fontWeight: 900, color: T.lime }}>Rs {Math.round(total).toLocaleString()}</span>
          </div>

          {/* Order list */}
          {!orders.length ? (
            <div style={{ color: T.muted, fontSize: 13, textAlign: 'center', padding: '20px 0' }}>No confirmed orders this period</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 400, overflowY: 'auto' }}>
              {orders.map((o, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: T.surface, border: `1px solid ${T.border}`, borderRadius: 10, fontSize: 12 }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontFamily: 'monospace', color: T.gold, fontWeight: 700 }}>{o.reference}</span>
                      <span style={{ fontSize: 9, fontWeight: 800, padding: '2px 7px', borderRadius: 99,
                        background: o.status === 'paid' ? 'rgba(184,255,60,0.12)' : 'rgba(0,229,255,0.1)',
                        color: o.status === 'paid' ? T.lime : T.cyan,
                        textTransform: 'uppercase', letterSpacing: '0.08em'
                      }}>{o.status}</span>
                    </div>
                    <div style={{ color: T.muted, marginTop: 2 }}>
                      {o.full_name} · {o.items?.length || 0} item{o.items?.length !== 1 ? 's' : ''}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 700, color: T.lime }}>Rs {Number(o.total).toLocaleString()}</div>
                    <div style={{ color: T.muted, fontSize: 11 }}>{new Date(o.created_at).toLocaleDateString()}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Btn variant="ghost" onClick={onClose}>Close</Btn>
          </div>
        </div>
      )}
    </Modal>
  )
}