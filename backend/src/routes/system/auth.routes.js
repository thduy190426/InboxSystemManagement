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
  googleLogin,
  facebookLogin,
  setup2FA,
  verifySetup2FA,
  disable2FA,
  login2FA,
} = require('../../controllers/system/auth.controller')
const { authenticate } = require('../../middleware/auth.middleware')
const {
  forgotPasswordRateLimit,
  loginRateLimit,
  registerRateLimit,
  resendVerificationRateLimit,
  resetPasswordRateLimit,
  verificationRateLimit,
} = require('../../middleware/rateLimit.middleware')

const router = express.Router()

router.post('/register', registerRateLimit, register)
router.post('/login', loginRateLimit, login)
router.post('/login-2fa', loginRateLimit, login2FA)
router.post('/google', googleLogin)
router.post('/facebook', facebookLogin)
router.post('/verify', verificationRateLimit, verifyAccount)
router.post('/resend-verification', resendVerificationRateLimit, resendVerification)
router.post('/forgot-password', forgotPasswordRateLimit, forgotPassword)
router.post('/reset-password', resetPasswordRateLimit, resetPassword)
router.post('/logout', authenticate, logout)
router.post('/presence', authenticate, touchPresence)
router.post('/2fa/setup', authenticate, setup2FA)
router.post('/2fa/verify-setup', authenticate, verifySetup2FA)
router.post('/2fa/disable', authenticate, disable2FA)

module.exports = router
