const express    = require('express')
const router     = express.Router()
const db         = require('../db')
const multer     = require('multer')
const cloudinary = require('cloudinary').v2

// ── Cloudinary config ─────────────────────────────────────────
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'dexbftjks',
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

// ── Multer — memory storage (no disk) ────────────────────────
const ALLOWED_MIMES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf']

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (ALLOWED_MIMES.includes(file.mimetype)) return cb(null, true)
    cb(new Error('Only images (JPG, PNG, WEBP) and PDF allowed'))
  }
})

// ── Helper: upload buffer to Cloudinary ──────────────────────
function uploadToCloudinary(buffer) {
  return new Promise((resolve, reject) => {
    const uniqueName = `slip_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
    const stream = cloudinary.uploader.upload_stream(
      {
        folder:        'dn-accessories/slips',
        public_id:     uniqueName,
        resource_type: 'auto',
      },
      (error, result) => {
        if (error) return reject(error)
        resolve(result.secure_url)
      }
    )
    stream.end(buffer)
  })
}

// ── GET all orders ────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const orders = await db.prepare('SELECT * FROM orders ORDER BY created_at DESC').all()
    res.json(orders)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ── POST new order ────────────────────────────────────────────
router.post('/', upload.single('slip'), async (req, res) => {
  try {
    const { full_name, nic, phone1, phone2, address, city, items_json, total, bank_used } = req.body

    if (!full_name || !nic || !phone1 || !address || !items_json || !total)
      return res.status(400).json({ error: 'Missing required fields' })
    if (!req.file)
      return res.status(400).json({ error: 'Payment slip is required' })

    const slipUrl = await uploadToCloudinary(req.file.buffer)

    const result = await db.prepare(`
      INSERT INTO orders (full_name, nic, phone1, phone2, address, city, total, items_json, slip_path, bank_used, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')
    `).run(full_name, nic, phone1, phone2 || null, address, city || null, parseFloat(total), items_json, slipUrl, bank_used || null)

    const year      = new Date().getFullYear()
    const reference = `DN-${year}-${String(result.lastInsertRowid).padStart(5, '0')}`
    await db.prepare('UPDATE orders SET reference = ? WHERE id = ?').run(reference, result.lastInsertRowid)

    res.json({ id: result.lastInsertRowid, reference, message: 'Order submitted successfully' })
  } catch (err) {
    console.error('Order error:', err)
    res.status(500).json({ error: err.message })
  }
})

module.exports = router