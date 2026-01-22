const express = require('express')
const requireAuth = require('../middleware/requireAuth')
const requireRole = require('../middleware/requireRole')
const { listUsers, createUser } = require('../controllers/userController')

const router = express.Router()
router.get('/', requireAuth, requireRole('admin'), listUsers)
router.post('/', requireAuth, requireRole('admin'), createUser)

module.exports = router
