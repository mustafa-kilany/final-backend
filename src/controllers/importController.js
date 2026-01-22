const axios = require('axios')
const Item = require('../models/Item')
const MedicalDevice = require('../models/MedicalDevice')

function toInt(value, fallback = 0) {
  if (typeof value === 'number' && Number.isFinite(value)) return Math.trunc(value)
  const n = Number(value)
  if (Number.isFinite(n)) return Math.trunc(n)
  return fallback
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

  // Category is best-effort; openFDA UDI is not a stock catalog.
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

async function importOpenFdaItemsToDb(req, res, next) {
  try {
    const limit = Math.min(Math.max(toInt(req.query.limit, 25), 1), 100)
    const skip = Math.max(toInt(req.query.skip, 0), 0)
    const term = String(req.query.term ?? req.query.q ?? '').trim()
    const productCode = String(req.query.productCode ?? '').trim()
    const mode = String(req.query.mode ?? 'upsert').trim().toLowerCase()

    if (!term && !productCode) {
      res.status(400)
      throw new Error('term or productCode is required')
    }

    if (mode !== 'upsert' && mode !== 'replace') {
      res.status(400)
      throw new Error("mode must be 'upsert' or 'replace'")
    }

    const search = buildOpenFdaDeviceSearch({ term, productCode })

    let response
    try {
      response = await axios.get('https://api.fda.gov/device/udi.json', {
        params: {
          search,
          limit,
          skip,
        },
        timeout: 20000,
      })
    } catch (err) {
      if (err?.response?.status === 404) {
        return res.json({
          source: 'openfda',
          mode,
          search,
          term,
          productCode,
          imported: 0,
          upserted: 0,
          matched: 0,
          modified: 0,
          result: [],
        })
      }
      throw err
    }

    const results = response.data?.results
    if (!Array.isArray(results)) {
      res.status(502)
      throw new Error('openFDA returned unexpected data')
    }

    if (mode === 'replace') {
      req._dbTouched = true
      await Item.deleteMany({ source: 'openfda' })
    }

    const items = results
      .map(mapOpenFdaResultToItem)
      .filter((i) => i.openfdaRecordKey && i.name)

    const ops = items.map((i) => ({
      updateOne: {
        filter: { openfdaRecordKey: i.openfdaRecordKey },
        update: { $set: i },
        upsert: true,
      },
    }))

    req._dbTouched = true
    const bulkResult = ops.length > 0 ? await Item.bulkWrite(ops, { ordered: false }) : null

    res.json({
      source: 'openfda',
      mode,
      search,
      term,
      productCode,
      imported: items.length,
      upserted: bulkResult?.upsertedCount ?? 0,
      matched: bulkResult?.matchedCount ?? 0,
      modified: bulkResult?.modifiedCount ?? 0,
      result: items,
    })
  } catch (err) {
    next(err)
  }
}

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

  if (parts.length === 0) {
    return 'record_status:Published'
  }

  return parts.length === 1 ? parts[0] : `(${parts.join(') AND (')})`
}

function uniqStrings(values) {
  return Array.from(new Set(values.filter(Boolean)))
}

function mapOpenFdaDeviceResult(result, { includeProductCodes } = {}) {
  const rawProductCodes = Array.isArray(result?.product_codes) ? result.product_codes : []

  const deviceNames = uniqStrings(rawProductCodes.map((pc) => pc?.openfda?.device_name))
  const deviceClasses = uniqStrings(rawProductCodes.map((pc) => pc?.openfda?.device_class))
  const regulationNumbers = uniqStrings(rawProductCodes.map((pc) => pc?.openfda?.regulation_number))
  const medicalSpecialtyDescriptions = uniqStrings(
    rawProductCodes.map((pc) => pc?.openfda?.medical_specialty_description)
  )

  const gmdnTerms = Array.isArray(result?.gmdn_terms)
    ? result.gmdn_terms
        .map((t) => ({
          code: t?.code ?? null,
          name: t?.name ?? null,
          definition: t?.definition ?? null,
        }))
        .filter((t) => t.code || t.name || t.definition)
    : []

  const mapped = {
    record_key: result?.record_key ?? null,
    record_status: result?.record_status ?? null,
    publish_date: result?.publish_date ?? null,
    public_version_number: result?.public_version_number ?? null,
    public_version_date: result?.public_version_date ?? null,

    brand_name: result?.brand_name ?? null,
    company_name: result?.company_name ?? null,
    catalog_number: result?.catalog_number ?? null,
    version_or_model_number: result?.version_or_model_number ?? null,
    device_description: result?.device_description ?? null,

    // Medical-focused fields (no product code objects)
    medical_device_names: deviceNames,
    device_classes: deviceClasses,
    regulation_numbers: regulationNumbers,
    medical_specialty_descriptions: medicalSpecialtyDescriptions,
    gmdn_terms: gmdnTerms,
  }

  if (includeProductCodes) {
    mapped.product_codes = rawProductCodes
      .map((pc) => ({
        code: pc?.code ?? null,
        name: pc?.name ?? null,
        openfda: pc?.openfda
          ? {
              device_name: pc.openfda.device_name ?? null,
              device_class: pc.openfda.device_class ?? null,
              regulation_number: pc.openfda.regulation_number ?? null,
              medical_specialty_description: pc.openfda.medical_specialty_description ?? null,
            }
          : null,
      }))
      .filter((pc) => pc.code || pc.name || pc.openfda)
  }

  return mapped
}

