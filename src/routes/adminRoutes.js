const express = require('express')
const requireAuth = require('../middleware/requireAuth')
const requireRole = require('../middleware/requireRole')

const router = express.Router()

router.get('/secret', requireAuth, requireRole('admin'), (req, res) => {
  res.json({ message: 'Only admins can see this', user: req.user })
})

module.exports = router
