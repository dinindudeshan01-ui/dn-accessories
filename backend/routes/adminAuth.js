// backend/routes/adminAuth.js
// UPDATED — login now includes role + is_active in the JWT token

const express = require('express')
const router  = express.Router()
const bcrypt  = require('bcryptjs')
const jwt     = require('jsonwebtoken')
const db      = require('../db')

// ── Seed first owner account ──────────────────────────────────
router.post('/seed', async (req, res) => {
  const { email, password, name, secret } = req.body
  if (secret !== process.env.ADMIN_SEED_SECRET)
    return res.status(403).json({ error: 'Invalid seed secret' })
  const hash = bcrypt.hashSync(password, 10)
  try {
    await db.prepare(
      'INSERT INTO admins (email, password_hash, name, role) VALUES (?, ?, ?, ?)'
    ).run(email, hash, name, 'owner')
    res.json({ message: 'Admin created successfully' })
  } catch (e) {
    res.status(400).json({ error: 'Admin already exists', detail: e.message })
  }
})

// ── Login ─────────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body
    const admin = await db.prepare('SELECT * FROM admins WHERE email = ?').get(email)

    if (!admin || !bcrypt.compareSync(password, admin.password_hash))
      return res.status(401).json({ error: 'Invalid credentials' })

    if (admin.is_active === 0)
      return res.status(403).json({ error: 'Your account has been deactivated. Contact the owner.' })

    const token = jwt.sign(
      {
        id:        admin.id,
        email:     admin.email,
        name:      admin.name,
        role:      admin.role || 'owner',
        isAdmin:   true,
        is_active: admin.is_active !== 0,
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    )

    res.json({
      token,
      admin: {
        id:    admin.id,
        email: admin.email,
        name:  admin.name,
        role:  admin.role || 'owner',
      }
    })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

module.exports = router