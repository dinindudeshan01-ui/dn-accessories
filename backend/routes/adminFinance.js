const express   = require('express')
const router    = express.Router()
const db        = require('../db')
const adminAuth = require('../middleware/adminAuth')
const { auditLog } = require('../middleware/auditLog')

// ── EXPENSES ──────────────────────────────────────────────────

router.get('/expenses', adminAuth, async (req, res) => {
  const { month } = req.query
  const expenses = month
    ? await db.prepare("SELECT * FROM expenses WHERE strftime('%Y-%m', date) = ? ORDER BY date DESC").all(month)
    : await db.prepare('SELECT * FROM expenses ORDER BY date DESC LIMIT 200').all()
  res.json(expenses)
})

router.post('/expenses', adminAuth, async (req, res) => {
  const { description, category, amount, date } = req.body
  if (!description || !amount) return res.status(400).json({ error: 'Missing fields' })
  const result = await db.prepare(
    'INSERT INTO expenses (description, category, amount, date) VALUES (?,?,?,?)'
  ).run(description, category || 'Other', parseFloat(amount), date || new Date().toISOString().split('T')[0])
  const expense = await db.prepare('SELECT * FROM expenses WHERE id = ?').get(result.lastInsertRowid)
  auditLog({ req, action: 'CREATE', entity: 'expense', entityId: expense.id, description: `Added expense "${description}" Rs ${amount}`, newValue: expense })
  res.json(expense)
})

router.put('/expenses/:id', adminAuth, async (req, res) => {
  try {
    const old = await db.prepare('SELECT * FROM expenses WHERE id = ?').get(req.params.id)
    if (!old) return res.status(404).json({ error: 'Not found' })
    const { description, category, amount, date } = req.body
    const changes = {}
    if (description !== undefined && description !== old.description)     changes.description = { from: old.description, to: description }
    if (category    !== undefined && category    !== old.category)        changes.category    = { from: old.category,    to: category }
    if (amount      !== undefined && parseFloat(amount) !== old.amount)   changes.amount      = { from: old.amount,      to: parseFloat(amount) }
    if (date        !== undefined && date        !== old.date)            changes.date        = { from: old.date,        to: date }
    await db.prepare(`UPDATE expenses SET description=?,category=?,amount=?,date=? WHERE id=?`).run(
      description !== undefined ? description : old.description,
      category    !== undefined ? category    : old.category,
      amount      !== undefined ? parseFloat(amount) : old.amount,
      date        !== undefined ? date        : old.date,
      req.params.id
    )
    const updated = await db.prepare('SELECT * FROM expenses WHERE id = ?').get(req.params.id)
    auditLog({ req, action: 'UPDATE', entity: 'expense', entityId: req.params.id,
      description: `Edited expense "${updated.description}" — changed: ${Object.keys(changes).join(', ') || 'nothing'}`,
      oldValue: old, newValue: updated })
    res.json({ ...updated, changes })
  } catch (err) {
    console.error('Expense edit error:', err)
    res.status(500).json({ error: err.message })
  }
})

router.delete('/expenses/:id', adminAuth, async (req, res) => {
  const old = await db.prepare('SELECT * FROM expenses WHERE id = ?').get(req.params.id)
  if (!old) return res.status(404).json({ error: 'Not found' })
  await db.prepare('INSERT INTO archive_expenses (original_id, data_json, deleted_by_email) VALUES (?,?,?)').run(old.id, JSON.stringify(old), req.admin.email)
  await db.prepare('DELETE FROM expenses WHERE id = ?').run(req.params.id)
  auditLog({ req, action: 'DELETE', entity: 'expense', entityId: req.params.id, description: `Deleted expense "${old.description}" Rs ${old.amount}`, oldValue: old })
  res.json({ success: true })
})

