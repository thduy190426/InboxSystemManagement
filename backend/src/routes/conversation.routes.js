const express = require('express')
const {
  addGroupMember,
  archiveConversation,
  createAttachmentMessage,
  createGifMessage,
  createGroupConversation,
  createMessage,
  deleteMessage,
  disbandGroupConversation,
  forwardMessage,
  getConversationMembers,
  getGroupInvite,
  hideConversation,
  listConversationCalls,
  listGroupJoinRequests,
  getTypingStatus,
  leaveGroupConversation,
  requestGroupJoin,
  resetGroupInvite,
  reviewGroupJoinRequest,
  updateMessage,
  getMessages,
  listConversations,
  markConversationDelivered,
  markConversationRead,
  removeMessageReaction,
  recallMessage,
  removeGroupMember,
  reportMessage,
  searchConversationMessages,
  toggleMessageReaction,
  toggleMessagePin,
  unarchiveConversation,
  updateConversationSettings,
  updateGroupConversation,
  updateGroupMemberNickname,
  updateGroupMemberRole,
  updateTypingStatus,
  transferGroupOwner,
} = require('../controllers/conversation.controller')
const { avatarUpload, messageUpload } = require('../config/upload')
const { sendMessageRateLimit } = require('../middleware/rateLimit.middleware')

const router = express.Router()

router.get('/', listConversations)
router.post('/groups', avatarUpload.single('avatar'), createGroupConversation)
router.get('/:conversationId/calls', listConversationCalls)
router.get('/:conversationId/invite', getGroupInvite)
router.get('/:conversationId/join-requests', listGroupJoinRequests)
router.get('/:conversationId/members', getConversationMembers)
router.get('/:conversationId/messages/search', searchConversationMessages)
router.get('/:conversationId/messages', getMessages)
router.get('/:conversationId/typing', getTypingStatus)
router.post('/:conversationId/members', addGroupMember)
router.post('/join/:token', requestGroupJoin)
router.post('/:conversationId/invite/reset', resetGroupInvite)
router.post('/:conversationId/join-requests/:requestId/review', reviewGroupJoinRequest)
router.post('/:conversationId/messages', sendMessageRateLimit, createMessage)
router.post(
  '/:conversationId/messages/attachments',
  sendMessageRateLimit,
  messageUpload.single('attachment'),
  createAttachmentMessage,
)
router.post('/:conversationId/messages/gif', sendMessageRateLimit, createGifMessage)
router.post('/:conversationId/read', markConversationRead)
router.post('/:conversationId/delivered', markConversationDelivered)
router.post('/:conversationId/messages/:messageId/forward', sendMessageRateLimit, forwardMessage)
router.post('/:conversationId/messages/:messageId/pin', toggleMessagePin)
router.post('/:conversationId/messages/:messageId/report', reportMessage)
router.post('/:conversationId/messages/:messageId/reactions', toggleMessageReaction)
router.post('/:conversationId/typing', updateTypingStatus)
router.post('/:conversationId/archive', archiveConversation)
router.post('/:conversationId/unarchive', unarchiveConversation)
router.post('/:conversationId/leave', leaveGroupConversation)
router.patch('/:conversationId/group', avatarUpload.single('avatar'), updateGroupConversation)
router.patch('/:conversationId/settings', updateConversationSettings)
router.patch('/:conversationId/messages/:messageId', updateMessage)
router.patch('/:conversationId/members/:userId/nickname', updateGroupMemberNickname)
router.patch('/:conversationId/members/:userId/role', updateGroupMemberRole)
router.patch('/:conversationId/members/:userId/owner', transferGroupOwner)
router.delete('/:conversationId/group', disbandGroupConversation)
router.delete('/:conversationId/members/:userId', removeGroupMember)
router.delete('/:conversationId/messages/:messageId/reactions/:emoji', removeMessageReaction)
router.delete('/:conversationId/messages/:messageId/recall', recallMessage)
router.delete('/:conversationId/messages/:messageId', deleteMessage)
router.delete('/:conversationId', hideConversation)

module.exports = router
