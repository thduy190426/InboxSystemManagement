const express = require('express');
const router = express.Router();
const multer = require('multer');

// Configure multer to use memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB max file size
  },
});

const storyController = require('../../controllers/core/story.controller');

router.post('/', upload.single('media'), storyController.createStory);
router.get('/', storyController.getActiveStories);

module.exports = router;
