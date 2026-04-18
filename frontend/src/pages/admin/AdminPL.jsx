import { useState, useEffect } from 'react'
import adminApi from '../../lib/adminApi'
import {
  PageHeader, PageContent, KpiGrid, KpiCard,
  Card, CardHeader, Select, Spinner, Modal, Btn,
  PLSection, PLRow, PLTotal, NetProfitRow, tokens as T
} from '../../components/admin/AdminUI'

export default function AdminPL() {
  const [data,         setData]         = useState(null)
  const [month,        setMonth]        = useState(new Date().toISOString().slice(0, 7))
  const [loading,      setLoading]      = useState(true)
  const [drill,        setDrill]        = useState(null)
  const [tab,          setTab]          = useState('statement')
  const [compareData,  setCompareData]  = useState(null)
  const [compareMonth, setCompareMonth] = useState(() => {
    const d = new Date(); d.setMonth(d.getMonth() - 1)
    return d.toISOString().slice(0, 7)
  })
  const [compareLoading, setCompareLoading] = useState(false)

  useEffect(() => { load() }, [month])

  async function load() {
    setLoading(true)
    try {
      const res = await adminApi.get('/finance/pl', { params: { month } })
      setData(res.data)
    } finally { setLoading(false) }
  }

  async function loadCompare() {
    setCompareLoading(true)
    try {
      const res = await adminApi.get('/finance/pl/compare', { params: { month1: month, month2: compareMonth } })
      setCompareData(res.data)
    } finally { setCompareLoading(false) }
  }

  useEffect(() => {
    if (tab === 'compare') loadCompare()
  }, [tab, month, compareMonth])

  const months = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(); d.setMonth(d.getMonth() - i)
    return d.toISOString().slice(0, 7)
  })

  const fmtMonth  = m => new Date(m + '-01').toLocaleDateString('en-US', { year: 'numeric', month: 'long' })
  const monthLabel = fmtMonth(month)

  return (
    <>
      <PageHeader
        title="Profit & Loss"
        subtitle="Accrual basis — confirmed sales only"
        action={
          <Select value={month} onChange={e => setMonth(e.target.value)} style={{ width: 'auto', padding: '7px 12px', fontSize: 12 }}>
            {months.map(m => <option key={m} value={m}>{fmtMonth(m)}</option>)}
          </Select>
        }
      />

      <PageContent>

        {/* ── Tab switcher ── */}
        <div style={{ display: 'flex', gap: 2, marginBottom: 20, background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: 4, width: 'fit-content' }}>
          {[{ k: 'statement', l: 'Income Statement' }, { k: 'compare', l: 'Compare Months' }].map(t => (
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

        {/* ── INCOME STATEMENT TAB ── */}
        {tab === 'statement' && (
          loading || !data ? <Spinner /> : (
            <>
              <KpiGrid>
                <KpiCard label="Gross Revenue"      value={`Rs ${Math.round(data.revenue).toLocaleString()}`} accent />
                <KpiCard label="Cost of Goods Sold" value={`Rs ${Math.round(data.cogs).toLocaleString()}`} />
                <KpiCard label="Gross Profit"       value={`Rs ${Math.round(data.grossProfit).toLocaleString()}`}
                  changeUp={data.grossProfit > 0}
                  change={data.revenue > 0 ? `${((data.grossProfit / data.revenue) * 100).toFixed(0)}% margin` : ''} />
                <KpiCard label="Net Profit"         value={`Rs ${Math.round(data.netProfit).toLocaleString()}`}
                  changeUp={data.netProfit > 0}
                  change={data.revenue > 0 ? `${((data.netProfit / data.revenue) * 100).toFixed(0)}% margin` : ''} />
              </KpiGrid>

              {/* Cost variance alerts */}
              {data.costVariances?.length > 0 && (
                <div style={{ padding: '12px 16px', marginBottom: 16, background: 'rgba(255,197,61,0.08)', border: '1px solid rgba(255,197,61,0.25)', borderRadius: 12 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: T.gold, marginBottom: 8, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                    ⚠ Material cost variances detected
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {data.costVariances.map((v, i) => (
                      <span key={i} style={{ fontSize: 11, padding: '3px 10px', borderRadius: 99,
                        background: v.variance_pct > 0 ? 'rgba(255,45,120,0.12)' : 'rgba(184,255,60,0.1)',
                        color: v.variance_pct > 0 ? T.pink : T.lime, fontWeight: 600 }}>
                        {v.name} {v.variance_pct > 0 ? '+' : ''}{v.variance_pct}%
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Stock valuation */}
              {data.stockValuation && (
                <div style={{ padding: '10px 16px', marginBottom: 16, background: 'rgba(0,229,255,0.06)', border: '1px solid rgba(0,229,255,0.18)', borderRadius: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 12, color: T.cyan }}>Closing stock value (current inventory at avg cost)</span>
                  <span style={{ fontSize: 14, fontWeight: 900, color: T.cyan }}>Rs {Math.round(data.stockValuation.total_value).toLocaleString()}</span>
                </div>
              )}

              {/* No recipe warning */}
              {data.noRecipe?.length > 0 && (
                <div style={{ padding: '12px 16px', marginBottom: 16, background: 'rgba(255,197,61,0.08)', border: '1px solid rgba(255,197,61,0.25)', borderRadius: 12, fontSize: 12, color: T.gold }}>
                  ⚠ {data.noRecipe.length} product{data.noRecipe.length > 1 ? 's' : ''} sold without a recipe — COGS may be understated.
                  <span style={{ color: T.muted, marginLeft: 8 }}>({data.noRecipe.map(p => p.product_name).join(', ')})</span>
                </div>
              )}

              {/* Income statement card */}
              <Card>
                <div style={{ padding: '16px 20px', borderBottom: `1px solid ${T.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: T.text }}>Income Statement</span>
                  <span style={{ fontSize: 11, color: T.muted }}>{monthLabel}</span>
                </div>

                <PLSection title="INCOME" />
                <ClickablePLRow label="Product Sales" value={data.revenue} positive onClick={() => setDrill('revenue')} />
                <PLTotal label="Total Income" value={data.revenue} />

                <PLSection title="COST OF GOODS SOLD" />
                <ClickablePLRow label="Materials Used in Sales" value={-data.cogs} onClick={() => setDrill('cogs')} hint="Click to see breakdown" />
                <PLTotal label="Total COGS" value={-data.cogs} />

                <PLSection title="OPERATING EXPENSES" />
                {data.expenses.length === 0
                  ? <PLRow label="No expenses recorded" value={0} muted />
                  : data.expenses.map((e, i) => <PLRow key={i} label={e.category} value={-e.total} />)
                }
                <PLTotal label="Total OpEx" value={-data.totalExpenses} />

                <NetProfitRow value={data.netProfit} />

                {data.billsThisPeriod && (
                  <div style={{ padding: '12px 20px', borderTop: `1px solid ${T.border}`, display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                    <span style={{ color: T.muted }}>Supplier bills this period (AP — not P&L)</span>
                    <div style={{ display: 'flex', gap: 20 }}>
                      <span style={{ color: T.text }}>Billed: Rs {Math.round(data.billsThisPeriod.total || 0).toLocaleString()}</span>
                      <span style={{ color: data.billsThisPeriod.outstanding > 0 ? T.pink : T.lime }}>
                        Outstanding: Rs {Math.round(data.billsThisPeriod.outstanding || 0).toLocaleString()}
                      </span>
                    </div>
                  </div>
                )}
              </Card>

              {/* Gross margin per product */}
              {data.cogsByProduct?.length > 0 && (
                <Card>
                  <CardHeader title="Gross Margin by Product" />
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                      <thead>
                        <tr>
                          {['Product', 'Units Sold', 'Revenue', 'COGS', 'Gross Profit', 'Margin %'].map((h, i) => (
                            <th key={i} style={{ padding: '10px 16px', textAlign: i > 1 ? 'right' : 'left', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: T.muted, borderBottom: `1px solid ${T.border}`, whiteSpace: 'nowrap' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {data.cogsByProduct.map((p, i) => {
                          const rev        = (Number(p.selling_price) || 0) * (Number(p.total_qty) || 0)
                          const grossProfit = rev - Number(p.total_cost)
                          const margin     = rev > 0 ? (grossProfit / rev) * 100 : null
                          const marginColor = margin === null ? T.muted : margin < 20 ? T.pink : margin < 40 ? T.gold : T.lime
                          return (
                            <tr key={i} className="dn-tr">
                              <td style={{ padding: '11px 16px', borderBottom: `1px solid ${T.border}`, fontWeight: 600, color: T.text }}>{p.product_name}</td>
                              <td style={{ padding: '11px 16px', borderBottom: `1px solid ${T.border}`, color: T.muted, textAlign: 'right' }}>{p.total_qty}</td>
                              <td style={{ padding: '11px 16px', borderBottom: `1px solid ${T.border}`, color: T.lime, textAlign: 'right', fontFamily: T.mono }}>{rev > 0 ? `Rs ${Math.round(rev).toLocaleString()}` : '—'}</td>
                              <td style={{ padding: '11px 16px', borderBottom: `1px solid ${T.border}`, color: T.pink, textAlign: 'right', fontFamily: T.mono }}>Rs {Math.round(p.total_cost).toLocaleString()}</td>
                              <td style={{ padding: '11px 16px', borderBottom: `1px solid ${T.border}`, color: grossProfit >= 0 ? T.lime : T.pink, textAlign: 'right', fontFamily: T.mono, fontWeight: 700 }}>
                                {rev > 0 ? `Rs ${Math.round(grossProfit).toLocaleString()}` : '—'}
                              </td>
                              <td style={{ padding: '11px 16px', borderBottom: `1px solid ${T.border}`, textAlign: 'right' }}>
                                {margin !== null ? (
                                  <span style={{ fontSize: 12, fontWeight: 700, padding: '3px 10px', borderRadius: 99,
                                    background: margin < 20 ? 'rgba(255,45,120,0.12)' : margin < 40 ? 'rgba(255,197,61,0.12)' : 'rgba(184,255,60,0.12)',
                                    color: marginColor }}>
                                    {margin.toFixed(1)}%
                                  </span>
                                ) : <span style={{ color: T.muted }}>—</span>}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                  <div style={{ padding: '10px 16px', fontSize: 11, color: T.muted, borderTop: `1px solid ${T.border}` }}>
                    <span style={{ color: T.pink, fontWeight: 700 }}>Red &lt;20%</span> · <span style={{ color: T.gold, fontWeight: 700 }}>Amber 20–40%</span> · <span style={{ color: T.lime, fontWeight: 700 }}>Green &gt;40%</span>
                  </div>
                </Card>
              )}
            </>
          )
        )}

        {/* ── COMPARE MONTHS TAB ── */}
        {tab === 'compare' && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
              <span style={{ fontSize: 12, color: T.muted }}>Compare with:</span>
              <Select value={compareMonth} onChange={e => setCompareMonth(e.target.value)} style={{ width: 'auto', padding: '7px 12px', fontSize: 12 }}>
                {months.map(m => <option key={m} value={m}>{fmtMonth(m)}</option>)}
              </Select>
            </div>

            {compareLoading ? <Spinner /> : compareData ? (
              <Card>
                <div style={{ padding: '14px 20px', borderBottom: `1px solid ${T.border}`, display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: T.text }}>Month Comparison</span>
                  <div style={{ display: 'flex', gap: 20, fontSize: 12 }}>
                    <span style={{ color: T.cyan,   fontWeight: 700 }}>{fmtMonth(month)}</span>
                    <span style={{ color: T.muted }}>vs</span>
                    <span style={{ color: T.purple, fontWeight: 700 }}>{fmtMonth(compareMonth)}</span>
                  </div>
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead>
                      <tr>
                        {['Metric', fmtMonth(month), fmtMonth(compareMonth), 'Change'].map((h, i) => (
                          <th key={i} style={{ padding: '10px 16px', textAlign: i === 0 ? 'left' : 'right', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: i === 1 ? T.cyan : i === 2 ? T.purple : T.muted, borderBottom: `1px solid ${T.border}` }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        { label: 'Revenue',       a: compareData.a.revenue,       b: compareData.b.revenue,       fmt: v => `Rs ${Math.round(v).toLocaleString()}`, up: true  },
                        { label: 'COGS',           a: compareData.a.cogs,          b: compareData.b.cogs,          fmt: v => `Rs ${Math.round(v).toLocaleString()}`, up: false },
                        { label: 'Gross Profit',   a: compareData.a.grossProfit,   b: compareData.b.grossProfit,   fmt: v => `Rs ${Math.round(v).toLocaleString()}`, up: true  },
                        { label: 'Gross Margin %', a: compareData.a.grossMargin,   b: compareData.b.grossMargin,   fmt: v => `${v.toFixed(1)}%`,                     up: true  },
                        { label: 'Expenses',       a: compareData.a.totalExpenses, b: compareData.b.totalExpenses, fmt: v => `Rs ${Math.round(v).toLocaleString()}`, up: false },
                        { label: 'Net Profit',     a: compareData.a.netProfit,     b: compareData.b.netProfit,     fmt: v => `Rs ${Math.round(v).toLocaleString()}`, up: true  },
                        { label: 'Net Margin %',   a: compareData.a.netMargin,     b: compareData.b.netMargin,     fmt: v => `${v.toFixed(1)}%`,                     up: true  },
                      ].map((row, i) => {
                        const diff   = row.a - row.b
                        const pct    = row.b !== 0 ? ((diff / Math.abs(row.b)) * 100) : null
                        const isGood = row.up ? diff >= 0 : diff <= 0
                        const isLast = i === 6
                        return (
                          <tr key={i} className="dn-tr" style={{ background: isLast ? (compareData.a.netProfit >= 0 ? 'rgba(184,255,60,0.04)' : 'rgba(255,45,120,0.04)') : 'transparent' }}>
                            <td style={{ padding: '12px 16px', borderBottom: `1px solid ${T.border}`, color: isLast ? T.text : T.muted, fontWeight: isLast ? 900 : 400 }}>{row.label}</td>
                            <td style={{ padding: '12px 16px', borderBottom: `1px solid ${T.border}`, color: T.cyan,   textAlign: 'right', fontFamily: T.mono, fontWeight: isLast ? 900 : 400 }}>{row.fmt(row.a)}</td>
                            <td style={{ padding: '12px 16px', borderBottom: `1px solid ${T.border}`, color: T.purple, textAlign: 'right', fontFamily: T.mono }}>{row.fmt(row.b)}</td>
                            <td style={{ padding: '12px 16px', borderBottom: `1px solid ${T.border}`, textAlign: 'right' }}>
                              {pct !== null
                                ? <span style={{ fontSize: 11, fontWeight: 700, color: isGood ? T.lime : T.pink }}>{diff >= 0 ? '+' : ''}{pct.toFixed(1)}%</span>
                                : <span style={{ color: T.muted }}>—</span>
                              }
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </Card>
            ) : null}
          </>
        )}

      </PageContent>

      {drill === 'cogs'    && data && <CogsDrillDown    data={data} monthLabel={monthLabel} onClose={() => setDrill(null)} />}
      {drill === 'revenue' && data && <RevenueDrillDown month={month} monthLabel={monthLabel} onClose={() => setDrill(null)} />}
    </>
  )
}

// ── Clickable P&L Row ─────────────────────────────────────────
function ClickablePLRow({ label, value, positive, onClick, hint }) {
  const [hov, setHov] = useState(false)
  const color = positive ? T.lime : value >= 0 ? T.text : T.pink
  return (
    <div onClick={onClick} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 20px', borderBottom: `1px solid ${T.border}`, cursor: 'pointer', background: hov ? 'rgba(255,45,120,0.04)' : 'transparent', transition: 'background 0.15s' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 13, color: T.muted }}>{label}</span>
        {hint && <span style={{ fontSize: 10, color: T.pink, fontWeight: 700, opacity: hov ? 1 : 0.5, transition: 'opacity 0.15s' }}>↗ {hint}</span>}
      </div>
      <span style={{ fontSize: 13, fontWeight: 600, color, fontFamily: "'JetBrains Mono', monospace" }}>
        {value < 0 ? `(Rs ${Math.abs(value).toLocaleString()})` : `Rs ${value.toLocaleString()}`}
      </span>
    </div>
  )
}

// ── COGS Drill-down Modal ─────────────────────────────────────
function CogsDrillDown({ data, monthLabel, onClose }) {
  const [view, setView] = useState('product')
  return (
    <Modal title={`COGS Breakdown — ${monthLabel}`} onClose={onClose} width={620}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 10, padding: '12px 16px' }}>
            <div style={{ fontSize: 10, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>Total COGS</div>
            <div style={{ fontSize: 20, fontWeight: 900, color: T.pink }}>Rs {Math.round(data.cogs).toLocaleString()}</div>
          </div>
          <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 10, padding: '12px 16px' }}>
            <div style={{ fontSize: 10, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>Gross Margin</div>
            <div style={{ fontSize: 20, fontWeight: 900, color: data.grossProfit > 0 ? T.lime : T.pink }}>
              {data.revenue > 0 ? `${((data.grossProfit / data.revenue) * 100).toFixed(1)}%` : '—'}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 2, background: T.surface, border: `1px solid ${T.border}`, borderRadius: 10, padding: 3, width: 'fit-content' }}>
          {[{ k: 'product', l: 'By Product' }, { k: 'material', l: 'By Material' }].map(v => (
            <button key={v.k} onClick={() => setView(v.k)} style={{ padding: '6px 16px', fontSize: 11, fontWeight: 700, borderRadius: 8, border: 'none', cursor: 'pointer', fontFamily: T.font, background: view === v.k ? T.pink : 'transparent', color: view === v.k ? 'white' : T.muted, transition: 'all 0.15s' }}>{v.l}</button>
          ))}
        </div>
        {view === 'product' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {!data.cogsByProduct?.length
              ? <div style={{ color: T.muted, fontSize: 13, textAlign: 'center', padding: '20px 0' }}>No COGS data</div>
              : data.cogsByProduct.map((p, i) => {
                  const pct = data.cogs > 0 ? (p.total_cost / data.cogs) * 100 : 0
                  return (
                    <div key={i} style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 10, padding: '12px 14px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: T.text }}>{p.product_name}</div>
                          <div style={{ fontSize: 11, color: T.muted, marginTop: 2 }}>{p.total_qty} units · {p.order_count} orders</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: 14, fontWeight: 900, color: T.pink }}>Rs {Math.round(p.total_cost).toLocaleString()}</div>
                          <div style={{ fontSize: 11, color: T.muted }}>{pct.toFixed(1)}% of COGS</div>
                        </div>
                      </div>
                      <div style={{ height: 3, background: T.faint, borderRadius: 99, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: `linear-gradient(90deg, ${T.pink}, ${T.purple})`, borderRadius: 99 }} />
                      </div>
                    </div>
                  )
                })}
          </div>
        )}
        {view === 'material' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {!data.cogsByMaterial?.length
              ? <div style={{ color: T.muted, fontSize: 13, textAlign: 'center', padding: '20px 0' }}>No material data</div>
              : data.cogsByMaterial.map((m, i) => {
                  const pct = data.cogs > 0 ? (m.total_cost / data.cogs) * 100 : 0
                  return (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: T.surface, border: `1px solid ${T.border}`, borderRadius: 10, fontSize: 12 }}>
                      <div>
                        <div style={{ fontWeight: 700, color: T.text }}>{m.material_name}</div>
                        <div style={{ color: T.muted, marginTop: 2 }}>{Number(m.total_qty).toFixed(2)} {m.unit} · avg Rs {Number(m.avg_cost).toFixed(2)}</div>
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
        {data.noRecipe?.length > 0 && (
          <div style={{ padding: '10px 14px', background: 'rgba(255,197,61,0.08)', border: '1px solid rgba(255,197,61,0.2)', borderRadius: 10, fontSize: 12, color: T.gold }}>
            ⚠ Products sold without recipe: {data.noRecipe.map(p => `${p.product_name} (×${p.total_qty})`).join(', ')}
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
    Promise.all([
      adminApi.get('/orders', { params: { status: 'paid',    limit: 200 } }),
      adminApi.get('/orders', { params: { status: 'shipped', limit: 200 } }),
    ]).then(([r1, r2]) => {
      const all = [...r1.data, ...r2.data]
        .filter(o => new Date(o.created_at).toISOString().slice(0, 7) === month)
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      setOrders(all)
    }).finally(() => setLoading(false))
  }, [month])
  const total = orders.reduce((s, o) => s + o.total, 0)
  return (
    <Modal title={`Revenue Breakdown — ${monthLabel}`} onClose={onClose} width={580}>
      {loading ? <Spinner /> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 10, padding: '14px 16px', display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 12, color: T.muted }}>{orders.length} confirmed orders</span>
            <span style={{ fontSize: 18, fontWeight: 900, color: T.lime }}>Rs {Math.round(total).toLocaleString()}</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 400, overflowY: 'auto' }}>
            {orders.length === 0
              ? <div style={{ color: T.muted, fontSize: 13, textAlign: 'center', padding: '20px 0' }}>No confirmed orders this period</div>
              : orders.map((o, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: T.surface, border: `1px solid ${T.border}`, borderRadius: 10, fontSize: 12 }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontFamily: 'monospace', color: T.gold, fontWeight: 700 }}>{o.reference}</span>
                      <span style={{ fontSize: 9, fontWeight: 800, padding: '2px 7px', borderRadius: 99,
                        background: o.status === 'paid' ? 'rgba(184,255,60,0.12)' : 'rgba(0,229,255,0.1)',
                        color: o.status === 'paid' ? T.lime : T.cyan, textTransform: 'uppercase' }}>{o.status}</span>
                    </div>
                    <div style={{ color: T.muted, marginTop: 2 }}>{o.full_name} · {o.items?.length || 0} items</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 700, color: T.lime }}>Rs {Number(o.total).toLocaleString()}</div>
                    <div style={{ color: T.muted, fontSize: 11 }}>{new Date(o.created_at).toLocaleDateString()}</div>
                  </div>
                </div>
              ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Btn variant="ghost" onClick={onClose}>Close</Btn>
          </div>
        </div>
      )}
    </Modal>
  )
}