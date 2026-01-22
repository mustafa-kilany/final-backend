const axios = require('axios')
const Item = require('../models/Item')

function escapeOpenFdaTerm(term) {
  return String(term || '')
    .trim()
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
}

function buildOpenFdaDeviceSearch({ term, productCode }) {
  const parts = []

  const safeTerm = escapeOpenFdaTerm(term)
  if (safeTerm) {
    parts.push(
      `brand_name:"${safeTerm}" OR company_name:"${safeTerm}" OR catalog_number:"${safeTerm}" OR version_or_model_number:"${safeTerm}" OR device_description:"${safeTerm}" OR product_codes.name:"${safeTerm}" OR product_codes.code:"${safeTerm}" OR product_codes.openfda.device_name:"${safeTerm}"`
    )
  }

  const safeProductCode = String(productCode || '').trim()
  if (safeProductCode) {
    parts.push(`product_codes.code:${safeProductCode}`)
  }

  if (parts.length === 0) return 'record_status:Published'
  return parts.length === 1 ? parts[0] : `(${parts.join(') AND (')})`
}

function pickFirstNonEmpty(values) {
  for (const v of values) {
    const s = String(v ?? '').trim()
    if (s) return s
  }
  return ''
}

function mapOpenFdaResultToItem(result) {
  const recordKey = result?.public_device_record_key ?? result?.record_key ?? null

  const name = pickFirstNonEmpty([
    result?.device_description,
    result?.brand_name,
    result?.catalog_number,
    result?.version_or_model_number,
    recordKey,
  ])

  const manufacturer = pickFirstNonEmpty([result?.company_name]) || '—'

  const category = pickFirstNonEmpty([
    Array.isArray(result?.product_codes) ? result.product_codes?.[0]?.openfda?.medical_specialty_description : null,
    Array.isArray(result?.product_codes) ? result.product_codes?.[0]?.openfda?.device_class : null,
  ]) || 'Medical Device'

  return {
    openfdaRecordKey: recordKey,
    name,
    category,
    manufacturer,
    unit: 'pcs',
    qty: 0,
    reorderLevel: 10,
    source: 'openfda',
    lastSyncedAt: new Date(),
  }
}

async function seedOpenFdaInventory({
  term = '',
  productCode = '',
  limit = 25,
  purgeNonFda = true,
  always = false,
} = {}) {
  const existingCount = await Item.countDocuments({ source: 'openfda' })
  if (!always && existingCount > 0) return { seeded: false, reason: 'already-seeded', existingCount }

  const safeLimit = Math.min(Math.max(Number(limit) || 25, 1), 100)

  async function fetchResults(search) {
    const resp = await axios.get('https://api.fda.gov/device/udi.json', {
      params: { search, limit: safeLimit, skip: 0 },
      timeout: 20000,
    })

    const results = resp.data?.results
    if (!Array.isArray(results)) {
      throw new Error('openFDA returned unexpected data')
    }

    return results
  }

  const primarySearch = buildOpenFdaDeviceSearch({ term, productCode })

  let results
  try {
    results = await fetchResults(primarySearch)
  } catch (err) {
    if (err?.response?.status === 404) {
      results = []
    } else {
      throw err
    }
  }

  let items = results.map(mapOpenFdaResultToItem).filter((i) => i.openfdaRecordKey && i.name)

  // If a narrow term/productCode yields nothing, fall back to a broad published query so the app starts with data.
  let searchUsed = primarySearch
  if (items.length === 0 && (String(term || '').trim() || String(productCode || '').trim())) {
    const fallbackSearch = 'record_status:Published'
    try {
      const fallbackResults = await fetchResults(fallbackSearch)
      const fallbackItems = fallbackResults.map(mapOpenFdaResultToItem).filter((i) => i.openfdaRecordKey && i.name)
      if (fallbackItems.length > 0) {
        items = fallbackItems
        searchUsed = fallbackSearch
      }
    } catch {
      // Ignore fallback failure; keep items as empty.
    }
  }

  if (items.length === 0) {
    return { seeded: false, reason: 'no-results', search: searchUsed }
  }

  // Only purge after we've successfully fetched some items.
  if (purgeNonFda) {
    await Item.deleteMany({
      $or: [
        { source: { $ne: 'openfda' } },
        { openfdaRecordKey: { $exists: false } },
        { openfdaRecordKey: null },
      ],
    })
  }

  const ops = items.map((i) => ({
    updateOne: {
      filter: { openfdaRecordKey: i.openfdaRecordKey },
      update: { $set: i },
      upsert: true,
    },
  }))

  const bulk = ops.length ? await Item.bulkWrite(ops, { ordered: false }) : null

  return {
    seeded: true,
    search: searchUsed,
    imported: items.length,
    upserted: bulk?.upsertedCount ?? 0,
    matched: bulk?.matchedCount ?? 0,
    modified: bulk?.modifiedCount ?? 0,
  }
}

module.exports = { seedOpenFdaInventory }
