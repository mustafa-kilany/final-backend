const app = require('./app')
const connectDb = require('./config/db')
const { seedOpenFdaInventory } = require('./utils/seedOpenFdaInventory')

const PORT = process.env.PORT || 5000

async function start() {
  await connectDb()

  try {
    const term = process.env.FDA_SEED_TERM || ''
    const productCode = process.env.FDA_SEED_PRODUCT_CODE || ''
    const limit = process.env.FDA_SEED_LIMIT ? Number(process.env.FDA_SEED_LIMIT) : 25
    const always = String(process.env.FDA_SEED_ALWAYS || '').trim().toLowerCase() === 'true'
    const purgeNonFda = String(process.env.FDA_PURGE_NON_FDA || 'true').trim().toLowerCase() !== 'false'

    const result = await seedOpenFdaInventory({ term, productCode, limit, always, purgeNonFda })
    console.log('openFDA seed:', result)
  } catch (err) {
    console.warn('openFDA seed skipped/failed:', err?.message || err)
  }

  app.listen(PORT, () => {
    console.log(`API running on http://localhost:${PORT}`)
  })
}

start().catch((error) => {
  console.error('Failed to start server:', error)
  process.exit(1)
})