// ── P&L ───────────────────────────────────────────────────────
router.get('/pl', adminAuth, async (req, res) => {
  try {
    const { month } = req.query
    const revFilter  = month ? `WHERE status IN ('paid','shipped') AND strftime('%Y-%m', created_at) = ?` : `WHERE status IN ('paid','shipped')`
    const cogsFilter = month ? `WHERE strftime('%Y-%m', date) = ?` : 'WHERE 1=1'
    const expFilter  = month ? `WHERE strftime('%Y-%m', date) = ?` : 'WHERE 1=1'

    const revRow = month
      ? await db.prepare(`SELECT COALESCE(SUM(total), 0) as total FROM orders ${revFilter}`).get(month)
      : await db.prepare(`SELECT COALESCE(SUM(total), 0) as total FROM orders ${revFilter}`).get()
    const revenue = Number(revRow?.total ?? 0)

    const cogsRow = month
      ? await db.prepare(`SELECT COALESCE(SUM(line_cost), 0) as total FROM order_cogs ${cogsFilter}`).get(month)
      : await db.prepare(`SELECT COALESCE(SUM(line_cost), 0) as total FROM order_cogs ${cogsFilter}`).get()
    const cogs = Number(cogsRow?.total ?? 0)

    const cogsByProduct = month
      ? await db.prepare(`
          SELECT
            oc.product_name,
            SUM(oc.qty_sold)            as total_qty,
            SUM(oc.line_cost)           as total_cost,
            COUNT(DISTINCT oc.order_id) as order_count,
            MAX(p.price)                as selling_price,
            MAX(p.cost_price)           as cost_price
          FROM order_cogs oc
          LEFT JOIN products p ON p.name = oc.product_name
          ${cogsFilter} AND oc.material_name != 'No recipe'
          GROUP BY oc.product_name
          ORDER BY total_cost DESC
        `).all(month)
      : await db.prepare(`
          SELECT
            oc.product_name,
            SUM(oc.qty_sold)            as total_qty,
            SUM(oc.line_cost)           as total_cost,
            COUNT(DISTINCT oc.order_id) as order_count,
            MAX(p.price)                as selling_price,
            MAX(p.cost_price)           as cost_price
          FROM order_cogs oc
          LEFT JOIN products p ON p.name = oc.product_name
          WHERE oc.material_name != 'No recipe'
          GROUP BY oc.product_name
          ORDER BY total_cost DESC
        `).all()

    const cogsByMaterial = month
      ? await db.prepare(`
          SELECT material_name, unit, SUM(qty_used) as total_qty, AVG(unit_cost) as avg_cost, SUM(line_cost) as total_cost
          FROM order_cogs ${cogsFilter} AND material_name != 'No recipe'
          GROUP BY material_name ORDER BY total_cost DESC
        `).all(month)
      : await db.prepare(`
          SELECT material_name, unit, SUM(qty_used) as total_qty, AVG(unit_cost) as avg_cost, SUM(line_cost) as total_cost
          FROM order_cogs WHERE material_name != 'No recipe'
          GROUP BY material_name ORDER BY total_cost DESC
        `).all()

    const noRecipe = month
      ? await db.prepare(`SELECT product_name, SUM(qty_sold) as total_qty FROM order_cogs ${cogsFilter} AND material_name = 'No recipe' GROUP BY product_name`).all(month)
      : await db.prepare(`SELECT product_name, SUM(qty_sold) as total_qty FROM order_cogs WHERE material_name = 'No recipe' GROUP BY product_name`).all()

    const expenseRows = month
      ? await db.prepare(`SELECT category, COALESCE(SUM(amount), 0) as total FROM expenses ${expFilter} GROUP BY category`).all(month)
      : await db.prepare(`SELECT category, COALESCE(SUM(amount), 0) as total FROM expenses GROUP BY category`).all()
    const totalExpenses = expenseRows.reduce((s, r) => s + Number(r.total ?? 0), 0)

    const stockValuation = await db.prepare(`
      SELECT
        COALESCE(SUM(qty_in_stock * avg_cost), 0) as total_value,
        COUNT(*) as material_count,
        SUM(CASE WHEN qty_in_stock <= 0 THEN 1 ELSE 0 END) as out_of_stock_count
      FROM materials
    `).get()

    const costVariances = await db.prepare(`
      SELECT
        m.id, m.name, m.unit, m.avg_cost,
        recent.unit_cost as last_purchase_cost,
        ROUND(((recent.unit_cost - m.avg_cost) / NULLIF(m.avg_cost, 0)) * 100, 1) as variance_pct
      FROM materials m
      JOIN (
        SELECT material_id, unit_cost
        FROM material_cost_history
        WHERE source = 'bill'
        GROUP BY material_id
        HAVING MAX(date)
        ORDER BY date DESC
      ) recent ON recent.material_id = m.id
      WHERE ABS((recent.unit_cost - m.avg_cost) / NULLIF(m.avg_cost, 0)) > 0.10
      ORDER BY ABS((recent.unit_cost - m.avg_cost) / NULLIF(m.avg_cost, 0)) DESC
      LIMIT 10
    `).all()

    const billsThisPeriod = month
      ? await db.prepare(`
          SELECT
            COALESCE(SUM(b.total), 0) as total,
            COALESCE(SUM(b.total) - SUM(COALESCE(bp.paid, 0)), 0) as outstanding
          FROM purchase_bills b
          LEFT JOIN (
            SELECT bill_id, SUM(amount) as paid FROM bill_payments WHERE voided = 0 GROUP BY bill_id
          ) bp ON bp.bill_id = b.id
          WHERE strftime('%Y-%m', b.bill_date) = ?
        `).get(month)
      : null

    res.json({
      revenue, cogs,
      grossProfit:    revenue - cogs,
      totalExpenses,
      netProfit:      revenue - cogs - totalExpenses,
      expenses:       expenseRows,
      cogsByProduct,
      cogsByMaterial,
      noRecipe,
      billsThisPeriod,
      stockValuation,
      costVariances,
    })

  } catch (e) {
    console.error('PL ERROR:', e.message)
    res.status(500).json({ error: e.message })
  }
})

