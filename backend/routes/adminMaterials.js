const express   = require('express')
const router    = express.Router()
const db        = require('../db')
const adminAuth = require('../middleware/adminAuth')
const { auditLog } = require('../middleware/auditLog')

router.get('/', adminAuth, async (req, res) => {
  try {
    res.json(await db.prepare('SELECT * FROM materials ORDER BY name ASC').all())
  } catch (e) { res.status(500).json({ error: e.message }) }
})

router.get('/units', adminAuth, async (req, res) => {
  try {
    res.json(await db.prepare('SELECT * FROM units ORDER BY name ASC').all())
  } catch (e) { res.status(500).json({ error: e.message }) }
})

router.get('/:id', adminAuth, async (req, res) => {
  try {
    const material = await db.prepare('SELECT * FROM materials WHERE id = ?').get(req.params.id)
    if (!material) return res.status(404).json({ error: 'Not found' })
    const history = await db.prepare(`
      SELECT h.*, b.bill_number
      FROM material_cost_history h
      LEFT JOIN purchase_bills b ON h.source_id = b.id AND h.source = 'bill'
      WHERE h.material_id = ?
      ORDER BY h.created_at DESC LIMIT 50
    `).all(req.params.id)
    res.json({ ...material, history })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

router.post('/', adminAuth, async (req, res) => {
  try {
    const { name, unit, opening_stock, opening_cost, reorder_level, notes } = req.body
    if (!name || !unit) return res.status(400).json({ error: 'Name and unit required' })

    const oStock = parseFloat(opening_stock) || 0
    const oCost  = parseFloat(opening_cost)  || 0
    const avgCost = oStock > 0 ? oCost : 0

    const result = await db.prepare(`
      INSERT INTO materials (name, unit, avg_cost, qty_in_stock, opening_stock, opening_cost, reorder_level, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(name, unit, avgCost, oStock, oStock, oCost, parseFloat(reorder_level) || 0, notes || '')

    if (oStock > 0) {
      await db.prepare(`
        INSERT INTO material_cost_history (material_id, source, qty, unit_cost, total, date)
        VALUES (?, 'opening', ?, ?, ?, date('now'))
      `).run(result.lastInsertRowid, oStock, oCost, oStock * oCost)
    }

    const material = await db.prepare('SELECT * FROM materials WHERE id = ?').get(result.lastInsertRowid)
    await auditLog({ req, action: 'CREATE', entity: 'material', entityId: material.id, description: `Created material "${name}"`, newValue: material })
    res.json(material)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

router.put('/:id', adminAuth, async (req, res) => {
  try {
    const { name, unit, reorder_level, notes } = req.body
    const old = await db.prepare('SELECT * FROM materials WHERE id = ?').get(req.params.id)
    if (!old) return res.status(404).json({ error: 'Not found' })
    await db.prepare('UPDATE materials SET name=?, unit=?, reorder_level=?, notes=? WHERE id=?')
      .run(name, unit, parseFloat(reorder_level) || 0, notes || '', req.params.id)
    const updated = await db.prepare('SELECT * FROM materials WHERE id = ?').get(req.params.id)
    await auditLog({ req, action: 'UPDATE', entity: 'material', entityId: req.params.id, description: `Updated material "${name}"`, oldValue: old, newValue: updated })
    res.json(updated)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

router.delete('/:id', adminAuth, async (req, res) => {
  try {
    const old = await db.prepare('SELECT * FROM materials WHERE id = ?').get(req.params.id)
    if (!old) return res.status(404).json({ error: 'Not found' })
    const inUse = await db.prepare('SELECT COUNT(*) as c FROM product_materials WHERE material_id = ?').get(req.params.id)
    if (inUse.c > 0) return res.status(400).json({ error: 'Cannot delete — material is used in product recipes' })
    await db.prepare('DELETE FROM material_cost_history WHERE material_id = ?').run(req.params.id)
    await db.prepare('DELETE FROM materials WHERE id = ?').run(req.params.id)
    await auditLog({ req, action: 'DELETE', entity: 'material', entityId: req.params.id, description: `Deleted material "${old.name}"`, oldValue: old })
    res.json({ success: true })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

router.post('/units/add', adminAuth, async (req, res) => {
  try {
    const { name } = req.body
    if (!name) return res.status(400).json({ error: 'Unit name required' })
    const result = await db.prepare('INSERT INTO units (name) VALUES (?)').run(name.toLowerCase().trim())
    res.json({ id: result.lastInsertRowid, name: name.toLowerCase().trim() })
  } catch {
    res.status(409).json({ error: 'Unit already exists' })
  }
})

module.exports = router