// backend/routes/adminStaff.js
// Staff management: invite, update role, deactivate, remove

const express   = require('express')
const router    = express.Router()
const bcrypt    = require('bcryptjs')
const db        = require('../db')
const adminAuth = require('../middleware/adminAuth')
const { requireRole } = require('../middleware/adminAuth')
const { auditLog }    = require('../middleware/auditLog')
const { ROLE_LIST }   = require('../lib/roles')
const { Resend }      = require('resend')

const resend = new Resend(process.env.RESEND_API_KEY)

// Only owners can manage staff
const ownerOnly = requireRole('*')

// ── Helpers ───────────────────────────────────────────────────

function capitalise(str) {
  return str.charAt(0).toUpperCase() + str.slice(1)
}

async function sendInviteEmail({ name, email, role, password }) {
  const loginUrl = `${process.env.FRONTEND_URL}/admin/login`

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>You've been invited</title>
  <style>
    body { margin: 0; padding: 0; background: #f4f4f7; font-family: Arial, sans-serif; }
    .wrapper { padding: 40px 20px; }
    .card {
      max-width: 520px;
      margin: 0 auto;
      background: #ffffff;
      border-radius: 10px;
      overflow: hidden;
      box-shadow: 0 2px 12px rgba(0,0,0,0.08);
    }
    .header {
      background: #0d0d0d;
      padding: 32px 40px;
      text-align: center;
    }
    .header h1 {
      margin: 0;
      color: #00d4ff;
      font-size: 22px;
      letter-spacing: 2px;
      text-transform: uppercase;
    }
    .header p {
      margin: 6px 0 0;
      color: #888;
      font-size: 12px;
      letter-spacing: 1px;
      text-transform: uppercase;
    }
    .body { padding: 36px 40px; }
    .body p { margin: 0 0 16px; color: #444; font-size: 15px; line-height: 1.6; }
    .credentials {
      background: #f8f9fb;
      border: 1px solid #e8e8e8;
      border-radius: 8px;
      padding: 20px 24px;
      margin: 24px 0;
    }
    .credentials p { margin: 0 0 10px; font-size: 14px; color: #555; }
    .credentials p:last-child { margin: 0; }
    .credentials strong { color: #111; font-size: 15px; }
    .badge {
      display: inline-block;
      background: #00d4ff18;
      color: #00a8cc;
      border: 1px solid #00d4ff44;
      border-radius: 4px;
      padding: 2px 10px;
      font-size: 13px;
      font-weight: bold;
      letter-spacing: 0.5px;
      text-transform: uppercase;
    }
    .btn-wrap { text-align: center; margin: 28px 0 8px; }
    .btn {
      display: inline-block;
      background: #00d4ff;
      color: #000000 !important;
      text-decoration: none;
      padding: 13px 32px;
      border-radius: 6px;
      font-weight: bold;
      font-size: 14px;
      letter-spacing: 0.5px;
    }
    .warning {
      background: #fff8e6;
      border-left: 3px solid #f5a623;
      padding: 12px 16px;
      border-radius: 0 6px 6px 0;
      margin-top: 24px;
    }
    .warning p { margin: 0; font-size: 13px; color: #7a5c00; }
    .footer {
      background: #f8f9fb;
      border-top: 1px solid #eee;
      padding: 20px 40px;
      text-align: center;
    }
    .footer p { margin: 0; font-size: 12px; color: #aaa; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="card">
      <div class="header">
        <h1>D&amp;N Accessories</h1>
        <p>Admin Panel Invitation</p>
      </div>
      <div class="body">
        <p>Hi <strong>${name}</strong>,</p>
        <p>
          You've been added to the <strong>D&amp;N Accessories Admin Panel</strong>
          with the role <span class="badge">${capitalise(role)}</span>.
          Use the credentials below to log in.
        </p>

        <div class="credentials">
          <p>📧 <strong>Email</strong><br/>${email}</p>
          <p>🔑 <strong>Temporary Password</strong><br/><strong>${password}</strong></p>
        </div>

        <div class="btn-wrap">
          <a href="${loginUrl}" class="btn">Go to Admin Panel →</a>
        </div>

        <div class="warning">
          <p>⚠️ <strong>Please change your password</strong> after your first login. Do not share these credentials with anyone.</p>
        </div>
      </div>
      <div class="footer">
        <p>This invite was sent by the D&amp;N Admin team · If you didn't expect this, please ignore it.</p>
      </div>
    </div>
  </div>
</body>
</html>
  `.trim()

  await resend.emails.send({
    from: 'D&N Admin <onboarding@resend.dev>',
    to:   email,
    subject: `You've been invited to D&N Admin Panel`,
    html,
  })
}

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

    // Send invite email — non-blocking: account is created regardless
    sendInviteEmail({ name, email, role, password }).catch(err => {
      console.error(`[invite-email] Failed to send to ${email}:`, err.message)
    })

    res.json({ ...staff, invite_email_sent: true })
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