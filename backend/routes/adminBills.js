const express   = require('express')
const router    = express.Router()
const db        = require('../db')
const adminAuth = require('../middleware/adminAuth')
const { auditLog } = require('../middleware/auditLog')
const multer    = require('multer')
const path      = require('path')
const fs        = require('fs')

// ── File upload for bill images ───────────────────────────────
const uploadDir = path.join(__dirname, '../uploads/bills')
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true })

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const unique = `bill_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
    cb(null, unique + path.extname(file.originalname))
  }
})
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|pdf|webp/
    if (allowed.test(path.extname(file.originalname).toLowerCase())) return cb(null, true)
    cb(new Error('Only images and PDF allowed'))
  }
})

const BASE_URL = process.env.BASE_URL || 'http://localhost:3001'

// ── Helper: recalculate average cost for a material ───────────
function recalcAvgCost(materialId) {
  const history = db.prepare(`
    SELECT SUM(qty) as total_qty, SUM(total) as total_cost
    FROM material_cost_history
    WHERE material_id = ? AND source != 'consumption'
  `).get(materialId)

  const totalQty  = history.total_qty  || 0
  const totalCost = history.total_cost || 0
  const avgCost   = totalQty > 0 ? totalCost / totalQty : 0

  db.prepare('UPDATE materials SET avg_cost = ? WHERE id = ?').run(avgCost, materialId)
  return avgCost
}

// ── Helper: generate bill number BILL-YYYY-00001 ──────────────
function generateBillNumber() {
  const year = new Date().getFullYear()
  const last = db.prepare(`
    SELECT bill_number FROM purchase_bills
    WHERE bill_number LIKE 'BILL-${year}-%'
    ORDER BY id DESC LIMIT 1
  `).get()

  let seq = 1
  if (last) {
    const parts = last.bill_number.split('-')
    seq = parseInt(parts[2]) + 1
  }
  return `BILL-${year}-${String(seq).padStart(5, '0')}`
}

// ── GET all bills ─────────────────────────────────────────────
router.get('/', adminAuth, (req, res) => {
  const { supplier_id, status } = req.query
  let sql = `
    SELECT b.*, s.name as supplier_name,
      COALESCE((SELECT SUM(amount) FROM bill_payments WHERE bill_id = b.id), 0) as amount_paid
    FROM purchase_bills b
    LEFT JOIN suppliers s ON b.supplier_id = s.id
    WHERE 1=1
  `
  const params = []
  if (supplier_id) { sql += ' AND b.supplier_id = ?'; params.push(supplier_id) }
  if (status)      { sql += ' AND b.status = ?';      params.push(status) }
  sql += ' ORDER BY b.bill_date DESC, b.created_at DESC'

  const bills = db.prepare(sql).all(...params)
  res.json(bills.map(b => ({
    ...b,
    bill_image_url: b.bill_image ? `${BASE_URL}/uploads/bills/${b.bill_image}` : null,
    outstanding: b.total - b.amount_paid,
  })))
})

// ── GET single bill with items ────────────────────────────────
router.get('/:id', adminAuth, (req, res) => {
  const bill = db.prepare(`
    SELECT b.*, s.name as supplier_name,
      COALESCE((SELECT SUM(amount) FROM bill_payments WHERE bill_id = b.id), 0) as amount_paid
    FROM purchase_bills b
    LEFT JOIN suppliers s ON b.supplier_id = s.id
    WHERE b.id = ?
  `).get(req.params.id)
  if (!bill) return res.status(404).json({ error: 'Not found' })

  const items = db.prepare(`
    SELECT i.*, m.name as material_name, m.unit
    FROM purchase_bill_items i
    JOIN materials m ON i.material_id = m.id
    WHERE i.bill_id = ?
  `).all(req.params.id)

  const payments = db.prepare(`
    SELECT * FROM bill_payments WHERE bill_id = ? ORDER BY payment_date DESC
  `).all(req.params.id)

  res.json({
    ...bill,
    bill_image_url: bill.bill_image ? `${BASE_URL}/uploads/bills/${bill.bill_image}` : null,
    outstanding: bill.total - bill.amount_paid,
    items,
    payments,
  })
})

// ── POST create bill ──────────────────────────────────────────
// Body: { supplier_id, bill_date, due_date, notes, items: [{ material_id, qty, unit_cost }] }
// File: bill image (optional)
router.post('/', adminAuth, upload.single('bill_image'), (req, res) => {
  try {
    const { supplier_id, bill_date, due_date, notes } = req.body
    let items = []
    try { items = JSON.parse(req.body.items || '[]') } catch { items = [] }

    if (!items.length) return res.status(400).json({ error: 'At least one item required' })

    // Validate all materials exist
    for (const item of items) {
      const mat = db.prepare('SELECT id FROM materials WHERE id = ?').get(item.material_id)
      if (!mat) return res.status(400).json({ error: `Material ID ${item.material_id} not found` })
    }

    const bill_number = generateBillNumber()
    const subtotal = items.reduce((s, i) => s + (parseFloat(i.qty) * parseFloat(i.unit_cost)), 0)
    const total    = subtotal
    const bill_image = req.file ? req.file.filename : null

    const saveBill = db.transaction(() => {
      // Insert bill
      const billResult = db.prepare(`
        INSERT INTO purchase_bills (bill_number, supplier_id, bill_date, due_date, notes, bill_image, subtotal, total, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'unpaid')
      `).run(
        bill_number,
        supplier_id || null,
        bill_date   || new Date().toISOString().split('T')[0],
        due_date    || null,
        notes       || '',
        bill_image,
        subtotal,
        total
      )
      const billId = billResult.lastInsertRowid

      // Insert line items + update material stock + avg cost
      items.forEach(item => {
        const qty      = parseFloat(item.qty)
        const unitCost = parseFloat(item.unit_cost)
        const lineTotal = qty * unitCost

        // Insert bill item
        db.prepare(`
          INSERT INTO purchase_bill_items (bill_id, material_id, qty, unit_cost, total)
          VALUES (?, ?, ?, ?, ?)
        `).run(billId, item.material_id, qty, unitCost, lineTotal)

        // Record in cost history
        db.prepare(`
          INSERT INTO material_cost_history (material_id, source, source_id, qty, unit_cost, total, date)
          VALUES (?, 'bill', ?, ?, ?, ?, ?)
        `).run(item.material_id, billId, qty, unitCost, lineTotal, bill_date || new Date().toISOString().split('T')[0])

        // Update material stock
        db.prepare(`
          UPDATE materials SET qty_in_stock = qty_in_stock + ? WHERE id = ?
        `).run(qty, item.material_id)

        // Recalculate average cost
        recalcAvgCost(item.material_id)
      })

      // Update supplier total_billed
      if (supplier_id) {
        db.prepare('UPDATE suppliers SET total_billed = total_billed + ? WHERE id = ?').run(total, supplier_id)
      }

      return billId
    })

    const billId = saveBill()
    const created = db.prepare('SELECT * FROM purchase_bills WHERE id = ?').get(billId)

    auditLog({
      req, action: 'CREATE', entity: 'bill', entityId: billId,
      description: `Created bill ${bill_number} — Rs ${total.toLocaleString()}`,
      newValue: created
    })

    res.json({ ...created, bill_image_url: bill_image ? `${BASE_URL}/uploads/bills/${bill_image}` : null })

  } catch (err) {
    console.error('Bill error:', err)
    res.status(500).json({ error: err.message })
  }
})

// ── POST record payment against a bill ───────────────────────
router.post('/:id/pay', adminAuth, (req, res) => {
  const { amount, payment_date, payment_method, bank_account, notes } = req.body
  const bill = db.prepare('SELECT * FROM purchase_bills WHERE id = ?').get(req.params.id)
  if (!bill) return res.status(404).json({ error: 'Bill not found' })

  const payAmount = parseFloat(amount)
  if (!payAmount || payAmount <= 0) return res.status(400).json({ error: 'Invalid amount' })

  const recordPayment = db.transaction(() => {
    // Insert payment
    db.prepare(`
      INSERT INTO bill_payments (bill_id, amount, payment_date, payment_method, bank_account, notes)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      req.params.id, payAmount,
      payment_date    || new Date().toISOString().split('T')[0],
      payment_method  || 'bank',
      bank_account    || null,
      notes           || ''
    )

    // Recalculate bill status
    const totalPaid = db.prepare('SELECT SUM(amount) as s FROM bill_payments WHERE bill_id = ?').get(req.params.id).s || 0
    let status = 'unpaid'
    if (totalPaid >= bill.total)      status = 'paid'
    else if (totalPaid > 0)           status = 'partial'
    db.prepare('UPDATE purchase_bills SET status = ? WHERE id = ?').run(status, req.params.id)

    // Update supplier total_paid
    if (bill.supplier_id) {
      db.prepare('UPDATE suppliers SET total_paid = total_paid + ? WHERE id = ?').run(payAmount, bill.supplier_id)
    }
  })

  recordPayment()

  auditLog({
    req, action: 'UPDATE', entity: 'bill', entityId: req.params.id,
    description: `Payment Rs ${payAmount.toLocaleString()} recorded for bill ${bill.bill_number}`,
    newValue: { amount: payAmount, payment_method, bank_account }
  })

  res.json({ success: true })
})

