const express = require('express')
const { globalSearch } = require('../../controllers/core/search.controller')
const { searchRateLimit } = require('../../middleware/rateLimit.middleware')

const router = express.Router()

router.get('/', searchRateLimit, globalSearch)

module.exports = router
