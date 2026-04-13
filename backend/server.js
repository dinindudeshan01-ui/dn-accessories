require('dotenv').config({ path: '../.env' })
const express = require('express')
const cors    = require('cors')
const app     = express()

app.use(cors())
app.use(express.json())

// ── Customer routes ──────────────────────────────────────
app.use('/api/products', require('./routes/products'))
app.use('/api/auth',     require('./routes/auth'))
app.use('/api/orders',   require('./routes/orders'))

// ── Admin routes ─────────────────────────────────────────
app.use('/api/admin/auth',     require('./routes/adminAuth'))
app.use('/api/admin/products', require('./routes/adminProducts'))
app.use('/api/admin/orders',   require('./routes/adminOrders'))
app.use('/api/admin/finance',  require('./routes/adminFinance'))
app.use('/api/admin/theme',    require('./routes/adminTheme'))
app.use('/api/admin/system',   require('./routes/adminSystem'))

// ── TEMP: one-time admin reset — DELETE AFTER USE ────────
app.post('/api/temp-reset-admin', (req, res) => {
  const db     = require('./db')
  const bcrypt = require('bcryptjs')
  if (req.body.secret !== 'resetme123') return res.status(403).json({ error: 'no' })
  db.prepare('DELETE FROM admins').run()
  const hash = bcrypt.hashSync('admin123', 10)
  db.prepare('INSERT INTO admins (email, password_hash, name) VALUES (?, ?, ?)').run('admin@dn.com', hash, 'Admin')
  res.json({ ok: true })
})

// ── Health ───────────────────────────────────────────────
app.get('/api/health', (req, res) => res.json({ status: 'ok' }))

const PORT = process.env.PORT || 3001
app.listen(PORT, () => console.log(`Backend running on http://localhost:${PORT}`))