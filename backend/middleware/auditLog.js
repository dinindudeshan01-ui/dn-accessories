const db = require('../db')

async function auditLog({ req, action, entity, entityId = null, description, oldValue = null, newValue = null }) {
  try {
    const adminId    = req?.admin?.id    || null
    const adminEmail = req?.admin?.email || 'system'
    const ip         = req?.ip || req?.connection?.remoteAddress || null

    await db.prepare(`
      INSERT INTO audit_log (admin_id, admin_email, action, entity, entity_id, description, old_value, new_value, ip_address)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      adminId,
      adminEmail,
      action,
      entity,
      entityId ? String(entityId) : null,
      description,
      oldValue  ? JSON.stringify(oldValue)  : null,
      newValue  ? JSON.stringify(newValue)  : null,
      ip
    )
  } catch (e) {
    console.error('Audit log failed:', e.message)
  }
}

module.exports = { auditLog }