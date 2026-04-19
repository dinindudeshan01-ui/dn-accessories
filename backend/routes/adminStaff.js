// backend/routes/adminStaff.js
// NEW FILE — Staff management: invite, update role, deactivate, remove

const express   = require('express')
const router    = express.Router()
const bcrypt    = require('bcryptjs')
const db        = require('../db')
const adminAuth = require('../middleware/adminAuth')
const { requireRole } = require('../middleware/adminAuth')
const { auditLog }    = require('../middleware/auditLog')
const { ROLE_LIST }   = require('../lib/roles')

// Only owners can manage staff (pass '*' = owner only)
const ownerOnly = requireRole('*')

// ── GET all staff ─────────────────────────────────────────────
router.get('/', adminAuth, async (req, res) => {
  try {
    const staff = await db.prepare(
      `SELECT id, email, name, role, is_active, created_at
       FROM admins
       ORDER BY
         CASE role WHEN 'owner' THEN 0 ELSE 1 END,
         created_at ASC`
    ).all()
    res.json(staff)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ── POST invite new staff member ──────────────────────────────
router.post('/', ownerOnly, async (req, res) => {
  try {
    const { email, name, role, password } = req.body

    if (!email || !name || !role || !password)
      return res.status(400).json({ error: 'All fields are required' })

    if (!ROLE_LIST.includes(role))
      return res.status(400).json({ error: 'Invalid role' })

    if (role === 'owner')
      return res.status(403).json({ error: 'Cannot create another owner account' })

    const hash = bcrypt.hashSync(password, 10)

    const result = await db.prepare(
      `INSERT INTO admins (email, password_hash, name, role, is_active, invited_by)
       VALUES (?, ?, ?, ?, 1, ?)`
    ).run(email, hash, name, role, req.admin.id)

    const staff = await db.prepare(
      `SELECT id, email, name, role, is_active FROM admins WHERE id = ?`
    ).get(result.lastInsertRowid)

    await auditLog({
      req,
      action:      'CREATE',
      entity:      'staff',
      entityId:    staff.id,
      description: `Invited ${name} (${email}) as ${role}`,
      newValue:    staff,
    })

    res.json(staff)
  } catch (e) {
    if (e.message?.includes('UNIQUE'))
      return res.status(400).json({ error: 'A staff member with that email already exists' })
    res.status(500).json({ error: e.message })
  }
})

// ── PATCH update role, name, or active status ─────────────────
router.patch('/:id', ownerOnly, async (req, res) => {
  try {
    const existing = await db.prepare('SELECT * FROM admins WHERE id = ?').get(req.params.id)
    if (!existing) return res.status(404).json({ error: 'Staff member not found' })
    if (existing.role === 'owner') return res.status(403).json({ error: 'Cannot modify the owner account' })

    const { role, is_active, name } = req.body

    if (role !== undefined && !ROLE_LIST.includes(role))
      return res.status(400).json({ error: 'Invalid role' })
    if (role === 'owner')
      return res.status(403).json({ error: 'Cannot assign owner role' })

    await db.prepare(
      `UPDATE admins
       SET
         role      = COALESCE(?, role),
         is_active = COALESCE(?, is_active),
         name      = COALESCE(?, name)
       WHERE id = ?`
    ).run(
      role      !== undefined ? role      : null,
      is_active !== undefined ? is_active : null,
      name      !== undefined ? name      : null,
      req.params.id
    )

    const updated = await db.prepare(
      `SELECT id, email, name, role, is_active FROM admins WHERE id = ?`
    ).get(req.params.id)

    await auditLog({
      req,
      action:      'UPDATE',
      entity:      'staff',
      entityId:    req.params.id,
      description: `Updated ${updated.name} — role: ${updated.role}, active: ${updated.is_active}`,
      oldValue:    existing,
      newValue:    updated,
    })

    res.json(updated)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ── DELETE remove a staff member ──────────────────────────────
router.delete('/:id', ownerOnly, async (req, res) => {
  try {
    const existing = await db.prepare('SELECT * FROM admins WHERE id = ?').get(req.params.id)
    if (!existing) return res.status(404).json({ error: 'Staff member not found' })
    if (existing.role === 'owner') return res.status(403).json({ error: 'Cannot delete the owner account' })
    if (existing.id === req.admin.id) return res.status(403).json({ error: 'Cannot delete your own account' })

    await db.prepare('DELETE FROM admins WHERE id = ?').run(req.params.id)

    await auditLog({
      req,
      action:      'DELETE',
      entity:      'staff',
      entityId:    req.params.id,
      description: `Removed staff member ${existing.name} (${existing.email})`,
      oldValue:    existing,
    })

    res.json({ success: true })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

module.exports = router