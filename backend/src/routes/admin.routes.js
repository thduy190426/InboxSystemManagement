const express = require('express')
const {
  deleteAdminUser,
  getAdminStats,
  getAdminUsers,
  updateAdminUser,
} = require('../controllers/admin.controller')

const router = express.Router()

router.get('/stats', getAdminStats)
router.get('/users', getAdminUsers)
router.put('/users/:id', updateAdminUser)
router.delete('/users/:id', deleteAdminUser)

module.exports = router
