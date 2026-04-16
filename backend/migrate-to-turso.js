require('dotenv').config({ path: './.env' })
const Database = require('better-sqlite3')
const { createClient } = require('@libsql/client')

const LOCAL_DB = 'C:\\Users\\ASUS\\my-shop\\backend\\shop.db'

const turso = createClient({
  url:       process.env.TURSO_URL,
  authToken: process.env.TURSO_TOKEN,
})

const local = new Database(LOCAL_DB, { readonly: true })

const TABLES = [
  'admins',
  'users',
  'suppliers',
  'units',
  'materials',
  'material_cost_history',
  'products',
  'product_materials',
  'purchase_bills',
  'purchase_bill_items',
  'bill_payments',
  'orders',
  'order_cogs',
  'expenses',
  'cogs_entries',
  'theme_settings',
  'audit_log',
  'archive_products',
  'archive_orders',
  'archive_expenses',
  'archive_suppliers',
  'archive_cogs',
]

function escapeVal(v) {
  if (v === null || v === undefined) return 'NULL'
  if (typeof v === 'number') return v
  return `'${String(v).replace(/'/g, "''")}'`
}

async function migrateTable(tableName) {
  let rows
  try {
    rows = local.prepare(`SELECT * FROM ${tableName}`).all()
  } catch (e) {
    console.log(`  Skip ${tableName} — not found`)
    return 0
  }
  if (!rows.length) {
    console.log(`  Empty ${tableName} — skipping`)
    return 0
  }
  try { await turso.execute(`DELETE FROM ${tableName}`) } catch {}
  let count = 0
  for (const row of rows) {
    const cols = Object.keys(row).join(', ')
    const vals = Object.values(row).map(escapeVal).join(', ')
    try {
      await turso.execute(`INSERT OR IGNORE INTO ${tableName} (${cols}) VALUES (${vals})`)
      count++
    } catch (e) {
      console.log(`  Row failed in ${tableName}: ${e.message}`)
    }
  }
  return count
}

async function run() {
  console.log('\n Starting migration\n')
  if (!process.env.TURSO_URL || !process.env.TURSO_TOKEN) {
    console.error('Missing TURSO_URL or TURSO_TOKEN')
    process.exit(1)
  }
  try {
    await turso.execute('SELECT 1')
    console.log('Turso OK\n')
  } catch (e) {
    console.error('Cannot connect to Turso:', e.message)
    process.exit(1)
  }
  let total = 0
  for (const table of TABLES) {
    process.stdout.write(`  ${table}...`)
    const count = await migrateTable(table)
    console.log(` ${count} rows`)
    total += count
  }
  console.log(`\nDone! ${total} rows pushed to Turso.\n`)
  process.exit(0)
}

run().catch(e => {
  console.error('Migration failed:', e)
  process.exit(1)
})
