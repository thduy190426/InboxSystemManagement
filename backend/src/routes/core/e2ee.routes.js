const express = require('express')
const e2eeController = require('../../controllers/core/e2ee.controller')
const { authenticate } = require('../../middleware/auth.middleware')

const router = express.Router()

router.use(authenticate)

router.post('/keys', e2eeController.uploadKeys)
router.get('/keys/:userId', e2eeController.fetchKeys)

module.exports = router