async function fetchOpenFdaDevices(req, res, next) {
  try {
    const limit = Math.min(Math.max(toInt(req.query.limit, 25), 1), 100)
    const skip = Math.max(toInt(req.query.skip, 0), 0)
    const term = String(req.query.term ?? req.query.q ?? '').trim()
    const productCode = String(req.query.productCode ?? '').trim()
    const includeProductCodes = ['1', 'true', 'yes', 'y'].includes(
      String(req.query.includeProductCodes ?? '').trim().toLowerCase()
    )

    const search = buildOpenFdaDeviceSearch({ term, productCode })

    let response
    try {
      response = await axios.get('https://api.fda.gov/device/udi.json', {
        params: {
          search,
          limit,
          skip,
        },
        timeout: 20000,
      })
    } catch (err) {
      // openFDA returns 404 for no matches; treat as empty result set.
      if (err?.response?.status === 404) {
        return res.json({
          source: 'openfda',
          search,
          term,
          productCode,
          limit,
          skip,
          total: 0,
          result: [],
          results: [],
        })
      }
      throw err
    }

    const results = response.data?.results
    const metaTotal = response.data?.meta?.results?.total

    if (!Array.isArray(results)) {
      res.status(502)
      throw new Error('openFDA returned unexpected data')
    }

    const mapped = results.map((r) => mapOpenFdaDeviceResult(r, { includeProductCodes }))

    res.json({
      source: 'openfda',
      search,
      term,
      productCode,
      includeProductCodes,
      limit,
      skip,
      total: typeof metaTotal === 'number' ? metaTotal : null,
      // Returning both keys so your frontend can use either:
      // devices.data.result.map(...) OR devices.data.results.map(...)
      result: mapped,
      results: mapped,
    })
  } catch (err) {
    next(err)
  }
}

async function importOpenFdaDevicesToDb(req, res, next) {
  try {
    const limit = Math.min(Math.max(toInt(req.query.limit, 25), 1), 100)
    const skip = Math.max(toInt(req.query.skip, 0), 0)
    const term = String(req.query.term ?? req.query.q ?? '').trim()
    const productCode = String(req.query.productCode ?? '').trim()

    const search = buildOpenFdaDeviceSearch({ term, productCode })

    let response
    try {
      response = await axios.get('https://api.fda.gov/device/udi.json', {
        params: {
          search,
          limit,
          skip,
        },
        timeout: 20000,
      })
    } catch (err) {
      if (err?.response?.status === 404) {
        return res.json({
          source: 'openfda',
          search,
          term,
          productCode,
          imported: 0,
          upserted: 0,
          matched: 0,
          modified: 0,
          result: [],
        })
      }
      throw err
    }

    const results = response.data?.results
    if (!Array.isArray(results)) {
      res.status(502)
      throw new Error('openFDA returned unexpected data')
    }

    const mapped = results.map((r) => mapOpenFdaDeviceResult(r, { includeProductCodes: false }))

    const ops = mapped
      .filter((d) => d.record_key)
      .map((d) => ({
        updateOne: {
          filter: { recordKey: d.record_key },
          update: {
            $set: {
              recordKey: d.record_key,
              recordStatus: d.record_status,
              publishDate: d.publish_date,
              publicVersionNumber: d.public_version_number,
              publicVersionDate: d.public_version_date,

              brandName: d.brand_name,
              companyName: d.company_name,
              catalogNumber: d.catalog_number,
              versionOrModelNumber: d.version_or_model_number,
              deviceDescription: d.device_description,

              medicalDeviceNames: d.medical_device_names,
              deviceClasses: d.device_classes,
              regulationNumbers: d.regulation_numbers,
              medicalSpecialtyDescriptions: d.medical_specialty_descriptions,
              gmdnTerms: d.gmdn_terms,

              source: 'openfda',
              lastSyncedAt: new Date(),
            },
          },
          upsert: true,
        },
      }))

    req._dbTouched = true

    const bulkResult = ops.length > 0 ? await MedicalDevice.bulkWrite(ops, { ordered: false }) : null

    res.json({
      source: 'openfda',
      search,
      term,
      productCode,
      imported: mapped.length,
      upserted: bulkResult?.upsertedCount ?? 0,
      matched: bulkResult?.matchedCount ?? 0,
      modified: bulkResult?.modifiedCount ?? 0,
      result: mapped,
    })
  } catch (err) {
    next(err)
  }
}

module.exports = {
  fetchOpenFdaDevices,
  importOpenFdaDevicesToDb,
  importOpenFdaItemsToDb,
}
