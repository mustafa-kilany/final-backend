const mongoose = require('mongoose')

async function connectDb() {
  const mongoUri = process.env.MONGO_URI

  if (!mongoUri) {
    throw new Error('MONGO_URI is missing. Create a .env file (see .env.example).')
  }

  await mongoose.connect(mongoUri)
}

module.exports = connectDb
