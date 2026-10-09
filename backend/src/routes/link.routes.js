const express = require('express');
const { getLinkPreview } = require('../controllers/link.controller');
const { authenticate } = require('../middleware/auth.middleware');

const router = express.Router();

router.get('/', authenticate, getLinkPreview);

module.exports = router;
