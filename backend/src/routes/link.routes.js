const express = require('express');
const { getLinkPreview } = require('../controllers/link.controller');
const auth = require('../middleware/auth.middleware');

const router = express.Router();

// GET /api/link-preview?url=...
router.get('/', auth, getLinkPreview);

module.exports = router;
