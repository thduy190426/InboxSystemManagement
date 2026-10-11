const express = require('express');
const router = express.Router();
const multer = require('multer');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, 
  },
});

const storyController = require('../../controllers/core/story.controller');
const { createStoryRateLimit } = require('../../middleware/rateLimit.middleware');

router.post('/', createStoryRateLimit, upload.single('media'), storyController.createStory);
router.get('/', storyController.getActiveStories);

module.exports = router;
