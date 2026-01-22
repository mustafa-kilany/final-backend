const mongoose = require('mongoose')

async function connectDb() {
  const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI || process.env.MONGO_URL

  if (!mongoUri) {
    throw new Error('MongoDB connection string missing. Set MONGO_URI (or MONGODB_URI / MONGO_URL).')
  }

  await mongoose.connect(mongoUri)
}

module.exports = connectDb
