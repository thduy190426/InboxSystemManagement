const express = require('express')
const { avatarUpload } = require('../config/upload')
const {
  changePassword,
  deleteAccount,
  getProfile,
  listSessions,
  revokeOtherSessions,
  revokeSession,
  updateAvatar,
  updateProfile,
} = require('../controllers/user.controller')

const router = express.Router()

router.get('/me', getProfile)
router.patch('/me', updateProfile)
router.patch('/me/password', changePassword)
router.patch('/me/avatar', avatarUpload.single('avatar'), updateAvatar)
router.get('/me/sessions', listSessions)
router.delete('/me/sessions/others', revokeOtherSessions)
router.delete('/me/sessions/:sessionId', revokeSession)
router.delete('/me', deleteAccount)

module.exports = router
