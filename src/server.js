const app = require('./app')
const connectDb = require('./config/db')
const { seedOpenFdaInventory } = require('./utils/seedOpenFdaInventory')

const PORT = process.env.PORT || 5000

async function start() {
  await connectDb()

  try {
    // Default seed uses a broad openFDA query (record_status:Published).
    // Set FDA_SEED_TERM to narrow the dataset.
    const term = process.env.FDA_SEED_TERM || ''
    const productCode = process.env.FDA_SEED_PRODUCT_CODE || ''
    const limit = process.env.FDA_SEED_LIMIT ? Number(process.env.FDA_SEED_LIMIT) : 25
    const always = String(process.env.FDA_SEED_ALWAYS || '').trim().toLowerCase() === 'true'
    const purgeNonFda = String(process.env.FDA_PURGE_NON_FDA || 'true').trim().toLowerCase() !== 'false'

    const result = await seedOpenFdaInventory({ term, productCode, limit, always, purgeNonFda })
    // eslint-disable-next-line no-console
    console.log('openFDA seed:', result)
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('openFDA seed skipped/failed:', err?.message || err)
  }

  app.listen(PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`API running on http://localhost:${PORT}`)
  })
}

start().catch((error) => {
  // eslint-disable-next-line no-console
  console.error('Failed to start server:', error)
  process.exit(1)
})
