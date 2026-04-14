const express   = require('express')
const router    = express.Router()
const db        = require('../db')
const adminAuth = require('../middleware/adminAuth')
const { auditLog } = require('../middleware/auditLog')

// ── EXPENSES ──────────────────────────────────────────────────

router.get('/expenses', adminAuth, (req, res) => {
  const { month } = req.query
  const expenses = month
    ? db.prepare("SELECT * FROM expenses WHERE strftime('%Y-%m', date) = ? ORDER BY date DESC").all(month)
    : db.prepare('SELECT * FROM expenses ORDER BY date DESC LIMIT 200').all()
  res.json(expenses)
})

router.post('/expenses', adminAuth, (req, res) => {
  const { description, category, amount, date } = req.body
  if (!description || !amount) return res.status(400).json({ error: 'Missing fields' })
  const result = db.prepare(
    'INSERT INTO expenses (description, category, amount, date) VALUES (?,?,?,?)'
  ).run(description, category || 'Other', parseFloat(amount), date || new Date().toISOString().split('T')[0])
  const expense = db.prepare('SELECT * FROM expenses WHERE id = ?').get(result.lastInsertRowid)
  auditLog({ req, action: 'CREATE', entity: 'expense', entityId: expense.id, description: `Added expense "${description}" Rs ${amount}`, newValue: expense })
  res.json(expense)
})

router.delete('/expenses/:id', adminAuth, (req, res) => {
  const old = db.prepare('SELECT * FROM expenses WHERE id = ?').get(req.params.id)
  if (!old) return res.status(404).json({ error: 'Not found' })
  db.prepare('INSERT INTO archive_expenses (original_id, data_json, deleted_by_email) VALUES (?,?,?)').run(old.id, JSON.stringify(old), req.admin.email)
  db.prepare('DELETE FROM expenses WHERE id = ?').run(req.params.id)
  auditLog({ req, action: 'DELETE', entity: 'expense', entityId: req.params.id, description: `Deleted expense "${old.description}" Rs ${old.amount}`, oldValue: old })
  res.json({ success: true })
})

// ── P&L ───────────────────────────────────────────────────────
// ACCRUAL BASIS:
//   Revenue = confirmed sales (paid + shipped) in period
//   COGS    = materials used in those sales (from order_cogs) — NOT purchase bills
//   OpEx    = expenses in period
//
// Purchase bills are Accounts Payable — separate from COGS entirely

router.get('/pl', adminAuth, (req, res) => {
  try {
    const { month } = req.query

    const revFilter  = month
      ? `WHERE status IN ('paid','shipped') AND strftime('%Y-%m', created_at) = '${month}'`
      : `WHERE status IN ('paid','shipped')`

    const cogsFilter = month
      ? `WHERE strftime('%Y-%m', date) = '${month}'`
      : 'WHERE 1=1'

    const expFilter  = month
      ? `WHERE strftime('%Y-%m', date) = '${month}'`
      : 'WHERE 1=1'

    // ── Revenue — confirmed sales only ────────────────────────
    const revenue = db.prepare(`
      SELECT COALESCE(SUM(total), 0) as total FROM orders ${revFilter}
    `).get().total

    // ── COGS — materials actually used in sold products ────────
    // This is the ONLY correct source for COGS under accrual
    const cogs = db.prepare(`
      SELECT COALESCE(SUM(line_cost), 0) as total FROM order_cogs ${cogsFilter}
    `).get().total

    // ── COGS breakdown by product (for drill-down) ────────────
    const cogsByProduct = db.prepare(`
      SELECT
        product_name,
        SUM(qty_sold)   as total_qty,
        SUM(line_cost)  as total_cost,
        COUNT(DISTINCT order_id) as order_count
      FROM order_cogs ${cogsFilter}
      WHERE material_name != 'No recipe'
      GROUP BY product_name
      ORDER BY total_cost DESC
    `).all()

    // ── COGS breakdown by material (for drill-down) ───────────
    const cogsByMaterial = db.prepare(`
      SELECT
        material_name,
        unit,
        SUM(qty_used)   as total_qty,
        AVG(unit_cost)  as avg_cost,
        SUM(line_cost)  as total_cost
      FROM order_cogs ${cogsFilter}
      WHERE material_name != 'No recipe'
      GROUP BY material_name
      ORDER BY total_cost DESC
    `).all()

    // ── Products with no recipe (COGS unknown) ────────────────
    const noRecipe = db.prepare(`
      SELECT product_name, SUM(qty_sold) as total_qty
      FROM order_cogs ${cogsFilter}
      WHERE material_name = 'No recipe'
      GROUP BY product_name
    `).all()

    // ── Operating expenses ────────────────────────────────────
    const expenseRows   = db.prepare(`
      SELECT category, COALESCE(SUM(amount), 0) as total
      FROM expenses ${expFilter}
      GROUP BY category
    `).all()
    const totalExpenses = expenseRows.reduce((s, r) => s + r.total, 0)

    // ── Purchase bills for reference (NOT part of P&L COGS) ───
    // Shown separately so she can see what she's owed to suppliers
    const billsThisPeriod = month ? db.prepare(`
      SELECT COALESCE(SUM(total), 0) as total,
             COALESCE(SUM(total) - SUM(
               (SELECT COALESCE(SUM(amount),0) FROM bill_payments WHERE bill_id = b.id)
             ), 0) as outstanding
      FROM purchase_bills b
      WHERE strftime('%Y-%m', bill_date) = '${month}'
    `).get() : null

    res.json({
      // Core P&L
      revenue,
      cogs,
      grossProfit:    revenue - cogs,
      totalExpenses,
      netProfit:      revenue - cogs - totalExpenses,
      expenses:       expenseRows,

      // COGS drill-down
      cogsByProduct,
      cogsByMaterial,
      noRecipe,

      // Reference info (not P&L)
      billsThisPeriod,
    })

  } catch (e) {
    console.error('PL ERROR:', e.message)
    res.status(500).json({ error: e.message })
  }
})

// ── COGS detail for a specific order (for order drill-down) ───
router.get('/cogs/order/:orderId', adminAuth, (req, res) => {
  const entries = db.prepare(`
    SELECT * FROM order_cogs WHERE order_id = ? ORDER BY product_name, material_name
  `).all(req.params.orderId)

  const total = entries.reduce((s, e) => s + e.line_cost, 0)
  res.json({ entries, total })
})

// ── Suppliers (legacy route kept for compatibility) ────────────
router.get('/suppliers', adminAuth, (req, res) => {
  res.json(db.prepare('SELECT * FROM suppliers ORDER BY name').all())
})

module.exports = router