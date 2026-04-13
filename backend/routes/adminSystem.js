const express = require('express')
const router  = express.Router()
const db      = require('../db')
const adminAuth = require('../middleware/adminAuth')
const { auditLog } = require('../middleware/auditLog')

// ── AUDIT LOG ─────────────────────────────────────────────

router.get('/audit', adminAuth, (req, res) => {
  const { limit = 100, entity, action, search } = req.query
  let sql = 'SELECT * FROM audit_log WHERE 1=1'
  const params = []
  if (entity) { sql += ' AND entity = ?';        params.push(entity) }
  if (action) { sql += ' AND action = ?';         params.push(action) }
  if (search) { sql += ' AND description LIKE ?'; params.push(`%${search}%`) }
  sql += ' ORDER BY created_at DESC LIMIT ?'
  params.push(parseInt(limit))
  const logs = db.prepare(sql).all(...params)
  res.json(logs)
})

router.get('/audit/stats', adminAuth, (req, res) => {
  const total      = db.prepare('SELECT COUNT(*) as count FROM audit_log').get().count
  const byAction   = db.prepare('SELECT action, COUNT(*) as count FROM audit_log GROUP BY action').all()
  const byEntity   = db.prepare('SELECT entity, COUNT(*) as count FROM audit_log GROUP BY entity').all()
  const recent7    = db.prepare("SELECT COUNT(*) as count FROM audit_log WHERE created_at >= datetime('now','-7 days')").get().count
  const lastAction = db.prepare('SELECT * FROM audit_log ORDER BY created_at DESC LIMIT 1').get()
  res.json({ total, byAction, byEntity, recent7, lastAction })
})

// DELETE /api/admin/system/audit/clear
router.delete('/audit/clear', adminAuth, (req, res) => {
  db.prepare('DELETE FROM audit_log').run()
  res.json({ ok: true, message: 'Audit log cleared' })
})

// ── RESET ─────────────────────────────────────────────────

router.post('/reset', adminAuth, (req, res) => {
  const { targets, confirm } = req.body
  if (confirm !== 'RESET') return res.status(400).json({ error: 'Type RESET to confirm' })
  if (!targets || !Array.isArray(targets) || targets.length === 0) return res.status(400).json({ error: 'No targets specified' })
  const allowed = ['orders', 'expenses', 'cogs', 'products', 'suppliers']
  const invalid = targets.filter(t => !allowed.includes(t))
  if (invalid.length > 0) return res.status(400).json({ error: `Invalid targets: ${invalid.join(', ')}` })

  const batchId = `RESET-${Date.now()}`
  const summary = {}

  const doReset = db.transaction(() => {
    targets.forEach(target => {
      switch (target) {
        case 'orders': {
          const rows = db.prepare('SELECT * FROM orders').all()
          rows.forEach(row => db.prepare('INSERT INTO archive_orders (original_id, data_json, deleted_by_email, reset_batch) VALUES (?,?,?,?)').run(row.id, JSON.stringify(row), req.admin.email, batchId))
          db.prepare('DELETE FROM orders').run()
          summary.orders = rows.length
          break
        }
        case 'expenses': {
          const rows = db.prepare('SELECT * FROM expenses').all()
          rows.forEach(row => db.prepare('INSERT INTO archive_expenses (original_id, data_json, deleted_by_email, reset_batch) VALUES (?,?,?,?)').run(row.id, JSON.stringify(row), req.admin.email, batchId))
          db.prepare('DELETE FROM expenses').run()
          summary.expenses = rows.length
          break
        }
        case 'cogs': {
          const rows = db.prepare('SELECT * FROM cogs_entries').all()
          rows.forEach(row => db.prepare('INSERT INTO archive_cogs (original_id, data_json, deleted_by_email, reset_batch) VALUES (?,?,?,?)').run(row.id, JSON.stringify(row), req.admin.email, batchId))
          db.prepare('DELETE FROM cogs_entries').run()
          db.prepare('UPDATE suppliers SET total_paid = 0').run()
          summary.cogs = rows.length
          break
        }
        case 'products': {
          const rows = db.prepare('SELECT * FROM products').all()
          rows.forEach(row => db.prepare('INSERT INTO archive_products (original_id, data_json, deleted_by_email, reset_batch) VALUES (?,?,?,?)').run(row.id, JSON.stringify(row), req.admin.email, batchId))
          db.prepare('DELETE FROM products').run()
          summary.products = rows.length
          break
        }
        case 'suppliers': {
          const rows = db.prepare('SELECT * FROM suppliers').all()
          rows.forEach(row => db.prepare('INSERT INTO archive_suppliers (original_id, data_json, deleted_by_email, reset_batch) VALUES (?,?,?,?)').run(row.id, JSON.stringify(row), req.admin.email, batchId))
          db.prepare('DELETE FROM suppliers').run()
          summary.suppliers = rows.length
          break
        }
      }
    })
  })

  try {
    doReset()
    auditLog({ req, action:'RESET', entity:'system', entityId:batchId, description:`Data reset — targets: ${targets.join(', ')}. Records archived: ${JSON.stringify(summary)}`, oldValue:summary, newValue:{ status:'cleared', batch:batchId } })
    res.json({ success:true, batch:batchId, summary, message:`Reset complete. All data archived under batch ${batchId}.` })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

router.get('/archives', adminAuth, (req, res) => {
  const products  = db.prepare('SELECT COUNT(*) as count, MAX(deleted_at) as last FROM archive_products').get()
  const orders    = db.prepare('SELECT COUNT(*) as count, MAX(deleted_at) as last FROM archive_orders').get()
  const expenses  = db.prepare('SELECT COUNT(*) as count, MAX(deleted_at) as last FROM archive_expenses').get()
  const suppliers = db.prepare('SELECT COUNT(*) as count, MAX(deleted_at) as last FROM archive_suppliers').get()
  const cogs      = db.prepare('SELECT COUNT(*) as count, MAX(deleted_at) as last FROM archive_cogs').get()
  const batches = db.prepare(`
    SELECT reset_batch, deleted_by_email, MIN(deleted_at) as reset_at
    FROM (
      SELECT reset_batch, deleted_by_email, deleted_at FROM archive_products WHERE reset_batch IS NOT NULL
      UNION ALL
      SELECT reset_batch, deleted_by_email, deleted_at FROM archive_orders WHERE reset_batch IS NOT NULL
      UNION ALL
      SELECT reset_batch, deleted_by_email, deleted_at FROM archive_expenses WHERE reset_batch IS NOT NULL
    )
    GROUP BY reset_batch ORDER BY reset_at DESC LIMIT 20
  `).all()
  res.json({ products, orders, expenses, suppliers, cogs, batches })
})

router.get('/archives/:table', adminAuth, (req, res) => {
  const tableMap = { products:'archive_products', orders:'archive_orders', expenses:'archive_expenses', suppliers:'archive_suppliers', cogs:'archive_cogs' }
  const table = tableMap[req.params.table]
  if (!table) return res.status(400).json({ error: 'Invalid table' })
  const rows = db.prepare(`SELECT * FROM ${table} ORDER BY deleted_at DESC LIMIT 200`).all()
  res.json(rows)
})

module.exports = router