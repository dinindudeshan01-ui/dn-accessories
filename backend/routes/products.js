const express = require('express')
const router = express.Router()
const db = require('../db')

// GET /api/products?category=charmed
router.get('/', (req, res) => {
  const { category } = req.query
  const products = category
    ? db.prepare('SELECT * FROM products WHERE category = ? ORDER BY group_order ASC, sort_order ASC, created_at ASC').all(category)
    : db.prepare('SELECT * FROM products ORDER BY group_order ASC, sort_order ASC, created_at ASC').all()
  res.json(products)
})

// GET /api/products/:id
router.get('/:id', (req, res) => {
  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id)
  if (!product) return res.status(404).json({ error: 'Not found' })
  res.json(product)
})

module.exports = router