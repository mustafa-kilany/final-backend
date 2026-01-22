const dotenv = require('dotenv')
const mongoose = require('mongoose')

dotenv.config()

const User = require('../models/User')

async function main() {
  const mongoUri = process.env.MONGO_URI
  if (!mongoUri) {
    throw new Error('MONGO_URI is missing. Set it in backend/.env')
  }

  await mongoose.connect(mongoUri)

  const result = await User.updateMany(
    { role: 'consumer' },
    { $set: { role: 'purchase' } }
  )

  const modified = result.modifiedCount ?? result.nModified ?? 0
  const matched = result.matchedCount ?? result.n ?? 0
  console.log(`Migrated users: matched=${matched} modified=${modified}`)

  await mongoose.disconnect()
}

main().catch((err) => {
  console.error(err)
  process.exitCode = 1
})
