const express   = require('express')
const router    = express.Router()
const db        = require('../db')
const adminAuth = require('../middleware/adminAuth')
const { auditLog } = require('../middleware/auditLog')

const BASE_URL = process.env.BASE_URL || 'http://localhost:3001'

// ── GET all suppliers with live balance ───────────────────────
router.get('/', adminAuth, async (req, res) => {
  const suppliers = await db.prepare(`
    SELECT s.*,
      s.opening_balance + s.total_billed               as total_owed,
      s.opening_balance + s.total_billed - s.total_paid as outstanding,
      (SELECT COUNT(*) FROM purchase_bills WHERE supplier_id = s.id) as bill_count,
      (SELECT COUNT(*) FROM purchase_bills WHERE supplier_id = s.id AND status = 'unpaid') as unpaid_bills
    FROM suppliers s
    ORDER BY s.name ASC
  `).all()
  res.json(suppliers)
})

// ── GET single supplier with full bill history ────────────────
router.get('/:id', adminAuth, async (req, res) => {
  const supplier = await db.prepare(`
    SELECT s.*,
      s.opening_balance + s.total_billed               as total_owed,
      s.opening_balance + s.total_billed - s.total_paid as outstanding
    FROM suppliers s WHERE s.id = ?
  `).get(req.params.id)
  if (!supplier) return res.status(404).json({ error: 'Not found' })

  const bills = await db.prepare(`
    SELECT b.*,
      COALESCE((SELECT SUM(amount) FROM bill_payments WHERE bill_id = b.id), 0) as amount_paid,
      b.total - COALESCE((SELECT SUM(amount) FROM bill_payments WHERE bill_id = b.id), 0) as outstanding
    FROM purchase_bills b
    WHERE b.supplier_id = ?
    ORDER BY b.bill_date DESC
  `).all(req.params.id)

  res.json({
    ...supplier,
    bills: bills.map(b => ({
      ...b,
      bill_image_url: b.bill_image ? `${BASE_URL}/uploads/bills/${b.bill_image}` : null
    }))
  })
})

// ── POST create supplier ──────────────────────────────────────
router.post('/', adminAuth, async (req, res) => {
  const { name, category, contact, email, address, lead_days, opening_balance, notes } = req.body
  if (!name) return res.status(400).json({ error: 'Supplier name required' })

  const result = await db.prepare(`
    INSERT INTO suppliers (name, category, contact, email, address, lead_days, opening_balance, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    name,
    category        || '',
    contact         || '',
    email           || '',
    address         || '',
    parseInt(lead_days) || 3,
    parseFloat(opening_balance) || 0,
    notes           || ''
  )

  const supplier = await db.prepare('SELECT * FROM suppliers WHERE id = ?').get(result.lastInsertRowid)
  auditLog({ req, action: 'CREATE', entity: 'supplier', entityId: supplier.id, description: `Added supplier "${name}"`, newValue: supplier })
  res.json(supplier)
})

// ── PUT update supplier ───────────────────────────────────────
router.put('/:id', adminAuth, async (req, res) => {
  const { name, category, contact, email, address, lead_days, opening_balance, status, notes } = req.body
  const old = await db.prepare('SELECT * FROM suppliers WHERE id = ?').get(req.params.id)
  if (!old) return res.status(404).json({ error: 'Not found' })

  await db.prepare(`
    UPDATE suppliers SET name=?, category=?, contact=?, email=?, address=?, lead_days=?, opening_balance=?, status=?, notes=?
    WHERE id=?
  `).run(
    name, category || '', contact || '', email || '', address || '',
    parseInt(lead_days) || 3,
    parseFloat(opening_balance) || 0,
    status || 'active',
    notes || '',
    req.params.id
  )

  const updated = await db.prepare('SELECT * FROM suppliers WHERE id = ?').get(req.params.id)
  auditLog({ req, action: 'UPDATE', entity: 'supplier', entityId: req.params.id, description: `Updated supplier "${name}"`, oldValue: old, newValue: updated })
  res.json(updated)
})

// ── DELETE supplier ───────────────────────────────────────────
router.delete('/:id', adminAuth, async (req, res) => {
  const old = await db.prepare('SELECT * FROM suppliers WHERE id = ?').get(req.params.id)
  if (!old) return res.status(404).json({ error: 'Not found' })

  const { c: hasBills } = await db.prepare('SELECT COUNT(*) as c FROM purchase_bills WHERE supplier_id = ?').get(req.params.id)
  if (hasBills > 0) return res.status(400).json({ error: 'Cannot delete — supplier has purchase bills' })

  await db.prepare('INSERT INTO archive_suppliers (original_id, data_json, deleted_by_email) VALUES (?,?,?)').run(old.id, JSON.stringify(old), req.admin.email)
  await db.prepare('DELETE FROM suppliers WHERE id = ?').run(req.params.id)
  auditLog({ req, action: 'DELETE', entity: 'supplier', entityId: req.params.id, description: `Deleted supplier "${old.name}"`, oldValue: old })
  res.json({ success: true })
})

module.exports = router