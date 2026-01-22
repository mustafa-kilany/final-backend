const dotenv = require('dotenv')
const bcrypt = require('bcryptjs')

const connectDb = require('../config/db')
const User = require('../models/User')

dotenv.config()

async function seedAdmin() {
  const email = process.env.SEED_ADMIN_EMAIL
  const password = process.env.SEED_ADMIN_PASSWORD
  const name = process.env.SEED_ADMIN_NAME || 'Admin'

  if (!email) throw new Error('SEED_ADMIN_EMAIL is required')
  if (!password) throw new Error('SEED_ADMIN_PASSWORD is required')

  await connectDb()

  const existing = await User.findOne({ email })
  if (existing) {
    // eslint-disable-next-line no-console
    console.log('Admin already exists:', existing.email)
    return
  }

  const passwordHash = await bcrypt.hash(password, 10)
  const user = await User.create({
    name,
    email,
    passwordHash,
    role: 'admin',
  })

  // eslint-disable-next-line no-console
  console.log('Seeded admin:', user.email)
}

seedAdmin()
  .then(() => process.exit(0))
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error('Seed admin failed:', err)
    process.exit(1)
  })
