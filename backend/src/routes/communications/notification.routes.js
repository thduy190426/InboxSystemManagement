const express = require('express')
const {
  listNotifications,
  markAllNotificationsRead,
  markConversationNotificationsRead,
  markNotificationRead,
  deleteNotification,
  clearNotifications,
} = require('../../controllers/communications/notification.controller')

const router = express.Router()

router.get('/', listNotifications)
router.post('/read-all', markAllNotificationsRead)
router.post('/:notificationId/read', markNotificationRead)
router.post('/conversations/:conversationId/read', markConversationNotificationsRead)
router.delete('/:notificationId', deleteNotification)
router.delete('/', clearNotifications)

module.exports = router
