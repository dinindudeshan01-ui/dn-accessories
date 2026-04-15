const express = require('express')
const router = express.Router()
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const db = require('../db')

router.post('/seed', async (req, res) => {
  const { email, password, name, secret } = req.body
  if (secret !== process.env.ADMIN_SEED_SECRET)
    return res.status(403).json({ error: 'Invalid seed secret' })
  const hash = bcrypt.hashSync(password, 10)
  try {
    await db.prepare('INSERT INTO admins (email, password_hash, name) VALUES (?, ?, ?)').run(email, hash, name)
    res.json({ message: 'Admin created successfully' })
  } catch (e) {
    res.status(400).json({ error: 'Admin already exists', detail: e.message })
  }
})

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body
    const admin = await db.prepare('SELECT * FROM admins WHERE email = ?').get(email)
    if (!admin || !bcrypt.compareSync(password, admin.password_hash))
      return res.status(401).json({ error: 'Invalid credentials' })
    const token = jwt.sign({ id: admin.id, email: admin.email, isAdmin: true }, process.env.JWT_SECRET, { expiresIn: '7d' })
    res.json({ token })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

module.exports = router