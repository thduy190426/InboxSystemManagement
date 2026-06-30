const express = require('express')
const {
  forgotPassword,
  login,
  logout,
  register,
  resendVerification,
  resetPassword,
  touchPresence,
  verifyAccount,
} = require('../controllers/auth.controller')
const { authenticate } = require('../middleware/auth.middleware')
const {
  forgotPasswordRateLimit,
  loginRateLimit,
  registerRateLimit,
  resendVerificationRateLimit,
  resetPasswordRateLimit,
  verificationRateLimit,
} = require('../middleware/rateLimit.middleware')

const router = express.Router()

router.post('/register', registerRateLimit, register)
router.post('/login', loginRateLimit, login)
router.post('/verify', verificationRateLimit, verifyAccount)
router.post('/resend-verification', resendVerificationRateLimit, resendVerification)
router.post('/forgot-password', forgotPasswordRateLimit, forgotPassword)
router.post('/reset-password', resetPasswordRateLimit, resetPassword)
router.post('/logout', authenticate, logout)
router.post('/presence', authenticate, touchPresence)

module.exports = router
