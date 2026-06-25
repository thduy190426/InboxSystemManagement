const express = require('express')
const { avatarUpload } = require('../config/upload')
const {
  changePassword,
  deleteAccount,
  getProfile,
  updateAvatar,
  updateProfile,
} = require('../controllers/user.controller')

const router = express.Router()

router.get('/me', getProfile)
router.patch('/me', updateProfile)
router.patch('/me/password', changePassword)
router.patch('/me/avatar', avatarUpload.single('avatar'), updateAvatar)
router.delete('/me', deleteAccount)

module.exports = router
