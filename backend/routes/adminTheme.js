const express = require('express')
const router = express.Router()
const db = require('../db')
const adminAuth = require('../middleware/adminAuth')

const DEFAULTS = {
  accentColor:     '#ec4899',
  heroHeadline:    'Elevate Your Style With D&N',
  heroSubtext:     'The Bracelet Goat · New collection dropping soon',
  heroCtaText:     'Shop The Collection',
  heroImage:       'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?auto=format&fit=crop&q=90&w=2000',
  logoText:        'D&N ACCESSORIES',
  marqueeText:     'WELCOME TO D&N ACCESSORIES 🌸 MEET THE BRACELET GOAT',
  navLink1:        'Home',
  navLink2:        'Catalog',
  navLink3:        'Refund Policy',
  navLink4:        'Contact',
  showHero:        'true',
  showFeatured:    'true',
  showMarquee:     'true',
  showVideo:       'true',
  showAbout:       'true',
  showVendor:      'true',
  showNewsletter:  'true',
}

// GET /api/admin/theme  — returns all settings merged with defaults
router.get('/', (req, res) => {
  const rows = db.prepare('SELECT key, value FROM theme_settings').all()
  const saved = Object.fromEntries(rows.map(r => [r.key, r.value]))
  res.json({ ...DEFAULTS, ...saved })
})

// POST /api/admin/theme  — upsert all keys sent
router.post('/', adminAuth, (req, res) => {
  const upsert = db.prepare(
    'INSERT INTO theme_settings (key, value, updated_at) VALUES (?,?,CURRENT_TIMESTAMP) ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=CURRENT_TIMESTAMP'
  )
  const updateMany = db.transaction((settings) => {
    for (const [key, value] of Object.entries(settings)) {
      if (key in DEFAULTS) upsert.run(key, String(value))
    }
  })
  updateMany(req.body)
  const rows = db.prepare('SELECT key, value FROM theme_settings').all()
  const saved = Object.fromEntries(rows.map(r => [r.key, r.value]))
  res.json({ ...DEFAULTS, ...saved })
})

module.exports = router