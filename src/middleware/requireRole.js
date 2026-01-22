function requireRole(...allowedRoles) {
  return function roleMiddleware(req, res, next) {
    if (!req.user) {
      res.status(401)
      return next(new Error('Not authenticated'))
    }

    const userRole = req.user.role
    if (!allowedRoles.includes(userRole)) {
      res.status(403)
      return next(new Error('Forbidden'))
    }

    return next()
  }
}

module.exports = requireRole
