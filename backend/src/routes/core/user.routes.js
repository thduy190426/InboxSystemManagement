const express = require('express')
const { avatarUpload } = require('../../config/upload')
const { uploadAvatarRateLimit } = require('../../middleware/rateLimit.middleware')
const {
  changePassword,
  deleteAccount,
  getProfile,
  listSessions,
  revokeOtherSessions,
  revokeSession,
  updateAvatar,
  updatePrivacy,
  updateProfile,
} = require('../../controllers/core/user.controller')

const router = express.Router()

router.get('/me', getProfile)
router.patch('/me', updateProfile)
router.patch('/me/password', changePassword)
router.patch('/me/privacy', updatePrivacy)
router.patch('/me/avatar', uploadAvatarRateLimit, avatarUpload.single('avatar'), updateAvatar)
router.get('/me/sessions', listSessions)
router.delete('/me/sessions/others', revokeOtherSessions)
router.delete('/me/sessions/:sessionId', revokeSession)
router.delete('/me', deleteAccount)

module.exports = router
