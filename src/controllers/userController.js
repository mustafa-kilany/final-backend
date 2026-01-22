const bcrypt = require('bcryptjs')
const User = require('../models/User')

async function listUsers(req, res, next) {
  try {
    req._dbTouched = true
    const users = await User.find({}).sort({ createdAt: -1 }).select('-passwordHash')
    res.json(users)
  } catch (err) {
    next(err)
  }
}

async function createUser(req, res, next) {
  try {
    const { name, email, password, role } = req.body

    const normalizedEmail = String(email || '').trim().toLowerCase()

    if (!normalizedEmail) {
      res.status(400)
      throw new Error('email is required')
    }

    if (!password) {
      res.status(400)
      throw new Error('password is required')
    }

    let userRole = 'purchase'
    if (role === 'admin' || role === 'purchase') {
      userRole = role
    }
    if (role === 'consumer') {
      userRole = 'purchase'
    }

    req._dbTouched = true

    const existing = await User.findOne({ email: normalizedEmail })
    if (existing) {
      res.status(409)
      throw new Error('email already exists')
    }

    const passwordHash = await bcrypt.hash(password, 10)

    const user = await User.create({
      name: name || '',
      email: normalizedEmail,
      passwordHash,
      role: userRole,
    })

    res.status(201).json({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
    })
  } catch (err) {
    next(err)
  }
}

module.exports = {
  listUsers,
  createUser,
}
