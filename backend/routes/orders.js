const express = require('express')
const router = express.Router()
const db = require('../db')
const multer = require('multer')
const path = require('path')
const fs = require('fs')

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, '../uploads/slips')
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true })

// Migration — add bank_used column if missing
try { db.exec('ALTER TABLE orders ADD COLUMN bank_used TEXT') } catch { /* already exists */ }

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const unique = `slip_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
    cb(null, unique + path.extname(file.originalname))
  }
})

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|pdf|webp/
    const ext = allowed.test(path.extname(file.originalname).toLowerCase())
    const mime = allowed.test(file.mimetype)
    if (ext && mime) return cb(null, true)
    cb(new Error('Only images (JPG, PNG, WEBP) and PDF allowed'))
  }
})

// GET all orders
router.get('/', (req, res) => {
  const orders = db.prepare('SELECT * FROM orders ORDER BY created_at DESC').all()
  res.json(orders)
})

// POST new order
router.post('/', upload.single('slip'), (req, res) => {
  try {
    const {
      full_name, nic, phone1, phone2,
      address, city, items_json, total, bank_used
    } = req.body

    if (!full_name || !nic || !phone1 || !address || !items_json || !total) {
      return res.status(400).json({ error: 'Missing required fields' })
    }

    if (!req.file) {
      return res.status(400).json({ error: 'Payment slip is required' })
    }

    const slip_path = req.file.filename

    // Insert first — no reference yet, we need the id
    const result = db.prepare(`
      INSERT INTO orders
        (full_name, nic, phone1, phone2, address, city, total, items_json, slip_path, bank_used, status)
      VALUES
        (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')
    `).run(
      full_name,
      nic,
      phone1,
      phone2    || null,
      address,
      city      || null,
      parseFloat(total),
      items_json,
      slip_path,
      bank_used || null
    )

    // Generate DN-YYYY-00001 using the real inserted id
    const year = new Date().getFullYear()
    const reference = `DN-${year}-${String(result.lastInsertRowid).padStart(5, '0')}`

    // Save reference back
    db.prepare('UPDATE orders SET reference = ? WHERE id = ?')
      .run(reference, result.lastInsertRowid)

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