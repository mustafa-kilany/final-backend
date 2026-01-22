const express = require('express')
const requireAuth = require('../middleware/requireAuth')
const requireRole = require('../middleware/requireRole')
const { fetchOpenFdaDevices, importOpenFdaDevicesToDb, importOpenFdaItemsToDb } = require('../controllers/importController')

const router = express.Router()
router.get('/openfda/devices', requireAuth, fetchOpenFdaDevices)
router.post('/openfda/devices', requireAuth, requireRole('admin'), importOpenFdaDevicesToDb)
router.post('/openfda/items', requireAuth, requireRole('admin'), importOpenFdaItemsToDb)

module.exports = router
