const express = require('express')
const router  = express.Router()
const db      = require('../db')
const adminAuth = require('../middleware/adminAuth')
const { auditLog } = require('../middleware/auditLog')

router.get('/', adminAuth, async (req, res) => {
  try {
    const products = await db.prepare('SELECT * FROM products ORDER BY group_order ASC, sort_order ASC, created_at ASC').all()
    res.json(products)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

router.post('/', adminAuth, async (req, res) => {
  try {
    const { name, price, description, image_url, category, subcategory, stock } = req.body
    if (!name || !price) return res.status(400).json({ error: 'Name and price required' })
    const sub = subcategory || ''

    const existing = await db.prepare('SELECT group_order, MAX(sort_order) as max_sort FROM products WHERE subcategory = ?').get(sub)
    let gOrder, sOrder
    if (existing && existing.group_order !== null && existing.group_order > 0) {
      gOrder = existing.group_order
      sOrder = (existing.max_sort || 0) + 1
    } else {
      const maxGroup = await db.prepare('SELECT MAX(group_order) as m FROM products').get()
      gOrder = (maxGroup?.m || 0) + 1
      sOrder = 1
    }

    const result = await db.prepare(
      'INSERT INTO products (name, price, description, image_url, category, subcategory, stock, sort_order, group_order) VALUES (?,?,?,?,?,?,?,?,?)'
    ).run(name, parseFloat(price), description || '', image_url || '', category || '', sub, parseInt(stock) || 0, sOrder, gOrder)

    const product = await db.prepare('SELECT * FROM products WHERE id = ?').get(result.lastInsertRowid)
    await auditLog({ req, action: 'CREATE', entity: 'product', entityId: product.id, description: `Created product "${name}"`, newValue: product })
    res.json(product)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

router.patch('/reorder', adminAuth, async (req, res) => {
  try {
    const { groups } = req.body
    if (!Array.isArray(groups) || groups.length === 0)
      return res.status(400).json({ error: 'groups must be a non-empty array' })

    for (const { group_order, items } of groups) {
      if (!Array.isArray(items)) continue
      for (const { id, sort_order } of items) {
        await db.prepare('UPDATE products SET sort_order = ?, group_order = ? WHERE id = ?').run(sort_order, group_order, id)
      }
    }

    await auditLog({ req, action: 'UPDATE', entity: 'product', entityId: 'bulk', description: `Reordered products across ${groups.length} groups` })
    res.json({ success: true })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

router.put('/:id', adminAuth, async (req, res) => {
  try {
    const { name, price, description, image_url, category, subcategory, stock } = req.body
    const old = await db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id)
    if (!old) return res.status(404).json({ error: 'Not found' })

    const newSub = subcategory || ''
    let gOrder = old.group_order
    let sOrder = old.sort_order

    if (newSub !== (old.subcategory || '')) {
      const existing = await db.prepare('SELECT group_order, MAX(sort_order) as max_sort FROM products WHERE subcategory = ? AND id != ?').get(newSub, req.params.id)
      if (existing && existing.group_order !== null && existing.group_order > 0) {
        gOrder = existing.group_order
        sOrder = (existing.max_sort || 0) + 1
      } else {
        const maxGroup = await db.prepare('SELECT MAX(group_order) as m FROM products').get()
        gOrder = (maxGroup?.m || 0) + 1
        sOrder = 1
      }
    }

    await db.prepare('UPDATE products SET name=?, price=?, description=?, image_url=?, category=?, subcategory=?, stock=?, group_order=?, sort_order=? WHERE id=?')
      .run(name, parseFloat(price), description, image_url, category, newSub, parseInt(stock), gOrder, sOrder, req.params.id)

    const updated = await db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id)
    await auditLog({ req, action: 'UPDATE', entity: 'product', entityId: req.params.id, description: `Updated product "${name}"`, oldValue: old, newValue: updated })
    res.json(updated)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

router.delete('/:id', adminAuth, async (req, res) => {
  try {
    const old = await db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id)
    if (!old) return res.status(404).json({ error: 'Not found' })
    await db.prepare('INSERT INTO archive_products (original_id, data_json, deleted_by_email) VALUES (?,?,?)').run(old.id, JSON.stringify(old), req.admin.email)
    await db.prepare('DELETE FROM products WHERE id = ?').run(req.params.id)
    await auditLog({ req, action: 'DELETE', entity: 'product', entityId: req.params.id, description: `Deleted product "${old.name}"`, oldValue: old })
    res.json({ success: true })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

router.patch('/:id/stock', adminAuth, async (req, res) => {
  try {
    const { stock } = req.body
    const old = await db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id)
    await db.prepare('UPDATE products SET stock = ? WHERE id = ?').run(parseInt(stock), req.params.id)
    await auditLog({ req, action: 'UPDATE', entity: 'product', entityId: req.params.id, description: `Stock updated for "${old?.name}": ${old?.stock} → ${stock}`, oldValue: { stock: old?.stock }, newValue: { stock: parseInt(stock) } })
    res.json({ success: true, stock: parseInt(stock) })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

module.exports = router