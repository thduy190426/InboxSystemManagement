const express = require('express')
const { login, logout, register, touchPresence } = require('../controllers/auth.controller')
const { authenticate } = require('../middleware/auth.middleware')
const { loginRateLimit, registerRateLimit } = require('../middleware/rateLimit.middleware')

const router = express.Router()

router.post('/register', registerRateLimit, register)
router.post('/login', loginRateLimit, login)
router.post('/logout', authenticate, logout)
router.post('/presence', authenticate, touchPresence)

module.exports = router
