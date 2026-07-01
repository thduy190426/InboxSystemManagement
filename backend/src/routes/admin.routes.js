const express = require('express')
const {
  deleteAdminUser,
  getAdminStats,
  getAdminUsers,
  getMessageReports,
  lockAdminUser,
  unlockAdminUser,
  updateMessageReport,
  updateAdminUser,
} = require('../controllers/admin.controller')

const router = express.Router()

router.get('/stats', getAdminStats)
router.get('/message-reports', getMessageReports)
router.get('/users', getAdminUsers)
router.put('/users/:id', updateAdminUser)
router.patch('/message-reports/:id', updateMessageReport)
router.patch('/users/:id/lock', lockAdminUser)
router.patch('/users/:id/unlock', unlockAdminUser)
router.delete('/users/:id', deleteAdminUser)

module.exports = router
