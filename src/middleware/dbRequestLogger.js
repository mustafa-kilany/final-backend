const DbRequestHistory = require('../models/DbRequestHistory')

function redactSensitive(value) {
  if (!value || typeof value !== 'object') return value

  const clone = Array.isArray(value) ? [...value] : { ...value }
  const keys = Object.keys(clone)

  for (const key of keys) {
    if (key.toLowerCase().includes('password')) {
      clone[key] = '[REDACTED]'
      continue
    }
    if (key.toLowerCase().includes('token')) {
      clone[key] = '[REDACTED]'
      continue
    }

    const v = clone[key]
    if (v && typeof v === 'object') {
      clone[key] = redactSensitive(v)
    }
  }

  return clone
}

function dbRequestLogger(req, res, next) {
  const startedAt = Date.now()

  res.on('finish', async () => {
    if (!req._dbTouched) return

    const durationMs = Date.now() - startedAt

    try {
      await DbRequestHistory.create({
        durationMs,
        actor: req.user?.id ?? null,
        actorRole: req.user?.role ?? null,
        method: req.method,
        path: req.originalUrl || req.path,
        statusCode: res.statusCode,
        params: redactSensitive(req.params),
        query: redactSensitive(req.query),
        body: redactSensitive(req.body),
      })
    } catch (err) {
    
      console.warn('dbRequestLogger failed:', err?.message || err)
    }
  })

  next()
}

module.exports = dbRequestLogger
