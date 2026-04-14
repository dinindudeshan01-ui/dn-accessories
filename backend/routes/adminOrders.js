const express   = require('express')
const router    = express.Router()
const db        = require('../db')
const adminAuth = require('../middleware/adminAuth')
const { auditLog } = require('../middleware/auditLog')

// ── Migration ─────────────────────────────────────────────────
try { db.exec('ALTER TABLE orders ADD COLUMN bank_used TEXT') } catch {}
try { db.exec('ALTER TABLE orders ADD COLUMN cogs_logged INTEGER DEFAULT 0') } catch {}

// ── order_cogs table — auto-logged COGS per sale ──────────────
// Separate from old manual cogs_entries — this is system-generated
db.exec(`
  CREATE TABLE IF NOT EXISTS order_cogs (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id    INTEGER NOT NULL,
    product_id  INTEGER,
    product_name TEXT,
    qty_sold    REAL    NOT NULL,
    material_id INTEGER,
    material_name TEXT,
    unit        TEXT,
    qty_used    REAL    NOT NULL,
    unit_cost   REAL    NOT NULL,
    line_cost   REAL    NOT NULL,
    date        TEXT    DEFAULT (date('now')),
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(id)
  );
`)

const BASE_URL = process.env.BASE_URL || 'http://localhost:3001'

// ── Statuses that trigger COGS recognition ────────────────────
// Accrual: COGS recognised when sale is confirmed — not on cash receipt
const COGS_TRIGGER_STATUSES = ['paid', 'shipped']

