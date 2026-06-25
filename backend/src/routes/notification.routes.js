const express = require('express')
const {
  listNotifications,
  markAllNotificationsRead,
  markConversationNotificationsRead,
  markNotificationRead,
} = require('../controllers/notification.controller')

const router = express.Router()

router.get('/', listNotifications)
router.post('/read-all', markAllNotificationsRead)
router.post('/:notificationId/read', markNotificationRead)
router.post('/conversations/:conversationId/read', markConversationNotificationsRead)

module.exports = router
