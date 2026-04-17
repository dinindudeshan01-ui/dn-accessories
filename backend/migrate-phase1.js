// migrate-phase1.js
// Run once: node migrate-phase1.js
// Adds voided columns to bill_payments for payment reversal feature (Phase 1 Item 5)

require('dotenv').config()
const { createClient } = require('@libsql/client')

const client = createClient({
  url:       process.env.TURSO_URL,
  authToken: process.env.TURSO_TOKEN,
})

async function migrate() {
  console.log('Running Phase 1 migration...')

  const migrations = [
    // Add voided flag (0 = active, 1 = voided)
    `ALTER TABLE bill_payments ADD COLUMN voided INTEGER DEFAULT 0`,
    // Add void reason text
    `ALTER TABLE bill_payments ADD COLUMN void_reason TEXT`,
    // Timestamp of when it was voided
    `ALTER TABLE bill_payments ADD COLUMN voided_at DATETIME`,
    // Who voided it
    `ALTER TABLE bill_payments ADD COLUMN voided_by TEXT`,
  ]

  for (const sql of migrations) {
    try {
      await client.execute(sql)
      console.log('✅', sql.slice(0, 60))
    } catch (e) {
      // "duplicate column" means it already exists — safe to ignore
      if (e.message.includes('duplicate column') || e.message.includes('already exists')) {
        console.log('⏭  Already exists, skipping:', sql.slice(0, 60))
      } else {
        console.error('❌ Failed:', sql)
        console.error(e.message)
        process.exit(1)
      }
    }
  }

  console.log('\n✅ Phase 1 migration complete.')
  process.exit(0)
}

migrate()