const Database = require('better-sqlite3')
const path     = require('path')

const db = new Database(path.join(__dirname, 'shop.db'))

// ── Enable WAL mode for better concurrent performance ─────────
db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

// ─────────────────────────────────────────────────────────────
//  CORE TABLES (existing — unchanged)
// ─────────────────────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS products (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    name         TEXT    NOT NULL,
    price        REAL    NOT NULL,
    description  TEXT,
    image_url    TEXT,
    category     TEXT,
    subcategory  TEXT    DEFAULT '',
    stock        INTEGER DEFAULT 0,
    sort_order   INTEGER DEFAULT 0,
    group_order  INTEGER DEFAULT 0,
    cost_price   REAL    DEFAULT 0,
    created_at   DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    email         TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name          TEXT,
    is_admin      INTEGER DEFAULT 0,
    created_at    DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS orders (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    reference  TEXT,
    user_id    INTEGER,
    full_name  TEXT,
    nic        TEXT,
    phone1     TEXT,
    phone2     TEXT,
    address    TEXT,
    city       TEXT,
    bank_used  TEXT,
    slip_path  TEXT,
    total      REAL    NOT NULL,
    status     TEXT    DEFAULT 'pending',
    items_json TEXT    NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS expenses (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    description TEXT    NOT NULL,
    category    TEXT    NOT NULL,
    amount      REAL    NOT NULL,
    date        TEXT    DEFAULT (date('now')),
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- Kept for archive compatibility — no longer used for new entries
  CREATE TABLE IF NOT EXISTS cogs_entries (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    supplier_id INTEGER,
    item_name   TEXT    NOT NULL,
    quantity    REAL    NOT NULL,
    unit        TEXT    DEFAULT 'units',
    unit_cost   REAL    NOT NULL,
    total       REAL    NOT NULL,
    date        TEXT    DEFAULT (date('now')),
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id)
  );

  CREATE TABLE IF NOT EXISTS theme_settings (
    key        TEXT PRIMARY KEY,
    value      TEXT NOT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS audit_log (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    admin_id    INTEGER,
    admin_email TEXT,
    action      TEXT NOT NULL,
    entity      TEXT NOT NULL,
    entity_id   TEXT,
    description TEXT,
    old_value   TEXT,
    new_value   TEXT,
    ip_address  TEXT,
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS admins (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    email         TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name          TEXT,
    created_at    DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`)

// ─────────────────────────────────────────────────────────────
//  SUPPLIERS — enhanced with balances
// ─────────────────────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS suppliers (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    name            TEXT NOT NULL,
    category        TEXT,
    contact         TEXT,
    email           TEXT,
    address         TEXT,
    lead_days       INTEGER DEFAULT 3,
    opening_balance REAL    DEFAULT 0,
    total_billed    REAL    DEFAULT 0,
    total_paid      REAL    DEFAULT 0,
    status          TEXT    DEFAULT 'active',
    notes           TEXT,
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`)

// ─────────────────────────────────────────────────────────────
//  UNITS MASTER — shared across materials, bills, recipes
// ─────────────────────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS units (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    name       TEXT UNIQUE NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`)

// Seed default units if empty
const unitCount = db.prepare('SELECT COUNT(*) as c FROM units').get().c
if (unitCount === 0) {
  const defaultUnits = ['piece','pair','set','gram','kg','meter','cm','ml','liter','roll','sheet','pack','box','dozen']
  const insertUnit = db.prepare('INSERT OR IGNORE INTO units (name) VALUES (?)')
  defaultUnits.forEach(u => insertUnit.run(u))
}

// ─────────────────────────────────────────────────────────────
//  MATERIALS — raw material inventory
// ─────────────────────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS materials (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    name            TEXT    NOT NULL,
    unit            TEXT    NOT NULL DEFAULT 'piece',
    avg_cost        REAL    DEFAULT 0,
    qty_in_stock    REAL    DEFAULT 0,
    opening_stock   REAL    DEFAULT 0,
    opening_cost    REAL    DEFAULT 0,
    reorder_level   REAL    DEFAULT 0,
    notes           TEXT,
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- Full cost history for average cost calculation
  CREATE TABLE IF NOT EXISTS material_cost_history (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    material_id INTEGER NOT NULL,
    source      TEXT    NOT NULL,  -- 'opening' | 'bill' | 'adjustment'
    source_id   INTEGER,           -- bill_id if source = 'bill'
    qty         REAL    NOT NULL,
    unit_cost   REAL    NOT NULL,
    total       REAL    NOT NULL,
    date        TEXT    DEFAULT (date('now')),
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (material_id) REFERENCES materials(id)
  );
`)

// ─────────────────────────────────────────────────────────────
//  PURCHASE BILLS
// ─────────────────────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS purchase_bills (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    bill_number TEXT    UNIQUE,
    supplier_id INTEGER,
    bill_date   TEXT    DEFAULT (date('now')),
    due_date    TEXT,
    notes       TEXT,
    bill_image  TEXT,
    subtotal    REAL    DEFAULT 0,
    total       REAL    DEFAULT 0,
    status      TEXT    DEFAULT 'unpaid',  -- unpaid | partial | paid
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id)
  );

  -- Line items on each bill
  CREATE TABLE IF NOT EXISTS purchase_bill_items (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    bill_id     INTEGER NOT NULL,
    material_id INTEGER NOT NULL,
    qty         REAL    NOT NULL,
    unit_cost   REAL    NOT NULL,
    total       REAL    NOT NULL,
    FOREIGN KEY (bill_id)     REFERENCES purchase_bills(id),
    FOREIGN KEY (material_id) REFERENCES materials(id)
  );

  -- Payments against a bill (supports partial payments)
  CREATE TABLE IF NOT EXISTS bill_payments (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    bill_id        INTEGER NOT NULL,
    amount         REAL    NOT NULL,
    payment_date   TEXT    DEFAULT (date('now')),
    payment_method TEXT    DEFAULT 'bank',  -- bank | cash
    bank_account   TEXT,                    -- 'BOC' | 'Peoples'
    notes          TEXT,
    created_at     DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (bill_id) REFERENCES purchase_bills(id)
  );
`)

// ─────────────────────────────────────────────────────────────
//  PRODUCT RECIPES — Bill of Materials
// ─────────────────────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS product_materials (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id  INTEGER NOT NULL,
    material_id INTEGER NOT NULL,
    qty_needed  REAL    NOT NULL,
    UNIQUE(product_id, material_id),
    FOREIGN KEY (product_id)  REFERENCES products(id),
    FOREIGN KEY (material_id) REFERENCES materials(id)
  );
`)

// ─────────────────────────────────────────────────────────────
//  ARCHIVE TABLES (existing — unchanged)
// ─────────────────────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS archive_products (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    original_id     INTEGER,
    data_json       TEXT    NOT NULL,
    deleted_by_email TEXT,
    deleted_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    reset_batch     TEXT
  );

  CREATE TABLE IF NOT EXISTS archive_orders (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    original_id     INTEGER,
    data_json       TEXT    NOT NULL,
    deleted_by_email TEXT,
    deleted_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    reset_batch     TEXT
  );

  CREATE TABLE IF NOT EXISTS archive_expenses (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    original_id     INTEGER,
    data_json       TEXT    NOT NULL,
    deleted_by_email TEXT,
    deleted_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    reset_batch     TEXT
  );

  CREATE TABLE IF NOT EXISTS archive_suppliers (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    original_id     INTEGER,
    data_json       TEXT    NOT NULL,
    deleted_by_email TEXT,
    deleted_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    reset_batch     TEXT
  );

  CREATE TABLE IF NOT EXISTS archive_cogs (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    original_id     INTEGER,
    data_json       TEXT    NOT NULL,
    deleted_by_email TEXT,
    deleted_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    reset_batch     TEXT
  );
`)

