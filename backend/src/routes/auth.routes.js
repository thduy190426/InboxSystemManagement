const express = require('express')
const {
  forgotPassword,
  login,
  logout,
  register,
  resetPassword,
  touchPresence,
} = require('../controllers/auth.controller')
const { authenticate } = require('../middleware/auth.middleware')
const {
  forgotPasswordRateLimit,
  loginRateLimit,
  registerRateLimit,
  resetPasswordRateLimit,
} = require('../middleware/rateLimit.middleware')

const router = express.Router()

router.post('/register', registerRateLimit, register)
router.post('/login', loginRateLimit, login)
router.post('/forgot-password', forgotPasswordRateLimit, forgotPassword)
router.post('/reset-password', resetPasswordRateLimit, resetPassword)
router.post('/logout', authenticate, logout)
router.post('/presence', authenticate, touchPresence)

module.exports = router
