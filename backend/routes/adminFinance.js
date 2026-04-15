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

router.delete('/expenses/:id', adminAuth, async (req, res) => {
  const old = await db.prepare('SELECT * FROM expenses WHERE id = ?').get(req.params.id)
  if (!old) return res.status(404).json({ error: 'Not found' })
  await db.prepare('INSERT INTO archive_expenses (original_id, data_json, deleted_by_email) VALUES (?,?,?)').run(old.id, JSON.stringify(old), req.admin.email)
  await db.prepare('DELETE FROM expenses WHERE id = ?').run(req.params.id)
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

router.get('/pl', adminAuth, async (req, res) => {
  try {
    const { month } = req.query

    const revFilter  = month
      ? `WHERE status IN ('paid','shipped') AND strftime('%Y-%m', created_at) = ?`
      : `WHERE status IN ('paid','shipped')`

    const cogsFilter = month
      ? `WHERE strftime('%Y-%m', date) = ?`
      : 'WHERE 1=1'

    const expFilter  = month
      ? `WHERE strftime('%Y-%m', date) = ?`
      : 'WHERE 1=1'

    // ── Revenue — confirmed sales only ────────────────────────
    const { total: revenue } = month
      ? await db.prepare(`SELECT COALESCE(SUM(total), 0) as total FROM orders ${revFilter}`).get(month)
      : await db.prepare(`SELECT COALESCE(SUM(total), 0) as total FROM orders ${revFilter}`).get()

    // ── COGS — materials actually used in sold products ────────
    const { total: cogs } = month
      ? await db.prepare(`SELECT COALESCE(SUM(line_cost), 0) as total FROM order_cogs ${cogsFilter}`).get(month)
      : await db.prepare(`SELECT COALESCE(SUM(line_cost), 0) as total FROM order_cogs ${cogsFilter}`).get()

    // ── COGS breakdown by product ─────────────────────────────
    const cogsByProduct = month
      ? await db.prepare(`
          SELECT
            product_name,
            SUM(qty_sold)   as total_qty,
            SUM(line_cost)  as total_cost,
            COUNT(DISTINCT order_id) as order_count
          FROM order_cogs ${cogsFilter}
          AND material_name != 'No recipe'
          GROUP BY product_name
          ORDER BY total_cost DESC
        `).all(month)
      : await db.prepare(`
          SELECT
            product_name,
            SUM(qty_sold)   as total_qty,
            SUM(line_cost)  as total_cost,
            COUNT(DISTINCT order_id) as order_count
          FROM order_cogs ${cogsFilter}
          AND material_name != 'No recipe'
          GROUP BY product_name
          ORDER BY total_cost DESC
        `).all()

    // ── COGS breakdown by material ────────────────────────────
    const cogsByMaterial = month
      ? await db.prepare(`
          SELECT
            material_name,
            unit,
            SUM(qty_used)   as total_qty,
            AVG(unit_cost)  as avg_cost,
            SUM(line_cost)  as total_cost
          FROM order_cogs ${cogsFilter}
          AND material_name != 'No recipe'
          GROUP BY material_name
          ORDER BY total_cost DESC
        `).all(month)
      : await db.prepare(`
          SELECT
            material_name,
            unit,
            SUM(qty_used)   as total_qty,
            AVG(unit_cost)  as avg_cost,
            SUM(line_cost)  as total_cost
          FROM order_cogs ${cogsFilter}
          AND material_name != 'No recipe'
          GROUP BY material_name
          ORDER BY total_cost DESC
        `).all()

    // ── Products with no recipe (COGS unknown) ────────────────
    const noRecipe = month
      ? await db.prepare(`
          SELECT product_name, SUM(qty_sold) as total_qty
          FROM order_cogs ${cogsFilter}
          AND material_name = 'No recipe'
          GROUP BY product_name
        `).all(month)
      : await db.prepare(`
          SELECT product_name, SUM(qty_sold) as total_qty
          FROM order_cogs ${cogsFilter}
          AND material_name = 'No recipe'
          GROUP BY product_name
        `).all()

    // ── Operating expenses ────────────────────────────────────
    const expenseRows = month
      ? await db.prepare(`
          SELECT category, COALESCE(SUM(amount), 0) as total
          FROM expenses ${expFilter}
          GROUP BY category
        `).all(month)
      : await db.prepare(`
          SELECT category, COALESCE(SUM(amount), 0) as total
          FROM expenses ${expFilter}
          GROUP BY category
        `).all()

    const totalExpenses = expenseRows.reduce((s, r) => s + r.total, 0)

    // ── Purchase bills for reference (NOT part of P&L COGS) ───
    const billsThisPeriod = month
      ? await db.prepare(`
          SELECT
            COALESCE(SUM(b.total), 0) as total,
            COALESCE(SUM(b.total) - SUM(COALESCE(bp.paid, 0)), 0) as outstanding
          FROM purchase_bills b
          LEFT JOIN (
            SELECT bill_id, SUM(amount) as paid
            FROM bill_payments
            GROUP BY bill_id
          ) bp ON bp.bill_id = b.id
          WHERE strftime('%Y-%m', b.bill_date) = ?
        `).get(month)
      : null

    res.json({
      revenue,
      cogs,
      grossProfit:    revenue - cogs,
      totalExpenses,
      netProfit:      revenue - cogs - totalExpenses,
      expenses:       expenseRows,
      cogsByProduct,
      cogsByMaterial,
      noRecipe,
      billsThisPeriod,
    })

  } catch (e) {
    console.error('PL ERROR:', e.message)
    res.status(500).json({ error: e.message })
  }
})

// ── COGS detail for a specific order ─────────────────────────
router.get('/cogs/order/:orderId', adminAuth, async (req, res) => {
  const entries = await db.prepare(`
    SELECT * FROM order_cogs WHERE order_id = ? ORDER BY product_name, material_name
  `).all(req.params.orderId)

  const total = entries.reduce((s, e) => s + e.line_cost, 0)
  res.json({ entries, total })
})

// ── Suppliers (legacy route kept for compatibility) ────────────
router.get('/suppliers', adminAuth, async (req, res) => {
  res.json(await db.prepare('SELECT * FROM suppliers ORDER BY name').all())
})

module.exports = router