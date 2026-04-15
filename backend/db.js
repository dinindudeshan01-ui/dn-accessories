// db.js — Turso cloud SQLite
// Drop-in replacement for better-sqlite3 — all methods are async

const { createClient } = require('@libsql/client')

const client = createClient({
  url:       process.env.TURSO_URL,
  authToken: process.env.TURSO_TOKEN,
})

// ── Convert libsql ResultRow to plain object ──────────────────
function rowToObj(result, rowIndex) {
  const row = result.rows[rowIndex]
  if (!row) return undefined
  const obj = {}
  result.columns.forEach((col, i) => { obj[col] = row[i] })
  return obj
}

function toArgs(params) {
  if (!params || params.length === 0) return []
  if (params.length === 1 && typeof params[0] === 'object' && !Array.isArray(params[0]) && params[0] !== null)
    return Object.values(params[0])
  return params.flat()
}

// ── prepare() — returns async get/all/run ────────────────────
function prepare(sql) {
  return {
    get:  (...params) => client.execute({ sql, args: toArgs(params) })
                               .then(r => rowToObj(r, 0)),
    all:  (...params) => client.execute({ sql, args: toArgs(params) })
                               .then(r => r.rows.map((_, i) => rowToObj(r, i))),
    run:  (...params) => client.execute({ sql, args: toArgs(params) })
                               .then(r => ({ lastInsertRowid: Number(r.lastInsertRowid), changes: r.rowsAffected })),
  }
}

// ── exec — run multiple DDL statements ───────────────────────
async function exec(sql) {
  const statements = sql.split(';').map(s => s.trim()).filter(s => s.length > 0)
  for (const s of statements) {
    await client.execute(s)
  }
}

// ── transaction — async sequential (Turso free doesn't support interactive tx over HTTP) ──
function transaction(fn) {
  return async (...args) => fn(...args)
}

// ── pragma — no-op (Turso handles this server-side) ──────────
function pragma() {}

