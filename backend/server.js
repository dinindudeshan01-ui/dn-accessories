require('dotenv').config({ path: '../.env' })
const express = require('express')
const cors    = require('cors')
const path    = require('path')
const app     = express()

app.use(cors({ origin: 'https://dnaccessories02of.netlify.app' }))
app.use(express.json())

// Serve uploaded slips statically (admin can view them)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')))

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

// ── Health ───────────────────────────────────────────────
app.get('/api/health', (req, res) => res.json({ status: 'ok' }))

const PORT = process.env.PORT || 3001
app.listen(PORT, () => console.log(`Backend running on http://localhost:${PORT}`))