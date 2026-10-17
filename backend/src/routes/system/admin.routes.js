const express = require('express')
const {
  createAdminUser,
  deleteAdminUser,
  getAdminStats,
  getAdminUsers,
  getAdminUserDetails,
  getAdminAuditLogs,
  getMessageReports,
  lockAdminUser,
  unlockAdminUser,
  updateMessageReport,
  updateAdminUser,
} = require('../../controllers/system/admin.controller')

const router = express.Router()

router.get('/stats', getAdminStats)
router.get('/message-reports', getMessageReports)
router.get('/users', getAdminUsers)
router.get('/users/:id/details', getAdminUserDetails)
router.get('/audit-logs', getAdminAuditLogs)
router.post('/users', createAdminUser)
router.put('/users/:id', updateAdminUser)
router.patch('/message-reports/:id', updateMessageReport)
router.patch('/users/:id/lock', lockAdminUser)
router.patch('/users/:id/unlock', unlockAdminUser)
router.delete('/users/:id', deleteAdminUser)

module.exports = router