// ── Schema ───────────────────────────────────────────────────
const TABLES = [
  `CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, price REAL NOT NULL,
    description TEXT, image_url TEXT, category TEXT, subcategory TEXT DEFAULT '',
    stock INTEGER DEFAULT 0, sort_order INTEGER DEFAULT 0, group_order INTEGER DEFAULT 0,
    cost_price REAL DEFAULT 0, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`,
  `CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT, email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL, name TEXT, is_admin INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`,
  `CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT, reference TEXT, user_id INTEGER,
    full_name TEXT, nic TEXT, phone1 TEXT, phone2 TEXT, address TEXT, city TEXT,
    bank_used TEXT, slip_path TEXT, total REAL NOT NULL, status TEXT DEFAULT 'pending',
    items_json TEXT NOT NULL, cogs_logged INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`,
  `CREATE TABLE IF NOT EXISTS expenses (
    id INTEGER PRIMARY KEY AUTOINCREMENT, description TEXT NOT NULL,
    category TEXT NOT NULL, amount REAL NOT NULL, date TEXT DEFAULT (date('now')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`,
  `CREATE TABLE IF NOT EXISTS cogs_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT, supplier_id INTEGER, item_name TEXT NOT NULL,
    quantity REAL NOT NULL, unit TEXT DEFAULT 'units', unit_cost REAL NOT NULL,
    total REAL NOT NULL, date TEXT DEFAULT (date('now')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`,
  `CREATE TABLE IF NOT EXISTS theme_settings (
    key TEXT PRIMARY KEY, value TEXT NOT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP)`,
  `CREATE TABLE IF NOT EXISTS audit_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT, admin_id INTEGER, admin_email TEXT,
    action TEXT NOT NULL, entity TEXT NOT NULL, entity_id TEXT, description TEXT,
    old_value TEXT, new_value TEXT, ip_address TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`,
  `CREATE TABLE IF NOT EXISTS admins (
    id INTEGER PRIMARY KEY AUTOINCREMENT, email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL, name TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`,
  `CREATE TABLE IF NOT EXISTS suppliers (
    id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, category TEXT,
    contact TEXT, email TEXT, address TEXT, lead_days INTEGER DEFAULT 3,
    opening_balance REAL DEFAULT 0, total_billed REAL DEFAULT 0,
    total_paid REAL DEFAULT 0, status TEXT DEFAULT 'active', notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`,
  `CREATE TABLE IF NOT EXISTS units (
    id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT UNIQUE NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`,
  `CREATE TABLE IF NOT EXISTS materials (
    id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL,
    unit TEXT NOT NULL DEFAULT 'piece', avg_cost REAL DEFAULT 0,
    qty_in_stock REAL DEFAULT 0, opening_stock REAL DEFAULT 0,
    opening_cost REAL DEFAULT 0, reorder_level REAL DEFAULT 0, notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`,
  `CREATE TABLE IF NOT EXISTS material_cost_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT, material_id INTEGER NOT NULL,
    source TEXT NOT NULL, source_id INTEGER, qty REAL NOT NULL,
    unit_cost REAL NOT NULL, total REAL NOT NULL, date TEXT DEFAULT (date('now')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`,
  `CREATE TABLE IF NOT EXISTS purchase_bills (
    id INTEGER PRIMARY KEY AUTOINCREMENT, bill_number TEXT UNIQUE,
    supplier_id INTEGER, bill_date TEXT DEFAULT (date('now')), due_date TEXT,
    notes TEXT, bill_image TEXT, subtotal REAL DEFAULT 0, total REAL DEFAULT 0,
    status TEXT DEFAULT 'unpaid', created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`,
  `CREATE TABLE IF NOT EXISTS purchase_bill_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT, bill_id INTEGER NOT NULL,
    material_id INTEGER NOT NULL, qty REAL NOT NULL, unit_cost REAL NOT NULL,
    total REAL NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS bill_payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT, bill_id INTEGER NOT NULL,
    amount REAL NOT NULL, payment_date TEXT DEFAULT (date('now')),
    payment_method TEXT DEFAULT 'bank', bank_account TEXT, notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`,
  `CREATE TABLE IF NOT EXISTS product_materials (
    id INTEGER PRIMARY KEY AUTOINCREMENT, product_id INTEGER NOT NULL,
    material_id INTEGER NOT NULL, qty_needed REAL NOT NULL,
    UNIQUE(product_id, material_id))`,
  `CREATE TABLE IF NOT EXISTS order_cogs (
    id INTEGER PRIMARY KEY AUTOINCREMENT, order_id INTEGER NOT NULL,
    product_id INTEGER, product_name TEXT, qty_sold REAL NOT NULL,
    material_id INTEGER, material_name TEXT, unit TEXT, qty_used REAL NOT NULL,
    unit_cost REAL NOT NULL, line_cost REAL NOT NULL, date TEXT DEFAULT (date('now')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`,
  `CREATE TABLE IF NOT EXISTS archive_products (
    id INTEGER PRIMARY KEY AUTOINCREMENT, original_id INTEGER, data_json TEXT NOT NULL,
    deleted_by_email TEXT, deleted_at DATETIME DEFAULT CURRENT_TIMESTAMP, reset_batch TEXT)`,
  `CREATE TABLE IF NOT EXISTS archive_orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT, original_id INTEGER, data_json TEXT NOT NULL,
    deleted_by_email TEXT, deleted_at DATETIME DEFAULT CURRENT_TIMESTAMP, reset_batch TEXT)`,
  `CREATE TABLE IF NOT EXISTS archive_expenses (
    id INTEGER PRIMARY KEY AUTOINCREMENT, original_id INTEGER, data_json TEXT NOT NULL,
    deleted_by_email TEXT, deleted_at DATETIME DEFAULT CURRENT_TIMESTAMP, reset_batch TEXT)`,
  `CREATE TABLE IF NOT EXISTS archive_suppliers (
    id INTEGER PRIMARY KEY AUTOINCREMENT, original_id INTEGER, data_json TEXT NOT NULL,
    deleted_by_email TEXT, deleted_at DATETIME DEFAULT CURRENT_TIMESTAMP, reset_batch TEXT)`,
  `CREATE TABLE IF NOT EXISTS archive_cogs (
    id INTEGER PRIMARY KEY AUTOINCREMENT, original_id INTEGER, data_json TEXT NOT NULL,
    deleted_by_email TEXT, deleted_at DATETIME DEFAULT CURRENT_TIMESTAMP, reset_batch TEXT)`,
]

const DEFAULT_UNITS = ['piece','pair','set','gram','kg','meter','cm','ml','liter','roll','sheet','pack','box','dozen']

async function init() {
  for (const sql of TABLES) {
    await client.execute(sql)
  }
  // Seed units
  for (const u of DEFAULT_UNITS) {
    await client.execute({ sql: 'INSERT OR IGNORE INTO units (name) VALUES (?)', args: [u] })
  }
  console.log('✅ Turso DB ready')
}

const db = { prepare, exec, transaction, pragma, init }

module.exports = db