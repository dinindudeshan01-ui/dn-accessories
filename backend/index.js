require('dotenv').config({ path: '../.env' })
const express = require('express')
const cors = require('cors')
const path = require('path')
const app = express()

app.use(cors())
app.use(express.json())

// Serve uploaded slips statically (admin can view them)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')))

// Routes
app.use('/api/products', require('./routes/products'))
app.use('/api/auth',     require('./routes/auth'))
app.use('/api/orders',   require('./routes/orders'))

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok' }))

const PORT = process.env.PORT || 3001
app.listen(PORT, () => console.log(`Backend running on http://localhost:${PORT}`))