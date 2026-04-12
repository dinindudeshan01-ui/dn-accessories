const jwt = require('jsonwebtoken')

module.exports = function adminAuth(req, res, next) {
  const auth = req.headers.authorization
  if (!auth || !auth.startsWith('Bearer '))
    return res.status(401).json({ error: 'No token' })
  try {
    const decoded = jwt.verify(auth.slice(7), process.env.JWT_SECRET)
    if (!decoded.isAdmin)
      return res.status(403).json({ error: 'Admin access only' })
    req.admin = decoded
    next()
  } catch {
    res.status(401).json({ error: 'Invalid token' })
  }
}