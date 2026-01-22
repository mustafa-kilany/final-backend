const express = require('express')
const requireAuth = require('../middleware/requireAuth')
const requireRole = require('../middleware/requireRole')

const {
  createRequest,
  listRequests,
  getRequest,
  approveRequest,
  rejectRequest,
  getRequestHistory,
} = require('../controllers/requestController')

const router = express.Router()

// Purchase creates requests
router.post('/', requireAuth, requireRole('purchase'), createRequest)

// Admin sees all; others see their own
router.get('/', requireAuth, listRequests)
router.get('/:id', requireAuth, getRequest)

// Admin decision
router.post('/:id/approve', requireAuth, requireRole('admin'), approveRequest)
router.post('/:id/reject', requireAuth, requireRole('admin'), rejectRequest)

// History
router.get('/:id/history', requireAuth, getRequestHistory)

module.exports = router
