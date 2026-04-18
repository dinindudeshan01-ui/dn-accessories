const express   = require('express')
const router    = express.Router()
const db        = require('../db')
const adminAuth = require('../middleware/adminAuth')
const { auditLog } = require('../middleware/auditLog')

const BASE_URL = process.env.BASE_URL || 'http://localhost:3001'
const COGS_TRIGGER_STATUSES = ['paid', 'shipped']

// ── Helper: ensure status log table ───────────────────────────
async function ensureStatusLogTable() {
  await db.exec(`CREATE TABLE IF NOT EXISTS order_status_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL,
    from_status TEXT,
    to_status TEXT NOT NULL,
    changed_by TEXT,
    note TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`)
}

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
    await db.batch(batchStatements, 'write')
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
    await db.batch(batchStatements, 'write')
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
      slip_url: o.slip_path || null,
    })))
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ── GET stats (Dashboard 2.0) ─────────────────────────────────
router.get('/stats', adminAuth, async (req, res) => {
  try {
    const today      = new Date().toISOString().split('T')[0]
    const lastWeekDate = new Date()
    lastWeekDate.setDate(lastWeekDate.getDate() - 7)
    const lastWeekDay = lastWeekDate.toISOString().split('T')[0]

    const [
      total, byStatus, monthly, daily7,
      todayRow, lastWeekDayRow, daily30,
      pendingRow, overdueAP, lowStockMat,
      topProductToday
    ] = await Promise.all([
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
      db.prepare(`SELECT COALESCE(SUM(total),0) as revenue, COUNT(*) as count FROM orders WHERE status IN ('paid','shipped') AND date(created_at) = ?`).get(today),
      db.prepare(`SELECT COALESCE(SUM(total),0) as revenue FROM orders WHERE status IN ('paid','shipped') AND date(created_at) = ?`).get(lastWeekDay),
      db.prepare(`
        SELECT date(created_at) as day, COALESCE(SUM(total),0) as revenue
        FROM orders WHERE status IN ('paid','shipped') AND created_at >= date('now', '-30 days')
        GROUP BY day ORDER BY day ASC
      `).all(),
      db.prepare(`SELECT COUNT(*) as count FROM orders WHERE status = 'pending'`).get(),
      db.prepare(`SELECT COUNT(*) as count, COALESCE(SUM(total),0) as amount FROM purchase_bills WHERE status = 'unpaid' AND due_date IS NOT NULL AND due_date < date('now')`).get(),
      db.prepare(`SELECT COUNT(*) as count FROM materials WHERE reorder_level > 0 AND qty_in_stock <= reorder_level`).get(),
      db.prepare(`
        SELECT oc.product_name, COALESCE(SUM(oc.qty_sold),0) as qty
        FROM order_cogs oc
        JOIN orders o ON oc.order_id = o.id
        WHERE o.status IN ('paid','shipped') AND date(o.created_at) = ?
        GROUP BY oc.product_name ORDER BY qty DESC LIMIT 1
      `).get(today),
    ])

    res.json({
      total, byStatus, monthly, daily7, daily30,
      today: {
        revenue:     Number(todayRow?.revenue || 0),
        count:       Number(todayRow?.count   || 0),
        lastWeekRev: Number(lastWeekDayRow?.revenue || 0),
      },
      pending:    Number(pendingRow?.count || 0),
      overdueAP:  { count: Number(overdueAP?.count || 0), amount: Number(overdueAP?.amount || 0) },
      lowStock:   Number(lowStockMat?.count || 0),
      topProduct: topProductToday || null,
    })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ── GET order timeline ─────────────────────────────────────────
router.get('/:id/timeline', adminAuth, async (req, res) => {
  try {
    await ensureStatusLogTable()
    const log = await db.prepare(
      'SELECT * FROM order_status_log WHERE order_id = ? ORDER BY created_at ASC'
    ).all(req.params.id)
    res.json(log)
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

    const adminEmail = req.admin?.email || 'system'
    await ensureStatusLogTable()

    await db.batch([
      { sql: 'UPDATE orders SET status = ? WHERE id = ?', args: [status, req.params.id] },
      { sql: 'INSERT INTO order_status_log (order_id, from_status, to_status, changed_by) VALUES (?,?,?,?)', args: [req.params.id, order.status, status, adminEmail] },
    ], 'write')

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

// ── POST bulk status update ────────────────────────────────────
router.post('/bulk-status', adminAuth, async (req, res) => {
  try {
    const { ids, status } = req.body
    const valid = ['pending', 'paid', 'shipped', 'refunded', 'cancelled']
    if (!valid.includes(status) || !Array.isArray(ids) || !ids.length)
      return res.status(400).json({ error: 'Invalid payload' })

    await ensureStatusLogTable()
    const adminEmail = req.admin?.email || 'system'
    let updatedCount = 0

    for (const id of ids) {
      const order = await db.prepare('SELECT * FROM orders WHERE id = ?').get(id)
      if (!order || order.status === status) continue

      const wasTriggered = COGS_TRIGGER_STATUSES.includes(order.status)
      const willTrigger  = COGS_TRIGGER_STATUSES.includes(status)
      if (willTrigger && !order.cogs_logged) await logOrderCogs(order)
      if (!willTrigger && wasTriggered && order.cogs_logged) await reverseOrderCogs(order)

      await db.batch([
        { sql: 'UPDATE orders SET status = ? WHERE id = ?', args: [status, id] },
        { sql: 'INSERT INTO order_status_log (order_id, from_status, to_status, changed_by) VALUES (?,?,?,?)', args: [id, order.status, status, adminEmail] },
      ], 'write')

      updatedCount++
    }

    res.json({ success: true, updated: updatedCount })
  } catch (e) {
    console.error('Bulk status error:', e)
    res.status(500).json({ error: e.message })
  }
})

module.exports = router