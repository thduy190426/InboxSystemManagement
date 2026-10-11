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
  oauthRateLimit,
  presenceRateLimit,
  registerRateLimit,
  resendVerificationRateLimit,
  resetPasswordRateLimit,
  verificationRateLimit,
  verify2FASetupRateLimit,
} = require('../../middleware/rateLimit.middleware')

const router = express.Router()

router.post('/register', registerRateLimit, register)
router.post('/login', loginRateLimit, login)
router.post('/login-2fa', loginRateLimit, login2FA)
router.post('/google', oauthRateLimit, googleLogin)
router.post('/facebook', oauthRateLimit, facebookLogin)
router.post('/verify', verificationRateLimit, verifyAccount)
router.post('/resend-verification', resendVerificationRateLimit, resendVerification)
router.post('/forgot-password', forgotPasswordRateLimit, forgotPassword)
router.post('/reset-password', resetPasswordRateLimit, resetPassword)
router.post('/logout', authenticate, logout)
router.post('/presence', authenticate, presenceRateLimit, touchPresence)
router.post('/2fa/setup', authenticate, setup2FA)
router.post('/2fa/verify-setup', authenticate, verify2FASetupRateLimit, verifySetup2FA)
router.post('/2fa/disable', authenticate, disable2FA)

module.exports = router
