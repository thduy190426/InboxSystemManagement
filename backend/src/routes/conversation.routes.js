const express = require('express')
const {
  addGroupMember,
  archiveConversation,
  createAttachmentMessage,
  createGroupConversation,
  createMessage,
  deleteMessage,
  disbandGroupConversation,
  forwardMessage,
  getConversationMembers,
  hideConversation,
  listConversationCalls,
  getTypingStatus,
  leaveGroupConversation,
  updateMessage,
  getMessages,
  listConversations,
  markConversationDelivered,
  markConversationRead,
  removeMessageReaction,
  recallMessage,
  removeGroupMember,
  toggleMessageReaction,
  toggleMessagePin,
  unarchiveConversation,
  updateConversationSettings,
  updateGroupConversation,
  updateGroupMemberNickname,
  updateTypingStatus,
} = require('../controllers/conversation.controller')
const { avatarUpload, messageUpload } = require('../config/upload')
const { sendMessageRateLimit } = require('../middleware/rateLimit.middleware')

const router = express.Router()

router.get('/', listConversations)
router.post('/groups', avatarUpload.single('avatar'), createGroupConversation)
router.get('/:conversationId/calls', listConversationCalls)
router.get('/:conversationId/members', getConversationMembers)
router.get('/:conversationId/messages', getMessages)
router.get('/:conversationId/typing', getTypingStatus)
router.post('/:conversationId/members', addGroupMember)
router.post('/:conversationId/messages', sendMessageRateLimit, createMessage)
router.post(
  '/:conversationId/messages/attachments',
  sendMessageRateLimit,
  messageUpload.single('attachment'),
  createAttachmentMessage,
)
router.post('/:conversationId/read', markConversationRead)
router.post('/:conversationId/delivered', markConversationDelivered)
router.post('/:conversationId/messages/:messageId/forward', sendMessageRateLimit, forwardMessage)
router.post('/:conversationId/messages/:messageId/pin', toggleMessagePin)
router.post('/:conversationId/messages/:messageId/reactions', toggleMessageReaction)
router.post('/:conversationId/typing', updateTypingStatus)
router.post('/:conversationId/archive', archiveConversation)
router.post('/:conversationId/unarchive', unarchiveConversation)
router.post('/:conversationId/leave', leaveGroupConversation)
router.patch('/:conversationId/group', avatarUpload.single('avatar'), updateGroupConversation)
router.patch('/:conversationId/settings', updateConversationSettings)
router.patch('/:conversationId/messages/:messageId', updateMessage)
router.patch('/:conversationId/members/:userId/nickname', updateGroupMemberNickname)
router.delete('/:conversationId/group', disbandGroupConversation)
router.delete('/:conversationId/members/:userId', removeGroupMember)
router.delete('/:conversationId/messages/:messageId/reactions/:emoji', removeMessageReaction)
router.delete('/:conversationId/messages/:messageId/recall', recallMessage)
router.delete('/:conversationId/messages/:messageId', deleteMessage)
router.delete('/:conversationId', hideConversation)

module.exports = router