// ─────────────────────────────────────────────────────────────
//  MIGRATIONS — safe ALTER TABLE for existing deployments
// ─────────────────────────────────────────────────────────────
const migrations = [
  // products
  'ALTER TABLE products ADD COLUMN subcategory TEXT DEFAULT ""',
  'ALTER TABLE products ADD COLUMN sort_order INTEGER DEFAULT 0',
  'ALTER TABLE products ADD COLUMN group_order INTEGER DEFAULT 0',
  'ALTER TABLE products ADD COLUMN cost_price REAL DEFAULT 0',
  // orders
  'ALTER TABLE orders ADD COLUMN reference TEXT',
  'ALTER TABLE orders ADD COLUMN full_name TEXT',
  'ALTER TABLE orders ADD COLUMN nic TEXT',
  'ALTER TABLE orders ADD COLUMN phone1 TEXT',
  'ALTER TABLE orders ADD COLUMN phone2 TEXT',
  'ALTER TABLE orders ADD COLUMN address TEXT',
  'ALTER TABLE orders ADD COLUMN city TEXT',
  'ALTER TABLE orders ADD COLUMN slip_path TEXT',
  'ALTER TABLE orders ADD COLUMN bank_used TEXT',
  // users
  'ALTER TABLE users ADD COLUMN is_admin INTEGER DEFAULT 0',
  // suppliers — new fields
  'ALTER TABLE suppliers ADD COLUMN email TEXT',
  'ALTER TABLE suppliers ADD COLUMN address TEXT',
  'ALTER TABLE suppliers ADD COLUMN opening_balance REAL DEFAULT 0',
  'ALTER TABLE suppliers ADD COLUMN total_billed REAL DEFAULT 0',
  'ALTER TABLE suppliers ADD COLUMN notes TEXT',
]

migrations.forEach(sql => {
  try { db.exec(sql) } catch { /* already exists — safe to ignore */ }
})
// ─────────────────────────────────────────────────────────────
//  ADD THIS BLOCK to backend/db.js
//  Place it BEFORE the final: module.exports = db
// ─────────────────────────────────────────────────────────────

// order_cogs — auto-generated COGS entries per sale (accrual basis)
db.exec(`
  CREATE TABLE IF NOT EXISTS order_cogs (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id      INTEGER NOT NULL,
    product_id    INTEGER,
    product_name  TEXT,
    qty_sold      REAL    NOT NULL,
    material_id   INTEGER,
    material_name TEXT,
    unit          TEXT,
    qty_used      REAL    NOT NULL,
    unit_cost     REAL    NOT NULL,
    line_cost     REAL    NOT NULL,
    date          TEXT    DEFAULT (date('now')),
    created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(id)
  );
`)

// cogs_logged flag on orders — prevents double-logging
try { db.exec('ALTER TABLE orders ADD COLUMN cogs_logged INTEGER DEFAULT 0') } catch {}

module.exports = db

db.prepare('DELETE FROM audit_log').run()