// ── P&L comparison — two months side by side ─────────────────
router.get('/pl/compare', adminAuth, async (req, res) => {
  try {
    const { month1, month2 } = req.query
    if (!month1 || !month2) return res.status(400).json({ error: 'month1 and month2 required' })

    async function getMonthSummary(month) {
      const revRow  = await db.prepare(`SELECT COALESCE(SUM(total),0) as total FROM orders WHERE status IN ('paid','shipped') AND strftime('%Y-%m', created_at) = ?`).get(month)
      const cogsRow = await db.prepare(`SELECT COALESCE(SUM(line_cost),0) as total FROM order_cogs WHERE strftime('%Y-%m', date) = ?`).get(month)
      const expRow  = await db.prepare(`SELECT COALESCE(SUM(amount),0) as total FROM expenses WHERE strftime('%Y-%m', date) = ?`).get(month)
      const revenue       = Number(revRow?.total  ?? 0)
      const cogs          = Number(cogsRow?.total ?? 0)
      const totalExpenses = Number(expRow?.total  ?? 0)
      return {
        month,
        revenue,
        cogs,
        grossProfit:  revenue - cogs,
        totalExpenses,
        netProfit:    revenue - cogs - totalExpenses,
        grossMargin:  revenue > 0 ? ((revenue - cogs) / revenue) * 100 : 0,
        netMargin:    revenue > 0 ? ((revenue - cogs - totalExpenses) / revenue) * 100 : 0,
      }
    }

    const [a, b] = await Promise.all([getMonthSummary(month1), getMonthSummary(month2)])
    res.json({ a, b })
  } catch (e) {
    console.error('PL compare error:', e.message)
    res.status(500).json({ error: e.message })
  }
})

// ── CASH FLOW ─────────────────────────────────────────────────
router.get('/cashflow', adminAuth, async (req, res) => {
  try {
    const { month } = req.query

    // ── Cash in: orders confirmed this period ─────────────────
    const cashInRow = month
      ? await db.prepare(`
          SELECT COALESCE(SUM(total), 0) as total, COUNT(*) as count
          FROM orders
          WHERE status IN ('paid','shipped')
          AND strftime('%Y-%m', created_at) = ?
        `).get(month)
      : await db.prepare(`
          SELECT COALESCE(SUM(total), 0) as total, COUNT(*) as count
          FROM orders
          WHERE status IN ('paid','shipped')
        `).get()
    const cashIn = Number(cashInRow?.total ?? 0)

    // ── Cash out: bill payments made this period ──────────────
    const billPayRow = month
      ? await db.prepare(`
          SELECT COALESCE(SUM(amount), 0) as total, COUNT(*) as count
          FROM bill_payments
          WHERE voided = 0
          AND strftime('%Y-%m', payment_date) = ?
        `).get(month)
      : await db.prepare(`
          SELECT COALESCE(SUM(amount), 0) as total, COUNT(*) as count
          FROM bill_payments
          WHERE voided = 0
        `).get()
    const billPayments = Number(billPayRow?.total ?? 0)

    // ── Cash out: expenses this period ────────────────────────
    const expRow = month
      ? await db.prepare(`
          SELECT COALESCE(SUM(amount), 0) as total
          FROM expenses
          WHERE strftime('%Y-%m', date) = ?
        `).get(month)
      : await db.prepare(`
          SELECT COALESCE(SUM(amount), 0) as total
          FROM expenses
        `).get()
    const expensesPaid = Number(expRow?.total ?? 0)

    const totalCashOut = billPayments + expensesPaid
    const netCashFlow  = cashIn - totalCashOut

    // ── Daily cash flow for chart ─────────────────────────────
    const daily = month
      ? await db.prepare(`
          SELECT day, SUM(cash_in) as cash_in, SUM(cash_out) as cash_out
          FROM (
            SELECT strftime('%Y-%m-%d', created_at) as day, total as cash_in, 0 as cash_out
            FROM orders WHERE status IN ('paid','shipped') AND strftime('%Y-%m', created_at) = ?
            UNION ALL
            SELECT strftime('%Y-%m-%d', payment_date) as day, 0 as cash_in, amount as cash_out
            FROM bill_payments WHERE voided = 0 AND strftime('%Y-%m', payment_date) = ?
            UNION ALL
            SELECT strftime('%Y-%m-%d', date) as day, 0 as cash_in, amount as cash_out
            FROM expenses WHERE strftime('%Y-%m', date) = ?
          )
          GROUP BY day ORDER BY day ASC
        `).all(month, month, month)
      : await db.prepare(`
          SELECT day, SUM(cash_in) as cash_in, SUM(cash_out) as cash_out
          FROM (
            SELECT strftime('%Y-%m-%d', created_at) as day, total as cash_in, 0 as cash_out
            FROM orders WHERE status IN ('paid','shipped') AND created_at >= date('now', '-30 days')
            UNION ALL
            SELECT strftime('%Y-%m-%d', payment_date) as day, 0 as cash_in, amount as cash_out
            FROM bill_payments WHERE voided = 0 AND payment_date >= date('now', '-30 days')
            UNION ALL
            SELECT strftime('%Y-%m-%d', date) as day, 0 as cash_in, amount as cash_out
            FROM expenses WHERE date >= date('now', '-30 days')
          )
          GROUP BY day ORDER BY day ASC
        `).all()

    // ── AP outstanding (unpaid bills) ─────────────────────────
    const apRow = await db.prepare(`
      SELECT COALESCE(SUM(b.total - COALESCE(bp.paid,0)), 0) as outstanding
      FROM purchase_bills b
      LEFT JOIN (
        SELECT bill_id, SUM(amount) as paid FROM bill_payments WHERE voided=0 GROUP BY bill_id
      ) bp ON bp.bill_id = b.id
      WHERE b.status != 'paid'
    `).get()

    res.json({
      cashIn,
      billPayments,
      expensesPaid,
      totalCashOut,
      netCashFlow,
      orderCount:    Number(cashInRow?.count ?? 0),
      daily,
      apOutstanding: Number(apRow?.outstanding ?? 0),
    })
  } catch (e) {
    console.error('Cashflow error:', e.message)
    res.status(500).json({ error: e.message })
  }
})