// ── Helper: log COGS for an order ─────────────────────────────
// Called when order moves into a COGS_TRIGGER_STATUS for the first time
function logOrderCogs(order) {
  const items = JSON.parse(order.items_json || '[]')
  const saleDate = new Date(order.created_at).toISOString().split('T')[0]

  let totalCogs = 0

  const doLog = db.transaction(() => {
    for (const item of items) {
      const qty = parseFloat(item.qty || item.quantity || 1)

      // Find product by name (items_json stores name, not always id)
      // Try id first, fall back to name match
      const product = item.id
        ? db.prepare('SELECT * FROM products WHERE id = ?').get(item.id)
        : db.prepare('SELECT * FROM products WHERE name = ?').get(item.name)

      if (!product) {
        // Product not found or no recipe — log as zero-cost line for audit
        db.prepare(`
          INSERT INTO order_cogs
            (order_id, product_name, qty_sold, material_name, qty_used, unit_cost, line_cost, date)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(order.id, item.name, qty, 'No recipe', 0, 0, 0, saleDate)
        continue
      }

      // Get recipe for this product
      const recipe = db.prepare(`
        SELECT pm.*, m.name as material_name, m.unit, m.avg_cost
        FROM product_materials pm
        JOIN materials m ON pm.material_id = m.id
        WHERE pm.product_id = ?
      `).all(product.id)

      if (!recipe.length) {
        // No recipe set — log as zero-cost for audit trail
        db.prepare(`
          INSERT INTO order_cogs
            (order_id, product_id, product_name, qty_sold, material_name, qty_used, unit_cost, line_cost, date)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(order.id, product.id, product.name, qty, 'No recipe', 0, 0, 0, saleDate)
        continue
      }

      // Log each material used
      for (const mat of recipe) {
        const qtyUsed  = mat.qty_needed * qty           // total qty of this material used
        const unitCost = mat.avg_cost                   // avg cost at time of sale
        const lineCost = qtyUsed * unitCost             // line COGS

        db.prepare(`
          INSERT INTO order_cogs
            (order_id, product_id, product_name, qty_sold, material_id, material_name, unit, qty_used, unit_cost, line_cost, date)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          order.id, product.id, product.name, qty,
          mat.material_id, mat.material_name, mat.unit,
          qtyUsed, unitCost, lineCost, saleDate
        )

        // Deduct material stock
        db.prepare('UPDATE materials SET qty_in_stock = MAX(0, qty_in_stock - ?) WHERE id = ?')
          .run(qtyUsed, mat.material_id)

        totalCogs += lineCost
      }

      // Deduct product stock
      db.prepare('UPDATE products SET stock = MAX(0, stock - ?) WHERE id = ?')
        .run(qty, product.id)
    }

    // Mark order as cogs_logged so we never double-log
    db.prepare('UPDATE orders SET cogs_logged = 1 WHERE id = ?').run(order.id)
  })

  doLog()
  return totalCogs
}

// ── Helper: reverse COGS for an order ────────────────────────
// Called when order moves OUT of a COGS_TRIGGER_STATUS (e.g. refunded/cancelled)
function reverseOrderCogs(order) {
  const entries = db.prepare('SELECT * FROM order_cogs WHERE order_id = ?').all(order.id)

  const doReverse = db.transaction(() => {
    for (const entry of entries) {
      if (entry.material_id && entry.qty_used > 0) {
        // Restore material stock
        db.prepare('UPDATE materials SET qty_in_stock = qty_in_stock + ? WHERE id = ?')
          .run(entry.qty_used, entry.material_id)
      }
      if (entry.product_id && entry.qty_sold > 0) {
        // Restore product stock
        db.prepare('UPDATE products SET stock = stock + ? WHERE id = ?')
          .run(entry.qty_sold, entry.product_id)
      }
    }
    // Remove the COGS entries
    db.prepare('DELETE FROM order_cogs WHERE order_id = ?').run(order.id)
    // Reset cogs_logged flag
    db.prepare('UPDATE orders SET cogs_logged = 0 WHERE id = ?').run(order.id)
  })

  doReverse()
}

// ── GET all orders ────────────────────────────────────────────
router.get('/', adminAuth, (req, res) => {
  const { status, limit = 100 } = req.query
  const orders = status
    ? db.prepare('SELECT * FROM orders WHERE status = ? ORDER BY created_at DESC LIMIT ?').all(status, parseInt(limit))
    : db.prepare('SELECT * FROM orders ORDER BY created_at DESC LIMIT ?').all(parseInt(limit))

  res.json(orders.map(o => ({
    ...o,
    items:    JSON.parse(o.items_json || '[]'),
    slip_url: o.slip_path ? `${BASE_URL}/uploads/slips/${o.slip_path}` : null,
  })))
})

// ── GET stats ─────────────────────────────────────────────────
router.get('/stats', adminAuth, (req, res) => {
  // Revenue: only confirmed sales (paid + shipped) — accrual
  const total    = db.prepare(`
    SELECT COUNT(*) as count, COALESCE(SUM(total), 0) as revenue
    FROM orders WHERE status IN ('paid','shipped')
  `).get()
  const byStatus = db.prepare('SELECT status, COUNT(*) as count FROM orders GROUP BY status').all()
  const monthly  = db.prepare(`
    SELECT strftime('%Y-%m', created_at) as month,
           COUNT(*) as orders, SUM(total) as revenue
    FROM orders WHERE status IN ('paid','shipped')
    GROUP BY month ORDER BY month DESC LIMIT 12
  `).all()
  const daily7   = db.prepare(`
    SELECT date(created_at) as day, COUNT(*) as orders, SUM(total) as revenue
    FROM orders
    WHERE status IN ('paid','shipped') AND created_at >= date('now', '-7 days')
    GROUP BY day ORDER BY day ASC
  `).all()
  res.json({ total, byStatus, monthly, daily7 })
})

// ── PATCH status — core logic ─────────────────────────────────
router.patch('/:id/status', adminAuth, (req, res) => {
  const { status } = req.body
  const valid = ['pending', 'paid', 'shipped', 'refunded', 'cancelled']
  if (!valid.includes(status)) return res.status(400).json({ error: 'Invalid status' })

  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id)
  if (!order) return res.status(404).json({ error: 'Order not found' })

  const wasTriggered = COGS_TRIGGER_STATUSES.includes(order.status)
  const willTrigger  = COGS_TRIGGER_STATUSES.includes(status)

  let cogsAction = null
  let totalCogs  = 0

  try {
    // ── Case 1: Moving INTO a COGS trigger status for the first time
    if (willTrigger && !order.cogs_logged) {
      totalCogs  = logOrderCogs(order)
      cogsAction = 'logged'
    }

    // ── Case 2: Moving OUT of a COGS trigger status (refund/cancel)
    // Only reverse if COGS was previously logged
    if (!willTrigger && wasTriggered && order.cogs_logged) {
      reverseOrderCogs(order)
      cogsAction = 'reversed'
    }

    // Update status
    db.prepare('UPDATE orders SET status = ? WHERE id = ?').run(status, req.params.id)

    auditLog({
      req, action: 'UPDATE', entity: 'order', entityId: req.params.id,
      description: `Order ${order.reference || '#' + req.params.id} status: ${order.status} → ${status}${cogsAction ? ` | COGS ${cogsAction}: Rs ${totalCogs.toFixed(2)}` : ''}`,
      oldValue: { status: order.status },
      newValue: { status, cogsAction, totalCogs }
    })

    res.json({
      success: true,
      cogsAction,
      totalCogs: totalCogs.toFixed(2)
    })

  } catch (e) {
    console.error('Status update error:', e)
    res.status(500).json({ error: e.message })
  }
})

module.exports = router