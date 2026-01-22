const express = require('express')
const { adminSignup, login, me } = require('../controllers/authController')
const requireAuth = require('../middleware/requireAuth')

const router = express.Router()

router.get('/admin/signup', (req, res) => {
	res.status(405).json({
		message: 'Use POST /api/auth/admin/signup with JSON body { name, email, password, adminSignupToken }',
	})
})
router.post('/admin/signup', adminSignup)
router.post('/login', login)
router.get('/me', requireAuth, me)

module.exports = router
