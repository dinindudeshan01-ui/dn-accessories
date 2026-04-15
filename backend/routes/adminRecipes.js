const express   = require('express')
const router    = express.Router()
const db        = require('../db')
const adminAuth = require('../middleware/adminAuth')
const { auditLog } = require('../middleware/auditLog')

// ── GET all products with recipe summary ─────────────────────
router.get('/', adminAuth, async (req, res) => {
  const products = await db.prepare(`
    SELECT p.id, p.name, p.price, p.cost_price, p.category,
           COUNT(pm.id) as material_count,
           COALESCE(SUM(pm.qty_needed * m.avg_cost), 0) as recipe_cost
    FROM products p
    LEFT JOIN product_materials pm ON pm.product_id = p.id
    LEFT JOIN materials m ON pm.material_id = m.id
    GROUP BY p.id
    ORDER BY p.name
  `).all()
  res.json(products)
})

// ── GET recipe for a product ──────────────────────────────────
router.get('/:productId', adminAuth, async (req, res) => {
  const product = await db.prepare('SELECT id, name, cost_price FROM products WHERE id = ?').get(req.params.productId)
  if (!product) return res.status(404).json({ error: 'Product not found' })

  const materials = await db.prepare(`
    SELECT pm.id, pm.material_id, pm.qty_needed, m.name, m.unit, m.avg_cost,
           (pm.qty_needed * m.avg_cost) as line_cost
    FROM product_materials pm
    JOIN materials m ON pm.material_id = m.id
    WHERE pm.product_id = ?
    ORDER BY m.name
  `).all(req.params.productId)

  const totalCost = materials.reduce((s, m) => s + m.line_cost, 0)

  res.json({ product, materials, totalCost })
})

// ── PUT save full recipe for a product ───────────────────────
// Body: { materials: [{ material_id, qty_needed }] }
router.put('/:productId', adminAuth, async (req, res) => {
  const { materials } = req.body
  const product = await db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.productId)
  if (!product) return res.status(404).json({ error: 'Product not found' })

  const totalCost = await db.transaction(async () => {
    // Clear existing recipe
    await db.prepare('DELETE FROM product_materials WHERE product_id = ?').run(req.params.productId)

    // Insert new lines
    for (const m of materials) {
      if (m.material_id && m.qty_needed > 0) {
        await db.prepare('INSERT INTO product_materials (product_id, material_id, qty_needed) VALUES (?,?,?)').run(
          req.params.productId, m.material_id, parseFloat(m.qty_needed)
        )
      }
    }

    // Recalculate and update cost_price
    const { total } = await db.prepare(`
      SELECT COALESCE(SUM(pm.qty_needed * m.avg_cost), 0) as total
      FROM product_materials pm
      JOIN materials m ON pm.material_id = m.id
      WHERE pm.product_id = ?
    `).get(req.params.productId)

    await db.prepare('UPDATE products SET cost_price = ? WHERE id = ?').run(total, req.params.productId)

    return total
  })

  auditLog({ req, action: 'UPDATE', entity: 'recipe', entityId: req.params.productId, description: `Updated recipe for "${product.name}" — cost: ${totalCost.toFixed(2)}` })
  res.json({ success: true, totalCost })
})

module.exports = router