// ── DELETE bill ───────────────────────────────────────────────
router.delete('/:id', adminAuth, (req, res) => {
  const bill = db.prepare('SELECT * FROM purchase_bills WHERE id = ?').get(req.params.id)
  if (!bill) return res.status(404).json({ error: 'Not found' })
  if (bill.status !== 'unpaid') return res.status(400).json({ error: 'Cannot delete a paid or partial bill' })

  const deleteBill = db.transaction(() => {
    const items = db.prepare('SELECT * FROM purchase_bill_items WHERE bill_id = ?').all(bill.id)

    // Reverse stock and cost history
    items.forEach(item => {
      db.prepare('UPDATE materials SET qty_in_stock = qty_in_stock - ? WHERE id = ?').run(item.qty, item.material_id)
      db.prepare('DELETE FROM material_cost_history WHERE source = ? AND source_id = ?').run('bill', bill.id)
      recalcAvgCost(item.material_id)
    })

    // Reverse supplier total_billed
    if (bill.supplier_id) {
      db.prepare('UPDATE suppliers SET total_billed = total_billed - ? WHERE id = ?').run(bill.total, bill.supplier_id)
    }

    db.prepare('DELETE FROM purchase_bill_items WHERE bill_id = ?').run(bill.id)
    db.prepare('DELETE FROM purchase_bills WHERE id = ?').run(bill.id)
  })

  deleteBill()
  auditLog({ req, action: 'DELETE', entity: 'bill', entityId: req.params.id, description: `Deleted bill ${bill.bill_number}`, oldValue: bill })
  res.json({ success: true })
})

module.exports = router