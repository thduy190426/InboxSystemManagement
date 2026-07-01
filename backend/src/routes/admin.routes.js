const express = require('express')
const {
  deleteAdminUser,
  getAdminStats,
  getAdminUsers,
  lockAdminUser,
  unlockAdminUser,
  updateAdminUser,
} = require('../controllers/admin.controller')

const router = express.Router()

router.get('/stats', getAdminStats)
router.get('/users', getAdminUsers)
router.put('/users/:id', updateAdminUser)
router.patch('/users/:id/lock', lockAdminUser)
router.patch('/users/:id/unlock', unlockAdminUser)
router.delete('/users/:id', deleteAdminUser)

module.exports = router
