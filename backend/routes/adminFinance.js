const express = require('express')
const router  = express.Router()
const db      = require('../db')
const adminAuth = require('../middleware/adminAuth')
const { auditLog } = require('../middleware/auditLog')

// ── EXPENSES ──────────────────────────────────────────────

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
  auditLog({ req, action: 'CREATE', entity: 'expense', entityId: expense.id, description: `Added expense "${description}" $${amount}`, newValue: expense })
  res.json(expense)
})

router.delete('/expenses/:id', adminAuth, (req, res) => {
  const old = db.prepare('SELECT * FROM expenses WHERE id = ?').get(req.params.id)
  if (!old) return res.status(404).json({ error: 'Not found' })
  db.prepare('INSERT INTO archive_expenses (original_id, data_json, deleted_by_email) VALUES (?,?,?)')
    .run(old.id, JSON.stringify(old), req.admin.email)
  db.prepare('DELETE FROM expenses WHERE id = ?').run(req.params.id)
  auditLog({ req, action: 'DELETE', entity: 'expense', entityId: req.params.id, description: `Deleted expense "${old.description}" $${old.amount}`, oldValue: old })
  res.json({ success: true })
})

// ── P&L ───────────────────────────────────────────────────

router.get('/pl', adminAuth, (req, res) => {
  const { month } = req.query
  const filter    = month ? `WHERE strftime('%Y-%m', created_at) = '${month}'` : ''
  const expFilter = month ? `WHERE strftime('%Y-%m', date) = '${month}'` : ''
  const cogFilter = month ? `WHERE strftime('%Y-%m', date) = '${month}'` : ''

  const revenue     = db.prepare(`SELECT COALESCE(SUM(total), 0) as total FROM orders ${filter}`).get().total
  const expenseRows = db.prepare(`SELECT category, COALESCE(SUM(amount), 0) as total FROM expenses ${expFilter} GROUP BY category`).all()
  const totalExpenses = expenseRows.reduce((s, r) => s + r.total, 0)
  const cogs        = db.prepare(`SELECT COALESCE(SUM(total), 0) as total FROM cogs_entries ${cogFilter}`).get().total

  res.json({ revenue, cogs, expenses: expenseRows, totalExpenses, grossProfit: revenue - cogs, netProfit: revenue - cogs - totalExpenses })
})

// ── SUPPLIERS ─────────────────────────────────────────────

router.get('/suppliers', adminAuth, (req, res) => {
  res.json(db.prepare('SELECT * FROM suppliers ORDER BY name').all())
})

router.post('/suppliers', adminAuth, (req, res) => {
  const { name, category, contact, lead_days } = req.body
  if (!name) return res.status(400).json({ error: 'Name required' })
  const result = db.prepare(
    'INSERT INTO suppliers (name, category, contact, lead_days) VALUES (?,?,?,?)'
  ).run(name, category || '', contact || '', parseInt(lead_days) || 3)
  const supplier = db.prepare('SELECT * FROM suppliers WHERE id = ?').get(result.lastInsertRowid)
  auditLog({ req, action: 'CREATE', entity: 'supplier', entityId: supplier.id, description: `Added supplier "${name}"`, newValue: supplier })
  res.json(supplier)
})

router.put('/suppliers/:id', adminAuth, (req, res) => {
  const { name, category, contact, lead_days, status } = req.body
  const old = db.prepare('SELECT * FROM suppliers WHERE id = ?').get(req.params.id)
  db.prepare('UPDATE suppliers SET name=?, category=?, contact=?, lead_days=?, status=? WHERE id=?')
    .run(name, category, contact, parseInt(lead_days), status, req.params.id)
  const updated = db.prepare('SELECT * FROM suppliers WHERE id = ?').get(req.params.id)
  auditLog({ req, action: 'UPDATE', entity: 'supplier', entityId: req.params.id, description: `Updated supplier "${name}"`, oldValue: old, newValue: updated })
  res.json(updated)
})

// ── COGS ──────────────────────────────────────────────────

router.get('/cogs', adminAuth, (req, res) => {
  const { month } = req.query
  const rows = month
    ? db.prepare(`SELECT c.*, s.name as supplier_name FROM cogs_entries c LEFT JOIN suppliers s ON c.supplier_id = s.id WHERE strftime('%Y-%m', c.date) = ? ORDER BY c.date DESC`).all(month)
    : db.prepare(`SELECT c.*, s.name as supplier_name FROM cogs_entries c LEFT JOIN suppliers s ON c.supplier_id = s.id ORDER BY c.date DESC LIMIT 200`).all()
  res.json(rows)
})

router.post('/cogs', adminAuth, (req, res) => {
  const { supplier_id, item_name, quantity, unit, unit_cost, date } = req.body
  if (!item_name || !quantity || !unit_cost) return res.status(400).json({ error: 'Missing fields' })
  const total = parseFloat(quantity) * parseFloat(unit_cost)
  const result = db.prepare(
    'INSERT INTO cogs_entries (supplier_id, item_name, quantity, unit, unit_cost, total, date) VALUES (?,?,?,?,?,?,?)'
  ).run(supplier_id || null, item_name, parseFloat(quantity), unit || 'units', parseFloat(unit_cost), total, date || new Date().toISOString().split('T')[0])
  if (supplier_id) {
    db.prepare('UPDATE suppliers SET total_paid = total_paid + ? WHERE id = ?').run(total, supplier_id)
  }
  const entry = db.prepare('SELECT * FROM cogs_entries WHERE id = ?').get(result.lastInsertRowid)
  auditLog({ req, action: 'CREATE', entity: 'cogs', entityId: entry.id, description: `COGS entry: "${item_name}" qty ${quantity} @ $${unit_cost} = $${total.toFixed(2)}`, newValue: entry })
  res.json(entry)
})

module.exports = router