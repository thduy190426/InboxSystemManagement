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
router.get('/close-friends', storyController.getCloseFriends);
router.post('/close-friends/toggle', storyController.toggleCloseFriend);

// Story Archive & Highlights
router.get('/archive', storyController.getStoryArchive);
router.get('/highlights', storyController.getHighlights);
router.post('/highlights', storyController.createHighlight);
router.get('/highlights/:id', storyController.getHighlightById);
router.delete('/highlights/:id', storyController.deleteHighlight);

// Story Interactive Stickers
router.post('/:id/poll-vote', storyController.votePoll);
router.get('/:id/poll-stats', storyController.getPollStats);
router.post('/:id/slider-vote', storyController.voteSlider);
router.get('/:id/slider-stats', storyController.getSliderStats);

router.post('/:id/view', storyController.recordView);
router.post('/:id/react', storyController.reactToStory);
router.post('/:id/reply', storyController.replyToStory);
router.get('/:id/viewers', storyController.getStoryViewers);
router.delete('/:id', storyController.deleteStory);

module.exports = router;
