// backend/middleware/adminAuth.js
// UPDATED — now includes requireRole() for per-route permission checks

const jwt = require('jsonwebtoken')
const { canAccess } = require('../lib/roles')

// ── Base auth — validates JWT and attaches req.admin ─────────
function adminAuth(req, res, next) {
  const auth = req.headers.authorization
  if (!auth || !auth.startsWith('Bearer '))
    return res.status(401).json({ error: 'No token' })
  try {
    const decoded = jwt.verify(auth.slice(7), process.env.JWT_SECRET)
    if (!decoded.isAdmin)
      return res.status(403).json({ error: 'Admin access only' })
    if (decoded.is_active === false)
      return res.status(403).json({ error: 'Account deactivated' })
    req.admin = decoded
    next()
  } catch {
    res.status(401).json({ error: 'Invalid token' })
  }
}

// ── Role-gated auth — use this on sensitive routes ────────────
// Usage: router.delete('/:id', requireRole('finance'), handler)
// Pass '*' to restrict to owner only
function requireRole(resource) {
  return [
    adminAuth,
    (req, res, next) => {
      if (!canAccess(req.admin.role, resource)) {
        return res.status(403).json({
          error: `Your role (${req.admin.role}) does not have access to this.`
        })
      }
      next()
    }
  ]
}

module.exports = adminAuth
module.exports.requireRole = requireRole