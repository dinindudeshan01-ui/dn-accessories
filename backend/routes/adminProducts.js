const express = require('express')
const router  = express.Router()
const db      = require('../db')
const adminAuth = require('../middleware/adminAuth')
const { auditLog } = require('../middleware/auditLog')

// ── Migrations ────────────────────────────────────────────────
;['ALTER TABLE products ADD COLUMN sort_order INTEGER DEFAULT 0',
  'ALTER TABLE products ADD COLUMN group_order INTEGER DEFAULT 0',
].forEach(sql => { try { db.exec(sql) } catch { /* already exists */ } })

// ── GET all products — grouped and ordered ────────────────────
router.get('/', adminAuth, (req, res) => {
  const products = db.prepare(
    'SELECT * FROM products ORDER BY group_order ASC, sort_order ASC, created_at ASC'
  ).all()
  res.json(products)
})

// ── POST create ───────────────────────────────────────────────
router.post('/', adminAuth, (req, res) => {
  const { name, price, description, image_url, category, subcategory, stock } = req.body
  if (!name || !price) return res.status(400).json({ error: 'Name and price required' })

  const sub = subcategory || ''
  const existing = db.prepare(
    'SELECT group_order, MAX(sort_order) as max_sort FROM products WHERE subcategory = ?'
  ).get(sub)

  let gOrder, sOrder
  if (existing && existing.group_order !== null && existing.group_order > 0) {
    gOrder = existing.group_order
    sOrder = (existing.max_sort || 0) + 1
  } else {
    const maxGroup = db.prepare('SELECT MAX(group_order) as m FROM products').get().m || 0
    gOrder = maxGroup + 1
    sOrder = 1
  }

  const result = db.prepare(
    'INSERT INTO products (name, price, description, image_url, category, subcategory, stock, sort_order, group_order) VALUES (?,?,?,?,?,?,?,?,?)'
  ).run(name, parseFloat(price), description || '', image_url || '', category || '', sub, parseInt(stock) || 0, sOrder, gOrder)

  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(result.lastInsertRowid)
  auditLog({ req, action: 'CREATE', entity: 'product', entityId: product.id, description: `Created product "${name}"`, newValue: product })
  res.json(product)
})

// ── PATCH /reorder ────────────────────────────────────────────
// Body: { groups: [{ subcategory, group_order, items: [{ id, sort_order }] }] }
router.patch('/reorder', adminAuth, (req, res) => {
  const { groups } = req.body
  if (!Array.isArray(groups) || groups.length === 0)
    return res.status(400).json({ error: 'groups must be a non-empty array' })

  const updateProduct = db.prepare('UPDATE products SET sort_order = ?, group_order = ? WHERE id = ?')

  const doUpdate = db.transaction(() => {
    groups.forEach(({ group_order, items }) => {
      if (!Array.isArray(items)) return
      items.forEach(({ id, sort_order }) => {
        updateProduct.run(sort_order, group_order, id)
      })
    })
  })

  try {
    doUpdate()
    auditLog({ req, action: 'UPDATE', entity: 'product', entityId: 'bulk', description: `Reordered products across ${groups.length} groups` })
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

  const newSub = subcategory || ''
  let gOrder = old.group_order
  let sOrder = old.sort_order

  if (newSub !== (old.subcategory || '')) {
    const existing = db.prepare(
      'SELECT group_order, MAX(sort_order) as max_sort FROM products WHERE subcategory = ? AND id != ?'
    ).get(newSub, req.params.id)
    if (existing && existing.group_order !== null && existing.group_order > 0) {
      gOrder = existing.group_order
      sOrder = (existing.max_sort || 0) + 1
    } else {
      const maxGroup = db.prepare('SELECT MAX(group_order) as m FROM products').get().m || 0
      gOrder = maxGroup + 1
      sOrder = 1
    }
  }

  db.prepare(
    'UPDATE products SET name=?, price=?, description=?, image_url=?, category=?, subcategory=?, stock=?, group_order=?, sort_order=? WHERE id=?'
  ).run(name, parseFloat(price), description, image_url, category, newSub, parseInt(stock), gOrder, sOrder, req.params.id)

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