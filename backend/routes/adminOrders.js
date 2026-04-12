const express = require('express')
const router  = express.Router()
const db      = require('../db')
const adminAuth = require('../middleware/adminAuth')
const { auditLog } = require('../middleware/auditLog')

const BASE_URL = process.env.BASE_URL || 'http://localhost:3001'

router.get('/', adminAuth, (req, res) => {
  const { status, limit = 100 } = req.query
  const orders = status
    ? db.prepare('SELECT * FROM orders WHERE status = ? ORDER BY created_at DESC LIMIT ?').all(status, parseInt(limit))
    : db.prepare('SELECT * FROM orders ORDER BY created_at DESC LIMIT ?').all(parseInt(limit))

  res.json(orders.map(o => ({
    ...o,
    items: JSON.parse(o.items_json || '[]'),
    slip_url: o.slip_path ? `${BASE_URL}/uploads/slips/${o.slip_path}` : null,
  })))
})

router.get('/stats', adminAuth, (req, res) => {
  const total    = db.prepare("SELECT COUNT(*) as count, SUM(total) as revenue FROM orders").get()
  const byStatus = db.prepare("SELECT status, COUNT(*) as count FROM orders GROUP BY status").all()
  const monthly  = db.prepare(`SELECT strftime('%Y-%m', created_at) as month, COUNT(*) as orders, SUM(total) as revenue FROM orders GROUP BY month ORDER BY month DESC LIMIT 12`).all()
  const daily7   = db.prepare(`SELECT date(created_at) as day, COUNT(*) as orders, SUM(total) as revenue FROM orders WHERE created_at >= date('now', '-7 days') GROUP BY day ORDER BY day ASC`).all()
  res.json({ total, byStatus, monthly, daily7 })
})

router.patch('/:id/status', adminAuth, (req, res) => {
  const { status } = req.body
  const valid = ['pending', 'paid', 'shipped', 'refunded', 'cancelled']
  if (!valid.includes(status)) return res.status(400).json({ error: 'Invalid status' })
  const old = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id)
  db.prepare('UPDATE orders SET status = ? WHERE id = ?').run(status, req.params.id)
  auditLog({
    req, action: 'UPDATE', entity: 'order', entityId: req.params.id,
    description: `Order #${req.params.id} status: ${old?.status} → ${status}`,
    oldValue: { status: old?.status }, newValue: { status }
  })
  res.json({ success: true })
})

module.exports = router