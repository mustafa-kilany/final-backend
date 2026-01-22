const express = require('express')
const cors = require('cors')
const dotenv = require('dotenv')

const itemRoutes = require('./routes/itemRoutes')
const authRoutes = require('./routes/authRoutes')
const adminRoutes = require('./routes/adminRoutes')
const requestRoutes = require('./routes/requestRoutes')
const userRoutes = require('./routes/userRoutes')
const importRoutes = require('./routes/importRoutes')
const deviceRoutes = require('./routes/deviceRoutes')
const notFound = require('./middleware/notFound')
const errorHandler = require('./middleware/errorHandler')
const dbRequestLogger = require('./middleware/dbRequestLogger')

dotenv.config()

const app = express()

app.use(express.json())

const corsOrigin = process.env.CORS_ORIGIN || 'http://localhost:5173'
app.use(
  cors({
    origin: corsOrigin,
    credentials: true,
  })
)

app.get('/', (req, res) => {
  res.json({ message: 'InventoryGo API' })
})
app.use(dbRequestLogger)

app.use('/api/auth', authRoutes)
app.use('/api/admin', adminRoutes)
app.use('/api/users', userRoutes)
app.use('/api/items', itemRoutes)
app.use('/api/requests', requestRoutes)
app.use('/api/import', importRoutes)
app.use('/api/devices', deviceRoutes)

app.use(notFound)
app.use(errorHandler)

module.exports = app
