const User = require('../models/User')

function toSafeRole(role) {
  return role === 'consumer' ? 'purchase' : role
}

async function requireAuth(req, res, next) {
  try {
   
    const headerUserId = String(req.header('x-user-id') || '').trim()
    const headerUserEmail = String(req.header('x-user-email') || '').trim().toLowerCase()

    let user = null

    if (headerUserId) {
      user = await User.findById(headerUserId)
    } else if (headerUserEmail) {
      user = await User.findOne({ email: headerUserEmail })
    } else {
      // Dev-friendly fallback: use first admin user, else first user.
      user = (await User.findOne({ role: 'admin' })) || (await User.findOne({}))
    }

    if (!user) {
      res.status(401)
      return next(new Error('Not authenticated'))
    }

    req.user = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: toSafeRole(user.role),
    }

    return next()
  } catch (err) {
    return next(err)
  }
}

module.exports = requireAuth
