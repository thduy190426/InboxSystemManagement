const express = require('express')
const {
  acceptFriendRequest,
  blockContact,
  cancelFriendRequest,
  declineFriendRequest,
  listFriends,
  listIncomingRequests,
  listSuggestions,
  searchUsers,
  sendFriendRequest,
  unblockContact,
  updateContactNickname,
  unfriend,
} = require('../controllers/contact.controller')
const { searchRateLimit } = require('../middleware/rateLimit.middleware')

const router = express.Router()

router.get('/search', searchRateLimit, searchUsers)
router.get('/friends', listFriends)
router.get('/requests', listIncomingRequests)
router.get('/suggestions', listSuggestions)
router.post('/request', sendFriendRequest)
router.post('/:contactId/accept', acceptFriendRequest)
router.post('/:contactId/decline', declineFriendRequest)
router.post('/:contactId/block', blockContact)
router.post('/:contactId/unblock', unblockContact)
router.patch('/:contactId/nickname', updateContactNickname)
router.delete('/:contactId/request', cancelFriendRequest)
router.delete('/:contactId', unfriend)

module.exports = router
