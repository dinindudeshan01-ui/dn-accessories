const express   = require('express')
const router    = express.Router()
const db        = require('../db')
const adminAuth = require('../middleware/adminAuth')
const { requireRole } = require('../middleware/adminAuth')
const financeOnly = requireRole('finance')
const { auditLog } = require('../middleware/auditLog')
const multer    = require('multer')
const path      = require('path')
const fs        = require('fs')

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
async function recalcAvgCost(materialId) {
  const history = await db.prepare(`
    SELECT SUM(qty) as total_qty, SUM(total) as total_cost
    FROM material_cost_history
    WHERE material_id = ? AND source != 'consumption'
  `).get(materialId)

  const totalQty  = history.total_qty  || 0
  const totalCost = history.total_cost || 0
  const avgCost   = totalQty > 0 ? totalCost / totalQty : 0

  await db.prepare('UPDATE materials SET avg_cost = ? WHERE id = ?').run(avgCost, materialId)
  return avgCost
}

// ── Helper: recalc cost_price for all handmade products using a material ──
async function recalcProductCosts(materialId) {
  await db.prepare(`
    UPDATE products
    SET cost_price = (
      SELECT COALESCE(SUM(pm.qty_needed * m.avg_cost), 0)
      FROM product_materials pm
      JOIN materials m ON pm.material_id = m.id
      WHERE pm.product_id = products.id
    )
    WHERE id IN (
      SELECT DISTINCT pm.product_id
      FROM product_materials pm
      WHERE pm.material_id = ?
    )
    AND category = 'handmade'
  `).run(materialId)
}

