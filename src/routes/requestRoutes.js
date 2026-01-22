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
router.post('/', requireAuth, requireRole('purchase'), createRequest)
router.get('/', requireAuth, listRequests)
router.get('/:id', requireAuth, getRequest)
router.post('/:id/approve', requireAuth, requireRole('admin'), approveRequest)
router.post('/:id/reject', requireAuth, requireRole('admin'), rejectRequest)
router.get('/:id/history', requireAuth, getRequestHistory)

module.exports = router
