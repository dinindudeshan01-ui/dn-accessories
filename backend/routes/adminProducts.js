const express = require('express')
const router  = express.Router()
const db      = require('../db')
const adminAuth = require('../middleware/adminAuth')
const { auditLog } = require('../middleware/auditLog')

// Run migration once — adds sort_order if missing
try {
  db.exec('ALTER TABLE products ADD COLUMN sort_order INTEGER DEFAULT 0')
} catch { /* already exists */ }

// ── GET all products — sorted by sort_order, then created_at ──
router.get('/', adminAuth, (req, res) => {
  const products = db.prepare('SELECT * FROM products ORDER BY sort_order ASC, created_at ASC').all()
  res.json(products)
})

// ── POST create ───────────────────────────────────────────────
router.post('/', adminAuth, (req, res) => {
  const { name, price, description, image_url, category, subcategory, stock } = req.body
  if (!name || !price) return res.status(400).json({ error: 'Name and price required' })

  // New products go to the end
  const maxOrder = db.prepare('SELECT MAX(sort_order) as m FROM products').get().m || 0

  const result = db.prepare(
    'INSERT INTO products (name, price, description, image_url, category, subcategory, stock, sort_order) VALUES (?,?,?,?,?,?,?,?)'
  ).run(name, parseFloat(price), description || '', image_url || '', category || '', subcategory || '', parseInt(stock) || 0, maxOrder + 1)

  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(result.lastInsertRowid)
  auditLog({ req, action: 'CREATE', entity: 'product', entityId: product.id, description: `Created product "${name}"`, newValue: product })
  res.json(product)
})

// ── PATCH reorder — accepts [{ id, sort_order }, ...] ─────────
router.patch('/reorder', adminAuth, (req, res) => {
  const { order } = req.body // array of { id, sort_order }
  if (!Array.isArray(order) || order.length === 0)
    return res.status(400).json({ error: 'order must be a non-empty array' })

  const update = db.prepare('UPDATE products SET sort_order = ? WHERE id = ?')
  const doUpdate = db.transaction(() => {
    order.forEach(({ id, sort_order }) => update.run(sort_order, id))
  })

  try {
    doUpdate()
    auditLog({ req, action: 'UPDATE', entity: 'product', entityId: 'bulk', description: `Reordered ${order.length} products` })
    res.json({ success: true })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// ── PUT update ────────────────────────────────────────────────
router.put('/:id', adminAuth, (req, res) => {
  const { name, price, description, image_url, category, subcategory, stock } = req.body
  const old = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id)
  if (!old) return res.status(404).json({ error: 'Not found' })
  db.prepare(
    'UPDATE products SET name=?, price=?, description=?, image_url=?, category=?, subcategory=?, stock=? WHERE id=?'
  ).run(name, parseFloat(price), description, image_url, category, subcategory || '', parseInt(stock), req.params.id)
  const updated = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id)
  auditLog({ req, action: 'UPDATE', entity: 'product', entityId: req.params.id, description: `Updated product "${name}"`, oldValue: old, newValue: updated })
  res.json(updated)
})

// ── DELETE ────────────────────────────────────────────────────
router.delete('/:id', adminAuth, (req, res) => {
  const old = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id)
  if (!old) return res.status(404).json({ error: 'Not found' })
  db.prepare('INSERT INTO archive_products (original_id, data_json, deleted_by_email) VALUES (?,?,?)')
    .run(old.id, JSON.stringify(old), req.admin.email)
  db.prepare('DELETE FROM products WHERE id = ?').run(req.params.id)
  auditLog({ req, action: 'DELETE', entity: 'product', entityId: req.params.id, description: `Deleted product "${old.name}"`, oldValue: old })
  res.json({ success: true })
})

// ── PATCH stock ───────────────────────────────────────────────
router.patch('/:id/stock', adminAuth, (req, res) => {
  const { stock } = req.body
  const old = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id)
  db.prepare('UPDATE products SET stock = ? WHERE id = ?').run(parseInt(stock), req.params.id)
  auditLog({ req, action: 'UPDATE', entity: 'product', entityId: req.params.id, description: `Stock updated for "${old?.name}": ${old?.stock} → ${stock}`, oldValue: { stock: old?.stock }, newValue: { stock: parseInt(stock) } })
  res.json({ success: true, stock: parseInt(stock) })
})

module.exports = router