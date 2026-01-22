const MedicalDevice = require('../models/MedicalDevice')

function toInt(value, fallback = 0) {
  if (typeof value === 'number' && Number.isFinite(value)) return Math.trunc(value)
  const n = Number(value)
  if (Number.isFinite(n)) return Math.trunc(n)
  return fallback
}

async function listMedicalDevices(req, res, next) {
  try {
    const limit = Math.min(Math.max(toInt(req.query.limit, 25), 1), 100)
    const skip = Math.max(toInt(req.query.skip, 0), 0)
    const term = String(req.query.term ?? req.query.q ?? '').trim()

    const query = {}
    if (term) {
      const regex = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
      query.$or = [
        { brandName: regex },
        { companyName: regex },
        { catalogNumber: regex },
        { versionOrModelNumber: regex },
        { deviceDescription: regex },
        { medicalDeviceNames: regex },
        { regulationNumbers: regex },
      ]
    }

    req._dbTouched = true

    const [total, results] = await Promise.all([
      MedicalDevice.countDocuments(query),
      MedicalDevice.find(query).sort({ updatedAt: -1 }).skip(skip).limit(limit),
    ])

    res.json({ total, limit, skip, results })
  } catch (err) {
    next(err)
  }
}

async function getMedicalDevice(req, res, next) {
  try {
    const recordKey = String(req.params.recordKey || '').trim()
    if (!recordKey) {
      res.status(400)
      throw new Error('recordKey is required')
    }

    req._dbTouched = true

    const device = await MedicalDevice.findOne({ recordKey })
    if (!device) {
      res.status(404)
      throw new Error('Device not found')
    }

    res.json(device)
  } catch (err) {
    next(err)
  }
}

module.exports = {
  listMedicalDevices,
  getMedicalDevice,
}
