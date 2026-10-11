const express = require('express')
const {
  acceptFriendRequest,
  blockContact,
  cancelFriendRequest,
  declineFriendRequest,
  listFriends,
  listIncomingRequests,
  listMutualFriends,
  listSuggestions,
  searchUsers,
  sendFriendRequest,
  unblockContact,
  updateContactNickname,
  unfriend,
} = require('../../controllers/core/contact.controller')
const { friendRequestRateLimit, searchRateLimit } = require('../../middleware/rateLimit.middleware')

const router = express.Router()

router.get('/search', searchRateLimit, searchUsers)
router.get('/friends', listFriends)
router.get('/requests', listIncomingRequests)
router.get('/suggestions', listSuggestions)
router.get('/:userId/mutual-friends', listMutualFriends)
router.post('/request', friendRequestRateLimit, sendFriendRequest)
router.post('/:contactId/accept', acceptFriendRequest)
router.post('/:contactId/decline', declineFriendRequest)
router.post('/:contactId/block', blockContact)
router.post('/:contactId/unblock', unblockContact)
router.patch('/:contactId/nickname', updateContactNickname)
router.delete('/:contactId/request', cancelFriendRequest)
router.delete('/:contactId', unfriend)

module.exports = router
