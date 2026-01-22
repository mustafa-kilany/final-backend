const express = require('express')
const requireAuth = require('../middleware/requireAuth')
const { listMedicalDevices, getMedicalDevice } = require('../controllers/deviceController')

const router = express.Router()
router.get('/', requireAuth, listMedicalDevices)
router.get('/:recordKey', requireAuth, getMedicalDevice)

module.exports = router
