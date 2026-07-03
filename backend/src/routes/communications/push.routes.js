const express = require('express')
const {
  getPushConfig,
  registerPushSubscription,
  unregisterPushSubscription,
} = require('../../controllers/communications/push.controller')

const router = express.Router()

router.get('/config', getPushConfig)
router.post('/subscriptions', registerPushSubscription)
router.delete('/subscriptions', unregisterPushSubscription)

module.exports = router
