require('dotenv').config({ path: '../.env' })
const express = require('express')
const cors    = require('cors')
const path    = require('path')
const app     = express()

app.use(cors({ origin: process.env.FRONTEND_URL || 'https://dnaccessories.netlify.app' }))
app.use(express.json())

// ── Static file serving ───────────────────────────────────────
app.use('/uploads', express.static(path.join(__dirname, 'uploads')))

// ── Customer routes ───────────────────────────────────────────
app.use('/api/products', require('./routes/products'))
app.use('/api/auth',     require('./routes/auth'))
app.use('/api/orders',   require('./routes/orders'))

// ── Admin routes ──────────────────────────────────────────────
app.use('/api/admin/auth',      require('./routes/adminAuth'))
app.use('/api/admin/products',  require('./routes/adminProducts'))
app.use('/api/admin/orders',    require('./routes/adminOrders'))
app.use('/api/admin/finance',   require('./routes/adminFinance'))
app.use('/api/admin/theme',     require('./routes/adminTheme'))
app.use('/api/admin/system',    require('./routes/adminSystem'))
app.use('/api/admin/customers', require('./routes/adminCustomers'))

// ── V12 new routes ────────────────────────────────────────────
app.use('/api/admin/materials', require('./routes/adminMaterials'))
app.use('/api/admin/bills',     require('./routes/adminBills'))
app.use('/api/admin/recipes', require('./routes/adminRecipes'))
app.use('/api/admin/suppliers', require('./routes/adminSuppliers'))

// ── Health ────────────────────────────────────────────────────
app.get('/api/health', (req, res) => res.json({ status: 'ok', version: 'v12' }))

const PORT = process.env.PORT || 3001
app.listen(PORT, () => console.log(`Backend running on http://localhost:${PORT}`))