// ── AP AGING ──────────────────────────────────────────────────
router.get('/ap-aging', adminAuth, async (req, res) => {
  try {
    const bills = await db.prepare(`
      SELECT
        b.id, b.bill_number, b.bill_date, b.due_date, b.total, b.status,
        s.name as supplier_name,
        COALESCE(bp.paid, 0) as amount_paid,
        b.total - COALESCE(bp.paid, 0) as outstanding,
        CAST(julianday('now') - julianday(COALESCE(b.due_date, b.bill_date)) AS INTEGER) as days_overdue
      FROM purchase_bills b
      LEFT JOIN suppliers s ON b.supplier_id = s.id
      LEFT JOIN (
        SELECT bill_id, SUM(amount) as paid FROM bill_payments WHERE voided=0 GROUP BY bill_id
      ) bp ON bp.bill_id = b.id
      WHERE b.status IN ('unpaid','partial')
      ORDER BY days_overdue DESC
    `).all()

    const buckets = { current: [], days1_30: [], days31_60: [], days61_90: [], over90: [] }
    for (const bill of bills) {
      const d = bill.days_overdue
      if (d <= 0)       buckets.current.push(bill)
      else if (d <= 30) buckets.days1_30.push(bill)
      else if (d <= 60) buckets.days31_60.push(bill)
      else if (d <= 90) buckets.days61_90.push(bill)
      else              buckets.over90.push(bill)
    }

    const sum = arr => arr.reduce((s, b) => s + Number(b.outstanding), 0)

    res.json({
      buckets,
      totals: {
        current:   sum(buckets.current),
        days1_30:  sum(buckets.days1_30),
        days31_60: sum(buckets.days31_60),
        days61_90: sum(buckets.days61_90),
        over90:    sum(buckets.over90),
        total:     sum(bills),
      },
      billCount: bills.length,
    })
  } catch (e) {
    console.error('AP aging error:', e.message)
    res.status(500).json({ error: e.message })
  }
})

// ── COGS detail for a specific order ─────────────────────────
router.get('/cogs/order/:orderId', adminAuth, async (req, res) => {
  const entries = await db.prepare(`SELECT * FROM order_cogs WHERE order_id = ? ORDER BY product_name, material_name`).all(req.params.orderId)
  const total = entries.reduce((s, e) => s + e.line_cost, 0)
  res.json({ entries, total })
})

// ── Suppliers (legacy route kept for compatibility) ────────────
router.get('/suppliers', adminAuth, async (req, res) => {
  res.json(await db.prepare('SELECT * FROM suppliers ORDER BY name').all())
})

module.exports = router