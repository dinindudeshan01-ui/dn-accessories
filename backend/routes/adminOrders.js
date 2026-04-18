const express   = require('express')
const router    = express.Router()
const db        = require('../db')
const adminAuth = require('../middleware/adminAuth')
const { auditLog } = require('../middleware/auditLog')

const BASE_URL = process.env.BASE_URL || 'http://localhost:3001'
const COGS_TRIGGER_STATUSES = ['paid', 'shipped']

// ── Helper: log COGS for an order ─────────────────────────────
async function logOrderCogs(order) {
  const items    = JSON.parse(order.items_json || '[]')
  const saleDate = new Date(order.created_at).toISOString().split('T')[0]
  let totalCogs  = 0

  const products = await Promise.all(
    items.map(item =>
      item.id
        ? db.prepare('SELECT * FROM products WHERE id = ?').get(item.id)
        : db.prepare('SELECT * FROM products WHERE name = ?').get(item.name)
    )
  )

  const recipes = await Promise.all(
    products.map(product =>
      product
        ? db.prepare(`
            SELECT pm.*, m.name as material_name, m.unit, m.avg_cost
            FROM product_materials pm
            JOIN materials m ON pm.material_id = m.id
            WHERE pm.product_id = ?
          `).all(product.id)
        : Promise.resolve([])
    )
  )

  const batchStatements = []

  for (let i = 0; i < items.length; i++) {
    const item    = items[i]
    const qty     = parseFloat(item.qty || item.quantity || 1)
    const product = products[i]
    const recipe  = recipes[i]

    if (!product) {
      batchStatements.push({
        sql:  `INSERT INTO order_cogs (order_id, product_name, qty_sold, material_name, qty_used, unit_cost, line_cost, date)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [order.id, item.name, qty, 'No recipe', 0, 0, 0, saleDate],
      })
      continue
    }

    if (!recipe.length) {
      batchStatements.push({
        sql:  `INSERT INTO order_cogs (order_id, product_id, product_name, qty_sold, material_name, qty_used, unit_cost, line_cost, date)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [order.id, product.id, product.name, qty, 'No recipe', 0, 0, 0, saleDate],
      })
      continue
    }

    for (const mat of recipe) {
      const qtyUsed  = mat.qty_needed * qty
      const unitCost = mat.avg_cost
      const lineCost = qtyUsed * unitCost
      totalCogs += lineCost

      batchStatements.push({
        sql:  `INSERT INTO order_cogs
                 (order_id, product_id, product_name, qty_sold, material_id, material_name, unit, qty_used, unit_cost, line_cost, date)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [order.id, product.id, product.name, qty, mat.material_id, mat.material_name, mat.unit, qtyUsed, unitCost, lineCost, saleDate],
      })

      batchStatements.push({
        sql:  'UPDATE materials SET qty_in_stock = MAX(0, qty_in_stock - ?) WHERE id = ?',
        args: [qtyUsed, mat.material_id],
      })
    }

    batchStatements.push({
      sql:  'UPDATE products SET stock = MAX(0, stock - ?) WHERE id = ?',
      args: [qty, product.id],
    })
  }

  batchStatements.push({
    sql:  'UPDATE orders SET cogs_logged = 1 WHERE id = ?',
    args: [order.id],
  })

  if (batchStatements.length) {
    await db.batch(batchStatements, 'write')  // ✅ fixed
  }

  return totalCogs
}

// ── Helper: reverse COGS ──────────────────────────────────────
async function reverseOrderCogs(order) {
  const entries = await db.prepare('SELECT * FROM order_cogs WHERE order_id = ?').all(order.id)

  const batchStatements = []

  for (const entry of entries) {
    if (entry.material_id && entry.qty_used > 0)
      batchStatements.push({ sql: 'UPDATE materials SET qty_in_stock = qty_in_stock + ? WHERE id = ?', args: [entry.qty_used, entry.material_id] })
    if (entry.product_id && entry.qty_sold > 0)
      batchStatements.push({ sql: 'UPDATE products SET stock = stock + ? WHERE id = ?', args: [entry.qty_sold, entry.product_id] })
  }

  batchStatements.push({ sql: 'DELETE FROM order_cogs WHERE order_id = ?',      args: [order.id] })
  batchStatements.push({ sql: 'UPDATE orders SET cogs_logged = 0 WHERE id = ?', args: [order.id] })

  if (batchStatements.length) {
    await db.batch(batchStatements, 'write')  // ✅ fixed
  }
}

// ── GET all orders ────────────────────────────────────────────
router.get('/', adminAuth, async (req, res) => {
  try {
    const { status, limit = 100 } = req.query
    const orders = status
      ? await db.prepare('SELECT * FROM orders WHERE status = ? ORDER BY created_at DESC LIMIT ?').all(status, parseInt(limit))
      : await db.prepare('SELECT * FROM orders ORDER BY created_at DESC LIMIT ?').all(parseInt(limit))
    res.json(orders.map(o => ({
      ...o,
      items:    JSON.parse(o.items_json || '[]'),
      slip_url: o.slip_path ? `${BASE_URL}/uploads/slips/${o.slip_path}` : null,
    })))
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ── GET stats ─────────────────────────────────────────────────
router.get('/stats', adminAuth, async (req, res) => {
  try {
    const [total, byStatus, monthly, daily7] = await Promise.all([
      db.prepare(`SELECT COUNT(*) as count, COALESCE(SUM(total), 0) as revenue FROM orders WHERE status IN ('paid','shipped')`).get(),
      db.prepare('SELECT status, COUNT(*) as count FROM orders GROUP BY status').all(),
      db.prepare(`
        SELECT strftime('%Y-%m', created_at) as month, COUNT(*) as orders, SUM(total) as revenue
        FROM orders WHERE status IN ('paid','shipped')
        GROUP BY month ORDER BY month DESC LIMIT 12
      `).all(),
      db.prepare(`
        SELECT date(created_at) as day, COUNT(*) as orders, SUM(total) as revenue
        FROM orders WHERE status IN ('paid','shipped') AND created_at >= date('now', '-7 days')
        GROUP BY day ORDER BY day ASC
      `).all(),
    ])
    res.json({ total, byStatus, monthly, daily7 })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ── PATCH status ──────────────────────────────────────────────
router.patch('/:id/status', adminAuth, async (req, res) => {
  try {
    const { status } = req.body
    const valid = ['pending', 'paid', 'shipped', 'refunded', 'cancelled']
    if (!valid.includes(status)) return res.status(400).json({ error: 'Invalid status' })

    const order = await db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id)
    if (!order) return res.status(404).json({ error: 'Order not found' })

    const wasTriggered = COGS_TRIGGER_STATUSES.includes(order.status)
    const willTrigger  = COGS_TRIGGER_STATUSES.includes(status)
    let cogsAction = null, totalCogs = 0

    if (willTrigger && !order.cogs_logged) {
      totalCogs  = await logOrderCogs(order)
      cogsAction = 'logged'
    }
    if (!willTrigger && wasTriggered && order.cogs_logged) {
      await reverseOrderCogs(order)
      cogsAction = 'reversed'
    }

    await db.prepare('UPDATE orders SET status = ? WHERE id = ?').run(status, req.params.id)

    await auditLog({
      req, action: 'UPDATE', entity: 'order', entityId: req.params.id,
      description: `Order ${order.reference || '#' + req.params.id} status: ${order.status} → ${status}${cogsAction ? ` | COGS ${cogsAction}: Rs ${totalCogs.toFixed(2)}` : ''}`,
      oldValue: { status: order.status }, newValue: { status, cogsAction, totalCogs }
    })

    res.json({ success: true, cogsAction, totalCogs: totalCogs.toFixed(2) })
  } catch (e) {
    console.error('Status update error:', e)
    res.status(500).json({ error: e.message })
  }
})

module.exports = router