const bcrypt = require('bcryptjs')
const User = require('../models/User')

async function adminSignup(req, res, next) {
  try {
    const { name, email, password, adminSignupToken } = req.body

    const serverToken = process.env.ADMIN_SIGNUP_TOKEN
    if (!serverToken) {
      throw new Error('missing from env')
    }

    if (!adminSignupToken || adminSignupToken !== serverToken) {
      res.status(403)
      throw new Error('wrong token')
    }

    const normalizedEmail = String(email || '').trim().toLowerCase()

    if (!normalizedEmail) {
      res.status(400)
      throw new Error('email is required')
    }

    if (!password) {
      res.status(400)
      throw new Error('password is required')
    }

    const existing = await User.findOne({ email: normalizedEmail })
    if (existing) {
      res.status(409)
      throw new Error('email already exists')
    }

    const passwordHash = await bcrypt.hash(password, 10)

    const user = await User.create({
      name: name || 'Admin',
      email: normalizedEmail,
      passwordHash,
      role: 'admin',
    })

    res.status(201).json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      auth: {
        mode: 'header',
        headerName: 'x-user-id',
        headerValue: user.id,
      },
    })
  } catch (err) {
    next(err)
  }
}

async function login(req, res, next) {
  try {
    const { email, password } = req.body

    const normalizedEmail = String(email || '').trim().toLowerCase()

    if (!normalizedEmail) {
      res.status(400)
      throw new Error('email is required')
    }

    if (!password) {
      res.status(400)
      throw new Error('password is required')
    }

    const user = await User.findOne({ email: normalizedEmail })
    if (!user) {
      res.status(401)
      throw new Error('invalid credentials')
    }

    const ok = await bcrypt.compare(password, user.passwordHash)
    if (!ok) {
      res.status(401)
      throw new Error('invalid credentials')
    }

    res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      auth: {
        mode: 'header',
        headerName: 'x-user-id',
        headerValue: user.id,
      },
    })
  } catch (err) {
    next(err)
  }
}

async function me(req, res) {
  res.json({ user: req.user })
}

module.exports = {
  adminSignup,
  login,
  me,
}
