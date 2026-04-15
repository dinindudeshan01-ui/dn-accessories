const express = require('express')
const router = express.Router()
const db = require('../db')

router.get('/', async (req, res) => {
  try {
    const { category } = req.query
    const products = category
      ? await db.prepare('SELECT * FROM products WHERE category = ? ORDER BY group_order ASC, sort_order ASC, created_at ASC').all(category)
      : await db.prepare('SELECT * FROM products ORDER BY group_order ASC, sort_order ASC, created_at ASC').all()
    res.json(products)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

router.get('/:id', async (req, res) => {
  try {
    const product = await db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id)
    if (!product) return res.status(404).json({ error: 'Not found' })
    res.json(product)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

module.exports = router