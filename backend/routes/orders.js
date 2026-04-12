const express = require('express')
const router = express.Router()
const db = require('../db')
const multer = require('multer')
const path = require('path')
const fs = require('fs')

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, '../uploads/slips')
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true })

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const unique = `slip_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
    cb(null, unique + path.extname(file.originalname))
  }
})

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|pdf|webp/
    const ext = allowed.test(path.extname(file.originalname).toLowerCase())
    const mime = allowed.test(file.mimetype)
    if (ext && mime) return cb(null, true)
    cb(new Error('Only images (JPG, PNG, WEBP) and PDF allowed'))
  }
})

// GET all orders (admin use)
router.get('/', (req, res) => {
  const orders = db.prepare('SELECT * FROM orders ORDER BY created_at DESC').all()
  res.json(orders)
})

// POST new order with KYC + slip
router.post('/', upload.single('slip'), (req, res) => {
  try {
    const {
      full_name, nic, phone1, phone2,
      address, city, items_json, total
    } = req.body

    if (!full_name || !nic || !phone1 || !address || !items_json || !total) {
      return res.status(400).json({ error: 'Missing required fields' })
    }

    if (!req.file) {
      return res.status(400).json({ error: 'Payment slip is required' })
    }

    // Generate reference number VP-YYYY-XXXXX
    const year = new Date().getFullYear()
    const rand = Math.floor(10000 + Math.random() * 90000)
    const reference = `VP-${year}-${rand}`

    const slip_path = req.file.filename

    const stmt = db.prepare(`
      INSERT INTO orders
        (reference, full_name, nic, phone1, phone2, address, city, total, items_json, slip_path, status)
      VALUES
        (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')
    `)

    const result = stmt.run(
      reference, full_name, nic, phone1,
      phone2 || null, address, city || null,
      parseFloat(total), items_json, slip_path
    )

    res.json({
      id: result.lastInsertRowid,
      reference,
      message: 'Order submitted successfully'
    })

  } catch (err) {
    console.error('Order error:', err)
    res.status(500).json({ error: err.message })
  }
})

module.exports = router