// src/pages/admin/AdminPL.jsx
// Phase 4: + PDF export (browser print API) + Monthly Budget vs Actual

import { useState, useEffect, useRef } from 'react'
import adminApi from '../../lib/adminApi'
import {
  PageHeader, PageContent, KpiGrid, KpiCard,
  Card, CardHeader, Select, Spinner, Modal, Btn,
  PLSection, PLRow, PLTotal, NetProfitRow, Input, tokens as T
} from '../../components/admin/AdminUI'

// ── Budget helpers (localStorage, no backend) ─────────────────────────────────
const BUDGET_KEY = 'dn_pl_budgets'
function loadBudgets() {
  try { return JSON.parse(localStorage.getItem(BUDGET_KEY) || '{}') }
  catch { return {} }
}
function saveBudgets(b) {
  localStorage.setItem(BUDGET_KEY, JSON.stringify(b))
}

const DEFAULT_BUDGET_CATS = ['Revenue', 'COGS', 'Marketing', 'Delivery / Shipping', 'Platform Fees', 'Packaging', 'Other']

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
  const [budgets,        setBudgets]        = useState(loadBudgets())
  const [budgetEdit,     setBudgetEdit]     = useState(false)
  const [budgetDraft,    setBudgetDraft]    = useState({})
  const printRef = useRef()

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

  const fmtMonth   = m => new Date(m + '-01').toLocaleDateString('en-US', { year: 'numeric', month: 'long' })
  const monthLabel = fmtMonth(month)

  // ── PDF Export via browser print API ─────────────────────────────────────────
  function exportPDF() {
    if (!data) return
    const expRows = data.expenses.length === 0
      ? '<tr><td colspan="2" style="color:#6b6b85;padding:8px 0;">No expenses recorded</td></tr>'
      : data.expenses.map(e =>
          `<tr><td style="padding:7px 0;color:#d0d0e8;">${e.category}</td><td style="text-align:right;color:#ff6b6b;">(Rs ${Math.round(e.total).toLocaleString()})</td></tr>`
        ).join('')

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>P&L Statement — ${monthLabel}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;600;700;900&display=swap');
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'DM Sans', sans-serif; background: #fff; color: #1a1a2e; padding: 40px; font-size: 13px; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 32px; padding-bottom: 20px; border-bottom: 2px solid #e0e0f0; }
    .company { font-size: 22px; font-weight: 900; color: #1a1a2e; }
    .company span { color: #ff2d78; }
    .doc-info { text-align: right; color: #6b6b85; font-size: 12px; line-height: 1.8; }
    .doc-info strong { color: #1a1a2e; font-size: 15px; display: block; }
    table { width: 100%; border-collapse: collapse; }
    .section-header td { padding: 12px 0 4px; font-size: 9px; font-weight: 800; letter-spacing: 0.15em; text-transform: uppercase; color: #ff2d78; border-bottom: 1px solid #e8e8f8; }
    .row td { padding: 8px 0; border-bottom: 1px solid #f0f0f8; }
    .total-row td { padding: 10px 0; font-weight: 700; font-size: 13.5px; border-top: 2px solid #e0e0f0; background: #f8f8ff; }
    .net-row td { padding: 14px 0; font-weight: 900; font-size: 16px; border-top: 3px solid #1a1a2e; }
    .right { text-align: right; font-family: 'DM Sans', monospace; }
    .green { color: #16a34a; }
    .red   { color: #dc2626; }
    .muted { color: #6b6b85; }
    .kpi-grid { display: grid; grid-template-columns: repeat(4,1fr); gap: 16px; margin-bottom: 28px; }
    .kpi { border: 1px solid #e0e0f0; border-radius: 10px; padding: 14px 16px; }
    .kpi-label { font-size: 10px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: #6b6b85; margin-bottom: 4px; }
    .kpi-value { font-size: 18px; font-weight: 900; color: #1a1a2e; }
    .footer { margin-top: 32px; padding-top: 16px; border-top: 1px solid #e0e0f0; font-size: 11px; color: #aaa; text-align: center; }
    @media print { body { padding: 20px; } }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="company">D<span>&</span>N Accessories</div>
      <div style="color:#6b6b85;font-size:12px;margin-top:4px;">Income Statement (Accrual Basis)</div>
    </div>
    <div class="doc-info">
      <strong>Profit & Loss Statement</strong>
      Period: ${monthLabel}<br>
      Generated: ${new Date().toLocaleDateString('en-US', { year:'numeric', month:'long', day:'numeric' })}<br>
      Confirmed sales only
    </div>
  </div>

  <div class="kpi-grid">
    <div class="kpi">
      <div class="kpi-label">Gross Revenue</div>
      <div class="kpi-value">Rs ${Math.round(data.revenue).toLocaleString()}</div>
    </div>
    <div class="kpi">
      <div class="kpi-label">COGS</div>
      <div class="kpi-value">Rs ${Math.round(data.cogs).toLocaleString()}</div>
    </div>
    <div class="kpi">
      <div class="kpi-label">Gross Profit</div>
      <div class="kpi-value ${data.grossProfit >= 0 ? 'green' : 'red'}">Rs ${Math.round(data.grossProfit).toLocaleString()}</div>
    </div>
    <div class="kpi">
      <div class="kpi-label">Net Profit</div>
      <div class="kpi-value ${data.netProfit >= 0 ? 'green' : 'red'}">Rs ${Math.round(data.netProfit).toLocaleString()}</div>
    </div>
  </div>

  <table>
    <tr class="section-header"><td colspan="2">Income</td></tr>
    <tr class="row"><td>Product Sales</td><td class="right green">Rs ${Math.round(data.revenue).toLocaleString()}</td></tr>
    <tr class="total-row"><td>Total Income</td><td class="right green">Rs ${Math.round(data.revenue).toLocaleString()}</td></tr>

    <tr class="section-header"><td colspan="2">Cost of Goods Sold</td></tr>
    <tr class="row"><td>Materials Used in Sales</td><td class="right red">(Rs ${Math.round(data.cogs).toLocaleString()})</td></tr>
    <tr class="total-row"><td>Total COGS</td><td class="right red">(Rs ${Math.round(data.cogs).toLocaleString()})</td></tr>

    <tr class="section-header"><td colspan="2">Operating Expenses</td></tr>
    ${expRows}
    <tr class="total-row"><td>Total Operating Expenses</td><td class="right red">(Rs ${Math.round(data.totalExpenses).toLocaleString()})</td></tr>

    <tr class="net-row">
      <td>Net ${data.netProfit >= 0 ? 'Profit' : 'Loss'}</td>
      <td class="right ${data.netProfit >= 0 ? 'green' : 'red'}">Rs ${Math.round(Math.abs(data.netProfit)).toLocaleString()}</td>
    </tr>
  </table>

  ${data.cogsByProduct?.length > 0 ? `
  <div style="margin-top:28px;">
    <div style="font-size:9px;font-weight:800;letter-spacing:0.12em;text-transform:uppercase;color:#ff2d78;margin-bottom:12px;">Gross Margin by Product</div>
    <table>
      <tr style="background:#f8f8ff;">
        ${['Product','Units','Revenue','COGS','Gross Profit','Margin %'].map(h => `<td style="padding:8px;font-size:10px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#6b6b85;">${h}</td>`).join('')}
      </tr>
      ${data.cogsByProduct.map(p => {
        const rev = (Number(p.selling_price)||0) * (Number(p.total_qty)||0)
        const gp  = rev - Number(p.total_cost)
        const m   = rev > 0 ? (gp/rev*100).toFixed(1) : null
        return `<tr style="border-bottom:1px solid #f0f0f8;">
          <td style="padding:7px 8px;font-weight:600;">${p.product_name}</td>
          <td style="padding:7px 8px;color:#6b6b85;">${p.total_qty}</td>
          <td style="padding:7px 8px;color:#16a34a;">Rs ${rev > 0 ? Math.round(rev).toLocaleString() : '—'}</td>
          <td style="padding:7px 8px;color:#dc2626;">Rs ${Math.round(p.total_cost).toLocaleString()}</td>
          <td style="padding:7px 8px;font-weight:700;color:${gp>=0?'#16a34a':'#dc2626'};">${rev>0?`Rs ${Math.round(gp).toLocaleString()}`:'—'}</td>
          <td style="padding:7px 8px;">${m ? `${m}%` : '—'}</td>
        </tr>`
      }).join('')}
    </table>
  </div>` : ''}

  <div class="footer">D&amp;N Accessories · Accrual-basis P&amp;L · ${monthLabel} · Generated ${new Date().toLocaleDateString()}</div>
</body>
</html>`

    const win = window.open('', '_blank')
    win.document.write(html)
    win.document.close()
    win.onload = () => { win.focus(); win.print() }
  }

  // ── Budget management ─────────────────────────────────────────────────────────
  function openBudgetEdit() {
    const b = budgets[month] || {}
    const draft = {}
    DEFAULT_BUDGET_CATS.forEach(cat => { draft[cat] = b[cat] != null ? String(b[cat]) : '' })
    // also add any expense categories present in data
    if (data?.expenses) {
      data.expenses.forEach(e => {
        if (!draft[e.category]) draft[e.category] = b[e.category] != null ? String(b[e.category]) : ''
      })
    }
    setBudgetDraft(draft)
    setBudgetEdit(true)
  }
  function saveBudgetEdit() {
    const parsed = {}
    Object.entries(budgetDraft).forEach(([k, v]) => {
      const n = parseFloat(v)
      if (!isNaN(n) && n > 0) parsed[k] = n
    })
    const updated = { ...budgets, [month]: parsed }
    setBudgets(updated)
    saveBudgets(updated)
    setBudgetEdit(false)
  }
  const monthBudget = budgets[month] || {}

  // RAG color
  function ragColor(actual, budget) {
    if (!budget) return T.muted
    const pct = actual / budget
    if (pct <= 0.85) return T.lime
    if (pct <= 1.0)  return T.gold
    return T.pink
  }
  function ragBg(actual, budget) {
    if (!budget) return 'transparent'
    const pct = actual / budget
    if (pct <= 0.85) return 'rgba(184,255,60,0.10)'
    if (pct <= 1.0)  return 'rgba(255,197,61,0.10)'
    return 'rgba(255,45,120,0.10)'
  }

  return (
    <>
      <PageHeader
        title="Profit & Loss"
        subtitle="Accrual basis — confirmed sales only"
        action={
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {tab === 'statement' && data && (
              <>
                <Btn size="sm" variant="ghost" onClick={openBudgetEdit}>⚙ Budget</Btn>
                <Btn size="sm" variant="ghost" onClick={exportPDF}>⬇ PDF</Btn>
              </>
            )}
            <Select value={month} onChange={e => setMonth(e.target.value)} style={{ width: 'auto', padding: '7px 12px', fontSize: 12 }}>
              {months.map(m => <option key={m} value={m}>{fmtMonth(m)}</option>)}
            </Select>
          </div>
        }
      />

      <PageContent>

        {/* ── Tab switcher ── */}
        <div style={{ display: 'flex', gap: 2, marginBottom: 20, background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: 4, width: 'fit-content' }}>
          {[
            { k: 'statement', l: 'Income Statement' },
            { k: 'budget',    l: 'Budget vs Actual' },
            { k: 'compare',   l: 'Compare Months'   },
          ].map(t => (
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

              {data.stockValuation && (
                <div style={{ padding: '10px 16px', marginBottom: 16, background: 'rgba(0,229,255,0.06)', border: '1px solid rgba(0,229,255,0.18)', borderRadius: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 12, color: T.cyan }}>Closing stock value (current inventory at avg cost)</span>
                  <span style={{ fontSize: 14, fontWeight: 900, color: T.cyan }}>Rs {Math.round(data.stockValuation.total_value).toLocaleString()}</span>
                </div>
              )}

              {data.noRecipe?.length > 0 && (
                <div style={{ padding: '12px 16px', marginBottom: 16, background: 'rgba(255,197,61,0.08)', border: '1px solid rgba(255,197,61,0.25)', borderRadius: 12, fontSize: 12, color: T.gold }}>
                  ⚠ {data.noRecipe.length} product{data.noRecipe.length > 1 ? 's' : ''} sold without a recipe — COGS may be understated.
                  <span style={{ color: T.muted, marginLeft: 8 }}>({data.noRecipe.map(p => p.product_name).join(', ')})</span>
                </div>
              )}

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

        {/* ── BUDGET VS ACTUAL TAB ── */}
        {tab === 'budget' && (
          loading || !data ? <Spinner /> : (
            <>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <div style={{ fontSize: 12, color: T.muted }}>
                  Budgets are stored locally in this browser.
                  <span style={{ marginLeft: 8, padding: '2px 8px', background: 'rgba(184,255,60,0.1)', color: T.lime, borderRadius: 99, fontSize: 11, fontWeight: 700 }}>Green ≤85%</span>
                  <span style={{ marginLeft: 6, padding: '2px 8px', background: 'rgba(255,197,61,0.1)', color: T.gold, borderRadius: 99, fontSize: 11, fontWeight: 700 }}>Amber ≤100%</span>
                  <span style={{ marginLeft: 6, padding: '2px 8px', background: 'rgba(255,45,120,0.1)', color: T.pink, borderRadius: 99, fontSize: 11, fontWeight: 700 }}>Red &gt;100%</span>
                </div>
                <Btn size="sm" variant="ghost" onClick={openBudgetEdit}>⚙ Edit Budgets</Btn>
              </div>

              <Card>
                <div style={{ padding: '14px 20px', borderBottom: `1px solid ${T.border}` }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: T.text }}>Budget vs Actual — {monthLabel}</span>
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead>
                      <tr>
                        {['Category', 'Budget (Rs)', 'Actual (Rs)', 'Variance', '% Used', 'Status'].map((h, i) => (
                          <th key={i} style={{ padding: '10px 16px', textAlign: i >= 1 ? 'right' : 'left', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: T.muted, borderBottom: `1px solid ${T.border}` }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {/* Revenue row */}
                      {(() => {
                        const actual = data.revenue
                        const budget = monthBudget['Revenue'] || 0
                        const variance = actual - budget
                        const pct = budget > 0 ? (actual / budget * 100) : null
                        const isGood = actual >= budget
                        return (
                          <tr className="dn-tr">
                            <td style={{ padding: '12px 16px', borderBottom: `1px solid ${T.border}`, fontWeight: 600, color: T.text }}>Revenue</td>
                            <td style={{ padding: '12px 16px', borderBottom: `1px solid ${T.border}`, color: T.muted, textAlign: 'right', fontFamily: T.mono }}>{budget > 0 ? `Rs ${budget.toLocaleString()}` : '—'}</td>
                            <td style={{ padding: '12px 16px', borderBottom: `1px solid ${T.border}`, color: T.lime, textAlign: 'right', fontFamily: T.mono, fontWeight: 700 }}>Rs {Math.round(actual).toLocaleString()}</td>
                            <td style={{ padding: '12px 16px', borderBottom: `1px solid ${T.border}`, textAlign: 'right', fontFamily: T.mono, color: budget > 0 ? (isGood ? T.lime : T.pink) : T.muted }}>
                              {budget > 0 ? `${variance >= 0 ? '+' : ''}Rs ${Math.round(variance).toLocaleString()}` : '—'}
                            </td>
                            <td style={{ padding: '12px 16px', borderBottom: `1px solid ${T.border}`, textAlign: 'right', color: T.muted }}>
                              {pct !== null ? `${pct.toFixed(0)}%` : '—'}
                            </td>
                            <td style={{ padding: '12px 16px', borderBottom: `1px solid ${T.border}`, textAlign: 'right' }}>
                              {budget > 0 ? (
                                <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 99,
                                  background: ragBg(actual, budget), color: ragColor(actual, budget) }}>
                                  {isGood ? '✓ On track' : '⚠ Under'}
                                </span>
                              ) : <span style={{ color: T.muted, fontSize: 11 }}>No budget</span>}
                            </td>
                          </tr>
                        )
                      })()}

                      {/* COGS row */}
                      {(() => {
                        const actual = data.cogs
                        const budget = monthBudget['COGS'] || 0
                        const variance = budget - actual
                        const pct = budget > 0 ? (actual / budget * 100) : null
                        const overBudget = budget > 0 && actual > budget
                        return (
                          <tr className="dn-tr">
                            <td style={{ padding: '12px 16px', borderBottom: `1px solid ${T.border}`, fontWeight: 600, color: T.text }}>COGS</td>
                            <td style={{ padding: '12px 16px', borderBottom: `1px solid ${T.border}`, color: T.muted, textAlign: 'right', fontFamily: T.mono }}>{budget > 0 ? `Rs ${budget.toLocaleString()}` : '—'}</td>
                            <td style={{ padding: '12px 16px', borderBottom: `1px solid ${T.border}`, color: T.pink, textAlign: 'right', fontFamily: T.mono, fontWeight: 700 }}>Rs {Math.round(actual).toLocaleString()}</td>
                            <td style={{ padding: '12px 16px', borderBottom: `1px solid ${T.border}`, textAlign: 'right', fontFamily: T.mono, color: budget > 0 ? (!overBudget ? T.lime : T.pink) : T.muted }}>
                              {budget > 0 ? `${variance >= 0 ? '+' : ''}Rs ${Math.round(variance).toLocaleString()} saved` : '—'}
                            </td>
                            <td style={{ padding: '12px 16px', borderBottom: `1px solid ${T.border}`, textAlign: 'right', color: T.muted }}>
                              {pct !== null ? `${pct.toFixed(0)}%` : '—'}
                            </td>
                            <td style={{ padding: '12px 16px', borderBottom: `1px solid ${T.border}`, textAlign: 'right' }}>
                              {budget > 0 ? (
                                <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 99,
                                  background: ragBg(actual, budget), color: ragColor(actual, budget) }}>
                                  {overBudget ? '⚠ Over' : '✓ On track'}
                                </span>
                              ) : <span style={{ color: T.muted, fontSize: 11 }}>No budget</span>}
                            </td>
                          </tr>
                        )
                      })()}

                      {/* Expense rows */}
                      {data.expenses.map((e, i) => {
                        const actual     = e.total
                        const budget     = monthBudget[e.category] || 0
                        const variance   = budget - actual
                        const pct        = budget > 0 ? (actual / budget * 100) : null
                        const overBudget = budget > 0 && actual > budget
                        return (
                          <tr key={i} className="dn-tr">
                            <td style={{ padding: '12px 16px', borderBottom: `1px solid ${T.border}`, color: T.muted }}>{e.category}</td>
                            <td style={{ padding: '12px 16px', borderBottom: `1px solid ${T.border}`, color: T.muted, textAlign: 'right', fontFamily: T.mono }}>{budget > 0 ? `Rs ${budget.toLocaleString()}` : '—'}</td>
                            <td style={{ padding: '12px 16px', borderBottom: `1px solid ${T.border}`, color: T.text, textAlign: 'right', fontFamily: T.mono }}>Rs {Math.round(actual).toLocaleString()}</td>
                            <td style={{ padding: '12px 16px', borderBottom: `1px solid ${T.border}`, textAlign: 'right', fontFamily: T.mono, color: budget > 0 ? (!overBudget ? T.lime : T.pink) : T.muted }}>
                              {budget > 0 ? `${variance >= 0 ? 'Rs ' + Math.round(variance).toLocaleString() + ' left' : '(Rs ' + Math.round(Math.abs(variance)).toLocaleString() + ' over)'}` : '—'}
                            </td>
                            <td style={{ padding: '12px 16px', borderBottom: `1px solid ${T.border}`, textAlign: 'right', color: T.muted }}>
                              {pct !== null ? (
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8 }}>
                                  <div style={{ width: 60, height: 4, background: T.faint, borderRadius: 99, overflow: 'hidden' }}>
                                    <div style={{ height: '100%', width: `${Math.min(pct, 100)}%`, background: ragColor(actual, budget), borderRadius: 99, transition: 'width 0.3s' }} />
                                  </div>
                                  {pct.toFixed(0)}%
                                </div>
                              ) : '—'}
                            </td>
                            <td style={{ padding: '12px 16px', borderBottom: `1px solid ${T.border}`, textAlign: 'right' }}>
                              {budget > 0 ? (
                                <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 99,
                                  background: ragBg(actual, budget), color: ragColor(actual, budget) }}>
                                  {overBudget ? '⚠ Over' : pct > 85 ? '⚡ Near limit' : '✓ On track'}
                                </span>
                              ) : <span style={{ color: T.muted, fontSize: 11 }}>No budget</span>}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
                {Object.keys(monthBudget).length === 0 && (
                  <div style={{ padding: '24px', textAlign: 'center' }}>
                    <div style={{ fontSize: 13, color: T.muted, marginBottom: 12 }}>No budget set for {monthLabel}.</div>
                    <Btn onClick={openBudgetEdit}>⚙ Set Budget for This Month</Btn>
                  </div>
                )}
              </Card>
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

      {/* ── Budget Edit Modal ── */}
      {budgetEdit && (
        <Modal title={`Set Monthly Budget — ${monthLabel}`} onClose={() => setBudgetEdit(false)} width={480}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ fontSize: 12, color: T.muted, marginBottom: 4 }}>
              Set budget targets for this month. Stored locally in your browser.
            </div>
            {Object.entries(budgetDraft).map(([cat, val]) => (
              <div key={cat} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, alignItems: 'center' }}>
                <div style={{ fontSize: 13, color: T.text, fontWeight: 600 }}>{cat}</div>
                <Input
                  type="number"
                  placeholder="Leave blank for no budget"
                  value={val}
                  onChange={e => setBudgetDraft(d => ({ ...d, [cat]: e.target.value }))}
                />
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20, paddingTop: 16, borderTop: `1px solid ${T.border}` }}>
            <Btn variant="ghost" onClick={() => setBudgetEdit(false)}>Cancel</Btn>
            <Btn onClick={saveBudgetEdit}>Save Budget</Btn>
          </div>
        </Modal>
      )}

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