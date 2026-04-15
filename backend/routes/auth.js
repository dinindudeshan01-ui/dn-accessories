const express = require('express')
const router = express.Router()
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const db = require('../db')

router.post('/register', async (req, res) => {
  try {
    const { email, password, name } = req.body
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' })
    const hash = bcrypt.hashSync(password, 10)
    const result = await db.prepare('INSERT INTO users (email, password_hash, name) VALUES (?,?,?)').run(email, hash, name)
    res.json({ id: result.lastInsertRowid, email })
  } catch {
    res.status(409).json({ error: 'Email already in use' })
  }
})

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body
    const user = await db.prepare('SELECT * FROM users WHERE email = ?').get(email)
    if (!user || !bcrypt.compareSync(password, user.password_hash))
      return res.status(401).json({ error: 'Invalid credentials' })
    const token = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '7d' })
    res.json({ token, user: { id: user.id, email: user.email, name: user.name } })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

module.exports = router