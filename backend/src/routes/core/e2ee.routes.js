const express = require('express')
const e2eeController = require('../../controllers/core/e2ee.controller')
const { authenticate } = require('../../middleware/auth.middleware')

const router = express.Router()

router.use(authenticate)

// Register a new device and upload all keys (Identity, Signed PreKey, One-Time PreKeys)
router.post('/keys', e2eeController.uploadKeys)

// Fetch keys for a specific user to start a session
router.get('/keys/:userId', e2eeController.fetchKeys)

module.exports = router
