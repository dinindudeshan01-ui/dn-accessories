const express   = require('express')
const router    = express.Router()
const db        = require('../db')
const adminAuth = require('../middleware/adminAuth')
const { auditLog } = require('../middleware/auditLog')

// ── AUDIT LOG ─────────────────────────────────────────────────

router.get('/audit', adminAuth, async (req, res) => {
  try {
    const { limit = 100, entity, action, search } = req.query
    let sql = 'SELECT * FROM audit_log WHERE 1=1'
    const params = []
    if (entity) { sql += ' AND entity = ?';        params.push(entity) }
    if (action) { sql += ' AND action = ?';         params.push(action) }
    if (search) { sql += ' AND description LIKE ?'; params.push(`%${search}%`) }
    sql += ' ORDER BY created_at DESC LIMIT ?'
    params.push(parseInt(limit))
    const logs = await db.prepare(sql).all(...params)
    res.json(logs)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

router.get('/audit/stats', adminAuth, async (req, res) => {
  try {
    const totalRow   = await db.prepare('SELECT COUNT(*) as count FROM audit_log').get()
    const byAction   = await db.prepare('SELECT action, COUNT(*) as count FROM audit_log GROUP BY action').all()
    const byEntity   = await db.prepare('SELECT entity, COUNT(*) as count FROM audit_log GROUP BY entity').all()
    const recent7Row = await db.prepare("SELECT COUNT(*) as count FROM audit_log WHERE created_at >= datetime('now','-7 days')").get()
    const lastAction = await db.prepare('SELECT * FROM audit_log ORDER BY created_at DESC LIMIT 1').get()
    res.json({ total: totalRow.count, byAction, byEntity, recent7: recent7Row.count, lastAction })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

router.delete('/audit/clear', adminAuth, async (req, res) => {
  try {
    await db.prepare('DELETE FROM audit_log').run()
    res.json({ ok: true, message: 'Audit log cleared' })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ── RESET ─────────────────────────────────────────────────────

router.post('/reset', adminAuth, async (req, res) => {
  const { targets, confirm } = req.body
  if (confirm !== 'RESET') return res.status(400).json({ error: 'Type RESET to confirm' })
  if (!targets || !Array.isArray(targets) || targets.length === 0)
    return res.status(400).json({ error: 'No targets specified' })

  const allowed = ['orders', 'expenses', 'cogs', 'products', 'suppliers']
  const invalid = targets.filter(t => !allowed.includes(t))
  if (invalid.length > 0) return res.status(400).json({ error: `Invalid targets: ${invalid.join(', ')}` })

  const batchId = `RESET-${Date.now()}`
  const summary = {}

  try {
    for (const target of targets) {
      switch (target) {
        case 'orders': {
          const rows = await db.prepare('SELECT * FROM orders').all()
          for (const row of rows)
            await db.prepare('INSERT INTO archive_orders (original_id, data_json, deleted_by_email, reset_batch) VALUES (?,?,?,?)').run(row.id, JSON.stringify(row), req.admin.email, batchId)
          await db.prepare('DELETE FROM orders').run()
          summary.orders = rows.length
          break
        }
        case 'expenses': {
          const rows = await db.prepare('SELECT * FROM expenses').all()
          for (const row of rows)
            await db.prepare('INSERT INTO archive_expenses (original_id, data_json, deleted_by_email, reset_batch) VALUES (?,?,?,?)').run(row.id, JSON.stringify(row), req.admin.email, batchId)
          await db.prepare('DELETE FROM expenses').run()
          summary.expenses = rows.length
          break
        }
        case 'cogs': {
          const rows = await db.prepare('SELECT * FROM cogs_entries').all()
          for (const row of rows)
            await db.prepare('INSERT INTO archive_cogs (original_id, data_json, deleted_by_email, reset_batch) VALUES (?,?,?,?)').run(row.id, JSON.stringify(row), req.admin.email, batchId)
          await db.prepare('DELETE FROM cogs_entries').run()
          await db.prepare('UPDATE suppliers SET total_paid = 0').run()
          summary.cogs = rows.length
          break
        }
        case 'products': {
          const rows = await db.prepare('SELECT * FROM products').all()
          for (const row of rows)
            await db.prepare('INSERT INTO archive_products (original_id, data_json, deleted_by_email, reset_batch) VALUES (?,?,?,?)').run(row.id, JSON.stringify(row), req.admin.email, batchId)
          await db.prepare('DELETE FROM products').run()
          summary.products = rows.length
          break
        }
        case 'suppliers': {
          const rows = await db.prepare('SELECT * FROM suppliers').all()
          for (const row of rows)
            await db.prepare('INSERT INTO archive_suppliers (original_id, data_json, deleted_by_email, reset_batch) VALUES (?,?,?,?)').run(row.id, JSON.stringify(row), req.admin.email, batchId)
          await db.prepare('DELETE FROM suppliers').run()
          summary.suppliers = rows.length
          break
        }
      }
    }

    await auditLog({
      req, action: 'RESET', entity: 'system', entityId: batchId,
      description: `Data reset — targets: ${targets.join(', ')}. Records archived: ${JSON.stringify(summary)}`,
      oldValue: summary, newValue: { status: 'cleared', batch: batchId }
    })

    res.json({ success: true, batch: batchId, summary, message: `Reset complete. All data archived under batch ${batchId}.` })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// ── ARCHIVES ──────────────────────────────────────────────────

router.get('/archives', adminAuth, async (req, res) => {
  try {
    const products  = await db.prepare('SELECT COUNT(*) as count, MAX(deleted_at) as last FROM archive_products').get()
    const orders    = await db.prepare('SELECT COUNT(*) as count, MAX(deleted_at) as last FROM archive_orders').get()
    const expenses  = await db.prepare('SELECT COUNT(*) as count, MAX(deleted_at) as last FROM archive_expenses').get()
    const suppliers = await db.prepare('SELECT COUNT(*) as count, MAX(deleted_at) as last FROM archive_suppliers').get()
    const cogs      = await db.prepare('SELECT COUNT(*) as count, MAX(deleted_at) as last FROM archive_cogs').get()
    res.json({ products, orders, expenses, suppliers, cogs })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

router.get('/archives/:table', adminAuth, async (req, res) => {
  try {
    const tableMap = { products:'archive_products', orders:'archive_orders', expenses:'archive_expenses', suppliers:'archive_suppliers', cogs:'archive_cogs' }
    const table = tableMap[req.params.table]
    if (!table) return res.status(400).json({ error: 'Invalid table' })
    const rows = await db.prepare(`SELECT * FROM ${table} ORDER BY deleted_at DESC LIMIT 200`).all()
    res.json(rows)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

module.exports = router
// ── GLOBAL SEARCH ─────────────────────────────────────────────

router.get('/search', adminAuth, async (req, res) => {
  try {
    const { q } = req.query
    if (!q || q.trim().length < 2) return res.json({ orders: [], products: [], bills: [], customers: [] })

    const term = `%${q.trim()}%`

    const [orders, products, bills, customers] = await Promise.all([
      db.prepare(`
        SELECT id, reference, full_name, phone1, total, status, created_at
        FROM orders
        WHERE reference LIKE ? OR full_name LIKE ? OR phone1 LIKE ?
        ORDER BY created_at DESC LIMIT 8
      `).all(term, term, term),

      db.prepare(`
        SELECT id, name, price, stock, category
        FROM products
        WHERE name LIKE ? OR category LIKE ?
        ORDER BY name ASC LIMIT 8
      `).all(term, term),

      db.prepare(`
        SELECT pb.id, pb.bill_number, pb.total, pb.status, pb.bill_date, s.name as supplier_name
        FROM purchase_bills pb
        LEFT JOIN suppliers s ON pb.supplier_id = s.id
        WHERE pb.bill_number LIKE ? OR s.name LIKE ?
        ORDER BY pb.bill_date DESC LIMIT 8
      `).all(term, term),

      db.prepare(`
        SELECT full_name, nic, phone1, city, COUNT(*) as order_count, SUM(total) as total_spent
        FROM orders
        WHERE full_name LIKE ? OR nic LIKE ? OR phone1 LIKE ?
        GROUP BY nic
        ORDER BY total_spent DESC LIMIT 8
      `).all(term, term, term),
    ])

    res.json({ orders, products, bills, customers })
  } catch (e) { res.status(500).json({ error: e.message }) }
})