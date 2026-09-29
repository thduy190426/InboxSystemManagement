import type { Message } from '../../types'

export const SIDEBAR_STATE_KEY = 'sidebar_is_open'
export const INBOX_WIDTH_KEY = 'inbox_width'
const OFFLINE_MESSAGE_QUEUE_KEY = 'offline_message_queue'
export const COMPACT_LAYOUT_MEDIA_QUERY = '(max-width: 1024px)'
export const MESSAGE_PAGE_LIMIT = 40
export const CONVERSATION_FILTERS: string[] = ['all', 'unread', 'requests', 'group', 'archived']

export type QueuedMessage = {
  conversationId: string
  message: Message
  parentMessageId?: string
  userId: string
}

export function mergeLatestMessages(existingMessages: Message[], incomingMessages: Message[]) {
  const incomingById = new Map(incomingMessages.map((message) => [message.id, message]))
  const existingIds = new Set(existingMessages.map((message) => message.id))
  const updatedMessages = existingMessages.map((message) => incomingById.get(message.id) ?? message)
  const newMessages = incomingMessages.filter((message) => !existingIds.has(message.id))

  const merged = [...updatedMessages, ...newMessages]
  return merged.sort((a, b) => {
    const aTime = new Date(a.createdAt || a.updatedAt || 0).getTime()
    const bTime = new Date(b.createdAt || b.updatedAt || 0).getTime()
    return aTime - bTime
  })
}

export function prependOlderMessages(existingMessages: Message[], olderMessages: Message[]) {
  const existingIds = new Set(existingMessages.map((message) => message.id))
  const newOlderMessages = olderMessages.filter((message) => !existingIds.has(message.id))

  const merged = [...newOlderMessages, ...existingMessages]
  return merged.sort((a, b) => {
    const aTime = new Date(a.createdAt || a.updatedAt || 0).getTime()
    const bTime = new Date(b.createdAt || b.updatedAt || 0).getTime()
    return aTime - bTime
  })
}

export function getInitialSidebarState() {
  return localStorage.getItem(SIDEBAR_STATE_KEY) === 'true'
}

export function getInitialInboxWidth() {
  const saved = localStorage.getItem(INBOX_WIDTH_KEY)
  const width = saved ? parseInt(saved, 10) : 420
  return Math.max(350, Math.min(width, 600))
}

export function getInitialCompactLayoutState() {
  return typeof window !== 'undefined' && window.matchMedia(COMPACT_LAYOUT_MEDIA_QUERY).matches
}

function readOfflineMessageQueue() {
  try {
    const rawQueue = localStorage.getItem(OFFLINE_MESSAGE_QUEUE_KEY)

    if (!rawQueue) {
      return []
    }

    const queue = JSON.parse(rawQueue)

    return Array.isArray(queue) ? (queue as QueuedMessage[]) : []
  } catch {
    return []
  }
}

function writeOfflineMessageQueue(queue: QueuedMessage[]) {
  localStorage.setItem(OFFLINE_MESSAGE_QUEUE_KEY, JSON.stringify(queue))
}

export function getQueuedMessagesForUser(userId: string) {
  if (!userId) {
    return []
  }

  return readOfflineMessageQueue().filter((item) => item.userId === userId)
}

export function upsertQueuedMessage(item: QueuedMessage) {
  const queue = readOfflineMessageQueue()
  const nextQueue = [
    ...queue.filter((queuedItem) => queuedItem.message.id !== item.message.id),
    item,
  ]

  writeOfflineMessageQueue(nextQueue)
}

export function removeQueuedMessage(messageId: string) {
  writeOfflineMessageQueue(
    readOfflineMessageQueue().filter((queuedItem) => queuedItem.message.id !== messageId),
  )
}

export function mergeQueuedMessages(existingMessages: Message[], queuedMessages: Message[]) {
  const queuedById = new Map(queuedMessages.map((message) => [message.id, message]))
  const mergedMessages = existingMessages.map((message) => queuedById.get(message.id) ?? message)
  const existingIds = new Set(existingMessages.map((message) => message.id))
  const missingQueuedMessages = queuedMessages.filter((message) => !existingIds.has(message.id))

  return [...mergedMessages, ...missingQueuedMessages]
}
