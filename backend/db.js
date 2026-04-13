const Database = require('better-sqlite3')
const path = require('path')

const db = new Database(path.join(__dirname, 'shop.db'))

db.exec(`
  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    price REAL NOT NULL,
    description TEXT,
    image_url TEXT,
    category TEXT,
    stock INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name TEXT,
    is_admin INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    total REAL NOT NULL,
    status TEXT DEFAULT 'pending',
    items_json TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS expenses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    description TEXT NOT NULL,
    category TEXT NOT NULL,
    amount REAL NOT NULL,
    date TEXT DEFAULT (date('now')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS suppliers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    category TEXT,
    contact TEXT,
    lead_days INTEGER DEFAULT 3,
    total_paid REAL DEFAULT 0,
    status TEXT DEFAULT 'active',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS cogs_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    supplier_id INTEGER,
    item_name TEXT NOT NULL,
    quantity REAL NOT NULL,
    unit TEXT DEFAULT 'units',
    unit_cost REAL NOT NULL,
    total REAL NOT NULL,
    date TEXT DEFAULT (date('now')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id)
  );

  CREATE TABLE IF NOT EXISTS theme_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS audit_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    admin_id INTEGER,
    admin_email TEXT,
    action TEXT NOT NULL,
    entity TEXT NOT NULL,
    entity_id TEXT,
    description TEXT,
    old_value TEXT,
    new_value TEXT,
    ip_address TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS admins (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

  CREATE TABLE IF NOT EXISTS archive_products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    original_id INTEGER,
    data_json TEXT NOT NULL,
    deleted_by_email TEXT,
    deleted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    reset_batch TEXT
  );

  CREATE TABLE IF NOT EXISTS archive_orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    original_id INTEGER,
    data_json TEXT NOT NULL,
    deleted_by_email TEXT,
    deleted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    reset_batch TEXT
  );

  CREATE TABLE IF NOT EXISTS archive_expenses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    original_id INTEGER,
    data_json TEXT NOT NULL,
    deleted_by_email TEXT,
    deleted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    reset_batch TEXT
  );

  CREATE TABLE IF NOT EXISTS archive_suppliers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    original_id INTEGER,
    data_json TEXT NOT NULL,
    deleted_by_email TEXT,
    deleted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    reset_batch TEXT
  );

  CREATE TABLE IF NOT EXISTS archive_cogs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    original_id INTEGER,
    data_json TEXT NOT NULL,
    deleted_by_email TEXT,
    deleted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    reset_batch TEXT
  );
`)

const migrations = [
  'ALTER TABLE users ADD COLUMN is_admin INTEGER DEFAULT 0',
]
migrations.forEach(sql => {
  try { db.exec(sql) } catch { /* already exists */ }
})

module.exports = db