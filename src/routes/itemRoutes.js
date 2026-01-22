const express = require('express')
const { listItems, createItem, purgeNonFdaItems } = require('../controllers/itemController')
const requireAuth = require('../middleware/requireAuth')
const requireRole = require('../middleware/requireRole')

const router = express.Router()

router.get('/', listItems)
router.post('/', requireAuth, requireRole('admin', 'purchase'), createItem)

// Admin-only: remove any items not sourced from openFDA (cleanup old seed/dummy data)
router.delete('/purge-nonfda', requireAuth, requireRole('admin'), purgeNonFdaItems)

module.exports = router
