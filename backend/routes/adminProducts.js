const express = require('express')
const router  = express.Router()
const db      = require('../db')
const adminAuth = require('../middleware/adminAuth')
const { auditLog } = require('../middleware/auditLog')

router.get('/', adminAuth, (req, res) => {
  const products = db.prepare('SELECT * FROM products ORDER BY created_at DESC').all()
  res.json(products)
})

router.post('/', adminAuth, (req, res) => {
  const { name, price, description, image_url, category, stock } = req.body
  if (!name || !price) return res.status(400).json({ error: 'Name and price required' })
  const result = db.prepare(
    'INSERT INTO products (name, price, description, image_url, category, stock) VALUES (?,?,?,?,?,?)'
  ).run(name, parseFloat(price), description || '', image_url || '', category || '', parseInt(stock) || 0)
  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(result.lastInsertRowid)
  auditLog({ req, action: 'CREATE', entity: 'product', entityId: product.id, description: `Created product "${name}"`, newValue: product })
  res.json(product)
})

router.put('/:id', adminAuth, (req, res) => {
  const { name, price, description, image_url, category, stock } = req.body
  const old = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id)
  if (!old) return res.status(404).json({ error: 'Not found' })
  db.prepare(
    'UPDATE products SET name=?, price=?, description=?, image_url=?, category=?, stock=? WHERE id=?'
  ).run(name, parseFloat(price), description, image_url, category, parseInt(stock), req.params.id)
  const updated = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id)
  auditLog({ req, action: 'UPDATE', entity: 'product', entityId: req.params.id, description: `Updated product "${name}"`, oldValue: old, newValue: updated })
  res.json(updated)
})

router.delete('/:id', adminAuth, (req, res) => {
  const old = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id)
  if (!old) return res.status(404).json({ error: 'Not found' })
  // Archive before delete
  db.prepare('INSERT INTO archive_products (original_id, data_json, deleted_by_email) VALUES (?,?,?)')
    .run(old.id, JSON.stringify(old), req.admin.email)
  db.prepare('DELETE FROM products WHERE id = ?').run(req.params.id)
  auditLog({ req, action: 'DELETE', entity: 'product', entityId: req.params.id, description: `Deleted product "${old.name}"`, oldValue: old })
  res.json({ success: true })
})

router.patch('/:id/stock', adminAuth, (req, res) => {
  const { stock } = req.body
  const old = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id)
  db.prepare('UPDATE products SET stock = ? WHERE id = ?').run(parseInt(stock), req.params.id)
  auditLog({ req, action: 'UPDATE', entity: 'product', entityId: req.params.id, description: `Stock updated for "${old?.name}": ${old?.stock} → ${stock}`, oldValue: { stock: old?.stock }, newValue: { stock: parseInt(stock) } })
  res.json({ success: true, stock: parseInt(stock) })
})

module.exports = router