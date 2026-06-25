const express = require('express')
const { globalSearch } = require('../controllers/search.controller')
const { searchRateLimit } = require('../middleware/rateLimit.middleware')

const router = express.Router()

router.get('/', searchRateLimit, globalSearch)

module.exports = router
