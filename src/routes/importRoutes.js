const express = require('express')
const requireAuth = require('../middleware/requireAuth')
const requireRole = require('../middleware/requireRole')
const { fetchOpenFdaDevices, importOpenFdaDevicesToDb, importOpenFdaItemsToDb } = require('../controllers/importController')

const router = express.Router()

// Authenticated: fetch device data from openFDA (UDI database)
router.get('/openfda/devices', requireAuth, fetchOpenFdaDevices)

// Admin-only: import openFDA UDI devices into MongoDB
router.post('/openfda/devices', requireAuth, requireRole('admin'), importOpenFdaDevicesToDb)

// Admin-only: import openFDA UDI devices into Items (inventory)
router.post('/openfda/items', requireAuth, requireRole('admin'), importOpenFdaItemsToDb)

module.exports = router
