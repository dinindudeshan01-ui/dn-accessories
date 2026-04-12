const db = require('../db')

/**
 * Log an admin action to the audit trail.
 *
 * @param {object} opts
 * @param {object} opts.req        - Express request (for admin identity)
 * @param {string} opts.action     - 'CREATE' | 'UPDATE' | 'DELETE' | 'RESET' | 'LOGIN'
 * @param {string} opts.entity     - 'product' | 'order' | 'expense' | 'supplier' | 'cogs' | 'theme' | 'system'
 * @param {string} opts.entityId   - ID of the record affected
 * @param {string} opts.description - Human-readable summary
 * @param {any}    opts.oldValue   - Previous state (object)
 * @param {any}    opts.newValue   - New state (object)
 */
function auditLog({ req, action, entity, entityId = null, description, oldValue = null, newValue = null }) {
  try {
    const adminId    = req?.admin?.id    || null
    const adminEmail = req?.admin?.email || 'system'
    const ip         = req?.ip || req?.connection?.remoteAddress || null

    db.prepare(`
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
    // Never let audit logging break the main request
    console.error('Audit log failed:', e.message)
  }
}

module.exports = { auditLog }