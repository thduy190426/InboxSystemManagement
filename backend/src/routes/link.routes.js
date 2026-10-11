const express = require('express');
const { getLinkPreview } = require('../controllers/link.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { linkPreviewRateLimit } = require('../middleware/rateLimit.middleware');

const router = express.Router();

router.get('/', authenticate, linkPreviewRateLimit, getLinkPreview);

module.exports = router;