// ── Helper: generate bill number BILL-YYYY-00001 ──────────────
async function generateBillNumber() {
  const year = new Date().getFullYear()
  const last = await db.prepare(`
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
router.get('/', adminAuth, async (req, res) => {
  const { supplier_id, status } = req.query
  let sql = `
    SELECT b.*, s.name as supplier_name,
      COALESCE(p.amount_paid, 0) as amount_paid
    FROM purchase_bills b
    LEFT JOIN suppliers s ON b.supplier_id = s.id
    LEFT JOIN (
      SELECT bill_id, SUM(amount) as amount_paid
      FROM bill_payments
      WHERE voided = 0
      GROUP BY bill_id
    ) p ON p.bill_id = b.id
    WHERE 1=1
  `
  const params = []
  if (supplier_id) { sql += ' AND b.supplier_id = ?'; params.push(supplier_id) }
  if (status)      { sql += ' AND b.status = ?';      params.push(status) }
  sql += ' ORDER BY b.bill_date DESC, b.created_at DESC'

  const bills = await db.prepare(sql).all(...params)
  res.json(bills.map(b => ({
    ...b,
    total:       Number(b.total ?? 0),
    subtotal:    Number(b.subtotal ?? 0),
    amount_paid: Number(b.amount_paid ?? 0),
    bill_image_url: b.bill_image ? `${BASE_URL}/uploads/bills/${b.bill_image}` : null,
    outstanding: Number(b.total ?? 0) - Number(b.amount_paid ?? 0),
  })))
})

// ── GET single bill with items ────────────────────────────────
router.get('/:id', adminAuth, async (req, res) => {
  const [bill, items, payments] = await Promise.all([
    db.prepare(`
      SELECT b.*, s.name as supplier_name,
        COALESCE(p.amount_paid, 0) as amount_paid
      FROM purchase_bills b
      LEFT JOIN suppliers s ON b.supplier_id = s.id
      LEFT JOIN (
        SELECT bill_id, SUM(amount) as amount_paid FROM bill_payments WHERE voided = 0 GROUP BY bill_id
      ) p ON p.bill_id = b.id
      WHERE b.id = ?
    `).get(req.params.id),
    db.prepare(`
      SELECT i.*, m.name as material_name, m.unit
      FROM purchase_bill_items i
      JOIN materials m ON i.material_id = m.id
      WHERE i.bill_id = ?
    `).all(req.params.id),
    db.prepare(`
      SELECT * FROM bill_payments WHERE bill_id = ? ORDER BY payment_date DESC
    `).all(req.params.id),
  ])

  if (!bill) return res.status(404).json({ error: 'Not found' })

  res.json({
    ...bill,
    bill_image_url: bill.bill_image ? `${BASE_URL}/uploads/bills/${bill.bill_image}` : null,
    total:       Number(bill.total ?? 0),
    subtotal:    Number(bill.subtotal ?? 0),
    amount_paid: Number(bill.amount_paid ?? 0),
    outstanding: Number(bill.total ?? 0) - Number(bill.amount_paid ?? 0),
    items,
    payments,
  })
})

// ── POST create bill ──────────────────────────────────────────
router.post('/', financeOnly, upload.single('bill_image'), async (req, res) => {
  try {
    const { supplier_id, bill_date, due_date, notes } = req.body
    let items = []
    try { items = JSON.parse(req.body.items || '[]') } catch { items = [] }

    if (!items.length) return res.status(400).json({ error: 'At least one item required' })

    const matChecks = await Promise.all(
      items.map(item => db.prepare('SELECT id FROM materials WHERE id = ?').get(item.material_id))
    )
    for (let i = 0; i < items.length; i++) {
      if (!matChecks[i]) return res.status(400).json({ error: `Material ID ${items[i].material_id} not found` })
    }

    const bill_number  = await generateBillNumber()
    const subtotal     = items.reduce((s, i) => s + (parseFloat(i.qty) * parseFloat(i.unit_cost)), 0)
    const total        = subtotal
    const bill_image   = req.file ? req.file.filename : null
    const resolvedDate = bill_date || new Date().toISOString().split('T')[0]

    const billResult = await db.prepare(`
      INSERT INTO purchase_bills (bill_number, supplier_id, bill_date, due_date, notes, bill_image, subtotal, total, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'unpaid')
    `).run(
      bill_number,
      supplier_id || null,
      resolvedDate,
      due_date    || null,
      notes       || '',
      bill_image,
      subtotal,
      total
    )
    const newBillId = Number(billResult.lastInsertRowid)

    const batchStatements = []
    for (const item of items) {
      const qty       = parseFloat(item.qty)
      const unitCost  = parseFloat(item.unit_cost)
      const lineTotal = qty * unitCost

      batchStatements.push({ sql: 'INSERT INTO purchase_bill_items (bill_id, material_id, qty, unit_cost, total) VALUES (?, ?, ?, ?, ?)', args: [newBillId, item.material_id, qty, unitCost, lineTotal] })
      batchStatements.push({ sql: 'INSERT INTO material_cost_history (material_id, source, source_id, qty, unit_cost, total, date) VALUES (?, ?, ?, ?, ?, ?, ?)', args: [item.material_id, 'bill', newBillId, qty, unitCost, lineTotal, resolvedDate] })
      batchStatements.push({ sql: 'UPDATE materials SET qty_in_stock = qty_in_stock + ? WHERE id = ?', args: [qty, item.material_id] })
    }
    if (supplier_id) {
      batchStatements.push({ sql: 'UPDATE suppliers SET total_billed = total_billed + ? WHERE id = ?', args: [total, supplier_id] })
    }

    await db.batch(batchStatements, 'write')

    for (const item of items) {
      await recalcAvgCost(item.material_id)
      await recalcProductCosts(item.material_id)
    }

    const created = await db.prepare('SELECT * FROM purchase_bills WHERE id = ?').get(newBillId)

    auditLog({
      req, action: 'CREATE', entity: 'bill', entityId: newBillId,
      description: `Created bill ${bill_number} — Rs ${total.toLocaleString()}`,
      newValue: created
    })

    res.json({ ...created, bill_image_url: bill_image ? `${BASE_URL}/uploads/bills/${bill_image}` : null })

  } catch (err) {
    console.error('Bill error:', err)
    res.status(500).json({ error: err.message })
  }
})

// ── PUT edit bill ─────────────────────────────────────────────
// Unpaid  → full reverse old items, apply new items, recalc stock/costs
// Paid / Partial → amendment only: supplier, due_date, notes (no stock change)
router.put('/:id', financeOnly, async (req, res) => {
  try {
    const billId = req.params.id
    const bill   = await db.prepare('SELECT * FROM purchase_bills WHERE id = ?').get(billId)
    if (!bill) return res.status(404).json({ error: 'Bill not found' })

    let { supplier_id, bill_date, due_date, notes, items } = req.body
    if (typeof items === 'string') { try { items = JSON.parse(items) } catch { items = [] } }

    // ── PAID / PARTIAL — meta-only amendment ─────────────────
    if (bill.status !== 'unpaid') {
      const oldSupplierId = bill.supplier_id

      // Track what actually changed for the audit log
      const changes = {}
      if (supplier_id !== undefined && String(supplier_id || '') !== String(oldSupplierId || '')) changes.supplier_id = { from: oldSupplierId, to: supplier_id }
      if (due_date    !== undefined && due_date    !== bill.due_date)  changes.due_date  = { from: bill.due_date,  to: due_date }
      if (notes       !== undefined && notes       !== bill.notes)     changes.notes     = { from: bill.notes,     to: notes }

      await db.prepare(`
        UPDATE purchase_bills
        SET supplier_id = ?, due_date = ?, notes = ?
        WHERE id = ?
      `).run(
        supplier_id !== undefined ? (supplier_id || null) : (oldSupplierId || null),
        due_date    !== undefined ? (due_date    || null) : (bill.due_date || null),
        notes       !== undefined ? notes : bill.notes,
        billId
      )

      // If supplier changed, shift total_billed between the two suppliers
      if (changes.supplier_id) {
        const ops = []
        if (oldSupplierId) ops.push({ sql: 'UPDATE suppliers SET total_billed = total_billed - ? WHERE id = ?', args: [bill.total, oldSupplierId] })
        if (supplier_id)   ops.push({ sql: 'UPDATE suppliers SET total_billed = total_billed + ? WHERE id = ?', args: [bill.total, supplier_id] })
        if (ops.length) await db.batch(ops, 'write')
      }

      auditLog({
        req, action: 'AMEND', entity: 'bill', entityId: billId,
        description: `Amended ${bill.status} bill ${bill.bill_number} (meta only — no stock change)`,
        oldValue: bill, newValue: changes,
      })

      const updated = await db.prepare('SELECT * FROM purchase_bills WHERE id = ?').get(billId)
      return res.json({ ...updated, amendment: true, changes })
    }

    // ── UNPAID — full reverse-and-reapply ─────────────────────
    if (!items || !items.length) return res.status(400).json({ error: 'At least one item required' })

    const matChecks = await Promise.all(
      items.map(item => db.prepare('SELECT id FROM materials WHERE id = ?').get(item.material_id))
    )
    for (let i = 0; i < items.length; i++) {
      if (!matChecks[i]) return res.status(400).json({ error: `Material ID ${items[i].material_id} not found` })
    }

    const oldItems      = await db.prepare('SELECT * FROM purchase_bill_items WHERE bill_id = ?').all(billId)
    const oldSupplierId = bill.supplier_id
    const resolvedDate  = bill_date || bill.bill_date
    const newSubtotal   = items.reduce((s, i) => s + parseFloat(i.qty) * parseFloat(i.unit_cost), 0)
    const newTotal      = newSubtotal

    // Build one atomic batch: reverse → delete old → update header → insert new
    const ops = []

    // Reverse old stock
    for (const item of oldItems) {
      ops.push({ sql: 'UPDATE materials SET qty_in_stock = qty_in_stock - ? WHERE id = ?', args: [item.qty, item.material_id] })
    }
    // Delete old cost history for this bill
    ops.push({ sql: 'DELETE FROM material_cost_history WHERE source = ? AND source_id = ?', args: ['bill', billId] })
    // Delete old line items
    ops.push({ sql: 'DELETE FROM purchase_bill_items WHERE bill_id = ?', args: [billId] })
    // Reverse old supplier total_billed
    if (oldSupplierId) ops.push({ sql: 'UPDATE suppliers SET total_billed = total_billed - ? WHERE id = ?', args: [bill.total, oldSupplierId] })
    // Update bill header
    ops.push({
      sql:  'UPDATE purchase_bills SET supplier_id=?, bill_date=?, due_date=?, notes=?, subtotal=?, total=? WHERE id=?',
      args: [supplier_id || null, resolvedDate, due_date || null, notes || '', newSubtotal, newTotal, billId],
    })
    // Insert new items + cost history + stock
    for (const item of items) {
      const qty       = parseFloat(item.qty)
      const unitCost  = parseFloat(item.unit_cost)
      const lineTotal = qty * unitCost
      ops.push({ sql: 'INSERT INTO purchase_bill_items (bill_id, material_id, qty, unit_cost, total) VALUES (?,?,?,?,?)', args: [billId, item.material_id, qty, unitCost, lineTotal] })
      ops.push({ sql: 'INSERT INTO material_cost_history (material_id, source, source_id, qty, unit_cost, total, date) VALUES (?,?,?,?,?,?,?)', args: [item.material_id, 'bill', billId, qty, unitCost, lineTotal, resolvedDate] })
      ops.push({ sql: 'UPDATE materials SET qty_in_stock = qty_in_stock + ? WHERE id = ?', args: [qty, item.material_id] })
    }
    // Apply new supplier total_billed
    if (supplier_id) ops.push({ sql: 'UPDATE suppliers SET total_billed = total_billed + ? WHERE id = ?', args: [newTotal, supplier_id] })

    await db.batch(ops, 'write')

    // Recalc avg cost for all touched materials (old + new)
    const affectedMats = [...new Set([...oldItems.map(i => i.material_id), ...items.map(i => Number(i.material_id))])]
    for (const matId of affectedMats) {
      await recalcAvgCost(matId)
      await recalcProductCosts(matId)
    }

    const updated = await db.prepare('SELECT * FROM purchase_bills WHERE id = ?').get(billId)

    auditLog({
      req, action: 'UPDATE', entity: 'bill', entityId: billId,
      description: `Edited bill ${bill.bill_number} — new total Rs ${newTotal.toLocaleString()}`,
      oldValue: { ...bill, items: oldItems },
      newValue: { ...updated, items },
    })

    res.json({ ...updated, bill_image_url: updated.bill_image ? `${BASE_URL}/uploads/bills/${updated.bill_image}` : null })

  } catch (err) {
    console.error('Bill edit error:', err)
    res.status(500).json({ error: err.message })
  }
})

// ── POST record payment against a bill ───────────────────────
router.post('/:id/pay', financeOnly, async (req, res) => {
  const { amount, payment_date, payment_method, bank_account, notes } = req.body
  const bill = await db.prepare('SELECT * FROM purchase_bills WHERE id = ?').get(req.params.id)
  if (!bill) return res.status(404).json({ error: 'Bill not found' })

  const payAmount = parseFloat(amount)
  if (!payAmount || payAmount <= 0) return res.status(400).json({ error: 'Invalid amount' })

  const resolvedDate = payment_date || new Date().toISOString().split('T')[0]

  await db.batch([
    {
      sql:  'INSERT INTO bill_payments (bill_id, amount, payment_date, payment_method, bank_account, notes, voided) VALUES (?, ?, ?, ?, ?, ?, 0)',
      args: [req.params.id, payAmount, resolvedDate, payment_method || 'bank', bank_account || null, notes || ''],
    },
    ...(bill.supplier_id ? [{
      sql:  'UPDATE suppliers SET total_paid = total_paid + ? WHERE id = ?',
      args: [payAmount, bill.supplier_id],
    }] : []),
  ], 'write')

  const payRow = await db.prepare('SELECT SUM(amount) as total FROM bill_payments WHERE bill_id = ? AND voided = 0').get(req.params.id)
  const paid = Number(payRow?.total ?? 0)
  let status = 'unpaid'
  if (paid >= bill.total)  status = 'paid'
  else if (paid > 0)       status = 'partial'
  await db.prepare('UPDATE purchase_bills SET status = ? WHERE id = ?').run(status, req.params.id)

  auditLog({
    req, action: 'UPDATE', entity: 'bill', entityId: req.params.id,
    description: `Payment Rs ${payAmount.toLocaleString()} recorded for bill ${bill.bill_number}`,
    newValue: { amount: payAmount, payment_method, bank_account }
  })

  res.json({ success: true })
})

// ── POST void a payment (payment reversal) ────────────────────
router.post('/:id/payments/:paymentId/void', financeOnly, async (req, res) => {
  try {
    const { reason } = req.body
    if (!reason || !reason.trim()) return res.status(400).json({ error: 'Void reason is required' })

    const bill    = await db.prepare('SELECT * FROM purchase_bills WHERE id = ?').get(req.params.id)
    const payment = await db.prepare('SELECT * FROM bill_payments WHERE id = ? AND bill_id = ?').get(req.params.paymentId, req.params.id)

    if (!bill)    return res.status(404).json({ error: 'Bill not found' })
    if (!payment) return res.status(404).json({ error: 'Payment not found' })
    if (payment.voided) return res.status(400).json({ error: 'Payment already voided' })

    // Mark payment as voided
    await db.prepare(`
      UPDATE bill_payments SET voided = 1, void_reason = ?, voided_at = CURRENT_TIMESTAMP, voided_by = ?
      WHERE id = ?
    `).run(reason.trim(), req.admin?.email || 'system', payment.id)

    // Reverse supplier total_paid
    if (bill.supplier_id) {
      await db.prepare('UPDATE suppliers SET total_paid = total_paid - ? WHERE id = ?').run(payment.amount, bill.supplier_id)
    }

    // Recalculate bill status from remaining active payments
    const payRow = await db.prepare('SELECT SUM(amount) as total FROM bill_payments WHERE bill_id = ? AND voided = 0').get(req.params.id)
    const paid   = Number(payRow?.total ?? 0)
    let status   = 'unpaid'
    if (paid >= bill.total)  status = 'paid'
    else if (paid > 0)       status = 'partial'
    await db.prepare('UPDATE purchase_bills SET status = ? WHERE id = ?').run(status, req.params.id)

    auditLog({
      req, action: 'VOID', entity: 'bill_payment', entityId: payment.id,
      description: `Voided payment of Rs ${payment.amount.toLocaleString()} on bill ${bill.bill_number} — reason: ${reason}`,
      oldValue: payment,
      newValue: { voided: true, void_reason: reason },
    })

    res.json({ success: true, newStatus: status, paidSoFar: paid })

  } catch (err) {
    console.error('Void payment error:', err)
    res.status(500).json({ error: err.message })
  }
})

// ── DELETE bill ───────────────────────────────────────────────
router.delete('/:id', financeOnly, async (req, res) => {
  const bill = await db.prepare('SELECT * FROM purchase_bills WHERE id = ?').get(req.params.id)
  if (!bill) return res.status(404).json({ error: 'Not found' })
  if (bill.status !== 'unpaid') return res.status(400).json({ error: 'Cannot delete a paid or partial bill' })

  const items = await db.prepare('SELECT * FROM purchase_bill_items WHERE bill_id = ?').all(bill.id)

  const batchStatements = items.flatMap(item => [
    { sql: 'UPDATE materials SET qty_in_stock = qty_in_stock - ? WHERE id = ?', args: [item.qty, item.material_id] },
    { sql: 'DELETE FROM material_cost_history WHERE source = ? AND source_id = ?', args: ['bill', bill.id] },
  ])
  batchStatements.push({ sql: 'DELETE FROM purchase_bill_items WHERE bill_id = ?', args: [bill.id] })
  batchStatements.push({ sql: 'DELETE FROM purchase_bills WHERE id = ?',           args: [bill.id] })
  if (bill.supplier_id) {
    batchStatements.push({ sql: 'UPDATE suppliers SET total_billed = total_billed - ? WHERE id = ?', args: [bill.total, bill.supplier_id] })
  }

  await db.batch(batchStatements, 'write')

  for (const item of items) {
    await recalcAvgCost(item.material_id)
    await recalcProductCosts(item.material_id)
  }

  auditLog({ req, action: 'DELETE', entity: 'bill', entityId: req.params.id, description: `Deleted bill ${bill.bill_number}`, oldValue: bill })
  res.json({ success: true })
})

module.exports = router