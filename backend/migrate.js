// Run this ONCE to migrate your orders table:
// node backend/migrate.js

const Database = require('better-sqlite3')
const path = require('path')
const db = new Database(path.join(__dirname, 'shop.db'))

const migrations = [
  "ALTER TABLE orders ADD COLUMN reference TEXT",
  "ALTER TABLE orders ADD COLUMN full_name TEXT",
  "ALTER TABLE orders ADD COLUMN nic TEXT",
  "ALTER TABLE orders ADD COLUMN phone1 TEXT",
  "ALTER TABLE orders ADD COLUMN phone2 TEXT",
  "ALTER TABLE orders ADD COLUMN address TEXT",
  "ALTER TABLE orders ADD COLUMN city TEXT",
  "ALTER TABLE orders ADD COLUMN slip_path TEXT",
]

migrations.forEach(sql => {
  try {
    db.exec(sql)
    console.log('OK:', sql)
  } catch (e) {
    console.log('Skip (already exists):', sql.split('ADD COLUMN')[1]?.trim())
  }
})

console.log('\nMigration complete.')