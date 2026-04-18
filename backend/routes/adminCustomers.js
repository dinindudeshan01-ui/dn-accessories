const express   = require('express')
const router    = express.Router()
const db        = require('../db')
const adminAuth = require('../middleware/adminAuth')

// GET /api/admin/customers
// Builds customer profiles from orders — grouped by NIC, includes LTV
router.get('/', adminAuth, async (req, res) => {
  const orders = await db.prepare(`
    SELECT id, reference, full_name, nic, phone1, phone2,
           address, city, total, status, items_json, created_at
    FROM orders
    ORDER BY created_at DESC
  `).all()

  const map = {}

  for (const o of orders) {
    const key = o.nic || o.phone1
    if (!map[key]) {
      map[key] = {
        nic:          o.nic,
        full_name:    o.full_name,
        phone1:       o.phone1,
        phone2:       o.phone2,
        address:      o.address,
        city:         o.city,
        total_spent:  0,
        order_count:  0,
        paid_count:   0,
        first_order:  o.created_at,
        last_order:   o.created_at,
        orders:       [],
      }
    }
    const c = map[key]
    c.total_spent += parseFloat(o.total || 0)
    c.order_count += 1
    if (['paid','shipped'].includes(o.status)) {
      c.paid_count += 1
    }
    if (o.created_at < c.first_order) c.first_order = o.created_at
    if (o.created_at > c.last_order)  c.last_order  = o.created_at
    c.orders.push({
      id:         o.id,
      reference:  o.reference,
      total:      o.total,
      status:     o.status,
      items_json: o.items_json,
      created_at: o.created_at,
    })
  }

  const customers = Object.values(map)
    .sort((a, b) => b.total_spent - a.total_spent)

  // Tag top 10% as VIP
  const vipThreshold = Math.max(1, Math.ceil(customers.length * 0.1))
  customers.forEach((c, i) => {
    c.avg_order_value = c.order_count > 0 ? c.total_spent / c.order_count : 0
    c.is_vip = i < vipThreshold && c.order_count > 0
  })

  res.json(customers)
})

// GET /api/admin/customers/stats
router.get('/stats', adminAuth, async (req, res) => {
  const { count: total }  = await db.prepare("SELECT COUNT(DISTINCT nic) as count FROM orders").get()
  const { count: repeat } = await db.prepare("SELECT COUNT(*) as count FROM (SELECT nic FROM orders GROUP BY nic HAVING COUNT(*) > 1)").get()
  const topSpend          = await db.prepare("SELECT full_name, nic, SUM(total) as spent FROM orders GROUP BY nic ORDER BY spent DESC LIMIT 1").get()

  // Turso doesn't support aggregate functions inside LIMIT — calculate VIP count in JS
  const nicTotals = await db.prepare("SELECT nic, SUM(total) as spent FROM orders GROUP BY nic ORDER BY spent DESC").all()
  const vipCount  = Math.max(1, Math.ceil(nicTotals.length * 0.1))

  res.json({ total, repeat, topSpend, vipCount })
})

module.exports = router